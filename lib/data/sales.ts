import "server-only";
import { TIME_ZONE } from "@/lib/format";
import type { LeadSource, LeadStage, LostReason } from "@/lib/format/status";
import { createClient } from "@/lib/supabase/server";

// Sales pipeline reads (CEO only; RLS agrees).

export type Lead = {
  id: string;
  company: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  stage: LeadStage;
  estimated_value: number | null;
  owner_id: string | null;
  owner: string | null;
  next_action: string | null;
  next_action_date: string | null;
  lost_reason: LostReason | null;
  notes: string | null;
  client_id: string | null;
  closed_at: string | null;
  created_at: string;
};

const LEAD_COLUMNS =
  "id, company, contact_name, email, phone, source, stage, estimated_value, owner_id, next_action, next_action_date, lost_reason, notes, client_id, closed_at, created_at, owner:profiles!leads_owner_id_fkey(full_name)";

type Row = Omit<Lead, "owner" | "estimated_value"> & {
  estimated_value: number | string | null;
  owner: { full_name: string } | null;
};

function toLead(r: Row): Lead {
  return {
    ...r,
    estimated_value:
      r.estimated_value == null ? null : Number(r.estimated_value),
    owner: r.owner?.full_name ?? null,
  };
}

export async function listLeads(): Promise<Lead[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .order("next_action_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  return ((data ?? []) as unknown as Row[]).map(toLead);
}

export async function getLead(id: string): Promise<Lead | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return data ? toLead(data as unknown as Row) : null;
}

/** Staff who can own a lead: active CEO and account execs. */
export async function listLeadOwners() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("active", true)
    .in("role", ["ceo", "account_exec"])
    .order("full_name");
  return data ?? [];
}

export type SalesNumbers = {
  thisMonth: number;
  conversion: number | null;
  wonCount: number;
  closedCount: number;
  averageDeal: number | null;
  bySource: { source: LeadSource; count: number }[];
};

/**
 * The numbers above the board: leads created this month, conversion (won ÷
 * closed in the last 90 days), average won deal value (last 90 days), and
 * leads by source this month.
 */
export function salesNumbers(leads: Lead[], today: string): SalesNumbers {
  const month = today.slice(0, 7);
  const since = new Date(`${today}T00:00:00+02:00`);
  since.setDate(since.getDate() - 90);
  const recent = leads.filter(
    (l) => l.closed_at && new Date(l.closed_at) >= since,
  );
  const won = recent.filter((l) => l.stage === "won");
  const values = won
    .map((l) => l.estimated_value)
    .filter((v): v is number => v != null);
  const created = leads.filter(
    (l) => gaborone(l.created_at).slice(0, 7) === month,
  );
  const counts = new Map<LeadSource, number>();
  for (const l of created)
    counts.set(l.source, (counts.get(l.source) ?? 0) + 1);
  return {
    thisMonth: created.length,
    conversion: recent.length ? won.length / recent.length : null,
    wonCount: won.length,
    closedCount: recent.length,
    averageDeal: values.length
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) /
        100
      : null,
    bySource: [...counts]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** A timestamp as a Gaborone calendar date, "2026-11-04". */
export function gaborone(ts: string): string {
  return new Date(ts).toLocaleDateString("en-CA", {
    timeZone: TIME_ZONE,
  });
}
