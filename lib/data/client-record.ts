import "server-only";
import type { ClientStatus, InvoiceStatus } from "@/lib/format/status";
import { createClient } from "@/lib/supabase/server";

// The CEO-only parts of a client's record: where they came from, invoices,
// time and profitability since the start, and status history.

export type ClientRecordExtras = {
  remindersEnabled: boolean;
  lead: { id: string; company: string } | null;
  invoices: {
    id: string;
    number: string | null;
    status: InvoiceStatus;
    total: number;
    balance: number;
    issue_date: string | null;
    due_date: string | null;
    period_label: string | null;
  }[];
  invoicedTotal: number;
  paidTotal: number;
  hoursTotal: number;
  ratePaid: number | null;
  history: {
    from: ClientStatus | null;
    to: ClientStatus;
    at: string;
    by: string | null;
  }[];
};

export async function getClientRecordExtras(
  clientId: string,
): Promise<ClientRecordExtras> {
  const supabase = await createClient();
  const [
    { data: c },
    { data: lead },
    { data: invoices },
    { data: time },
    { data: history },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("reminders_enabled")
      .eq("id", clientId)
      .single(),
    supabase
      .from("leads")
      .select("id, company")
      .eq("client_id", clientId)
      .maybeSingle(),
    supabase
      .from("invoices")
      .select(
        "id, number, status, total, balance, amount_paid, issue_date, due_date, period_label",
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("time_entries")
      .select("minutes")
      .eq("client_id", clientId)
      .not("minutes", "is", null),
    supabase
      .from("client_status_history")
      .select("from_status, to_status, created_at, changed_by")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
  ]);
  const ids = [
    ...new Set(
      (history ?? []).map((h) => h.changed_by).filter((x): x is string => !!x),
    ),
  ];
  const { data: people } = ids.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] };
  const issued = (invoices ?? []).filter((i) => i.status !== "draft");
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const hours = round2(
    (time ?? []).reduce((a, t) => a + (t.minutes ?? 0), 0) / 60,
  );
  const paid = round2(issued.reduce((a, i) => a + Number(i.amount_paid), 0));
  return {
    remindersEnabled: c?.reminders_enabled ?? true,
    lead: lead ?? null,
    invoices: (invoices ?? []).map((i) => ({
      ...i,
      total: Number(i.total),
      balance: Number(i.balance ?? 0),
    })),
    invoicedTotal: round2(issued.reduce((a, i) => a + Number(i.total), 0)),
    paidTotal: paid,
    hoursTotal: hours,
    ratePaid: hours > 0 ? round2(paid / hours) : null,
    history: (history ?? []).map((h) => ({
      from: h.from_status,
      to: h.to_status,
      at: h.created_at,
      by: people?.find((p) => p.id === h.changed_by)?.full_name ?? null,
    })),
  };
}
