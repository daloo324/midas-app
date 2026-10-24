import "server-only";
import { shiftMonth } from "@/lib/content/constants";
import type { GoalCategory, WorkStatus } from "@/lib/content/constants";
import { workingDaysBetween } from "@/lib/cron/jobs";
import type { ClientStatus } from "@/lib/format/status";
import { createClient } from "@/lib/supabase/server";
import { gaborone } from "./sales";

// The CEO's whole-business numbers (06-admin.md "Overview"), computed once
// from the same rows the lists show, so every number matches its list.

/** The KPI that tracks each main goal. */
export const GOAL_KPI: Record<GoalCategory, { key: string; label: string }> = {
  visibility: { key: "reach", label: "Reach" },
  credibility: { key: "profile_visits", label: "Profile visits" },
  engagement: { key: "interactions", label: "Interactions" },
  results: { key: "enquiries", label: "Enquiries" },
};

const DONE: WorkStatus[] = ["approved", "scheduled", "published"];
const OPEN_LEAD = ["new", "contacted", "quote_sent"];

export type ClientHealth = {
  id: string;
  name: string;
  status: ClientStatus;
  accountExec: string | null;
  service: string | null;
  monthlyFee: number;
  startDate: string | null;
  kitStatus: WorkStatus | null;
  progress: { done: number; planned: number };
  goal: {
    label: string;
    trend: "up" | "down" | "flat" | "none";
    fellTwice: boolean;
  };
  hoursThisMonth: number;
  hoursTotal: number;
  rate: number | null; // fee ÷ design hours this month
  revisionsPerItem: number | null;
  balance: number;
  invoice: "overdue" | "due" | "paid" | "none";
};

export type Attention = { tone: "bad" | "warn"; text: string; href: string };

export type Overview = {
  today: string;
  mrr: number;
  mrrLastMonth: number;
  capacity: { active: number; max: number; onboarding: number; paused: number };
  pipeline: { value: number; leads: number; quotesWaiting: number };
  threshold: number;
  clients: ClientHealth[];
  attention: Attention[];
  revenue: { month: string; invoiced: number; collected: number }[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function getOverview(today: string): Promise<Overview> {
  const supabase = await createClient();
  const month = `${today.slice(0, 7)}-01`;
  const nextMonth = shiftMonth(month, 1);
  const yearAgo = shiftMonth(month, -11);
  const lastMonthEnd = new Date(Date.parse(`${month}T00:00:00Z`) - 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [
    { data: settings },
    { data: clients },
    { data: months },
    { data: kpis },
    { data: time },
    { data: invoices },
    { data: payments },
    { data: leads },
    { count: quotesWaiting },
    { data: kits },
  ] = await Promise.all([
    supabase
      .from("settings")
      .select("max_active_clients, profit_threshold_per_hour")
      .eq("id", 1)
      .single(),
    supabase
      .from("clients")
      .select(
        "id, name, status, monthly_fee, main_goal, start_date, end_date, ae:profiles!clients_account_exec_id_fkey(full_name), service:services(name)",
      )
      .order("name"),
    supabase
      .from("content_months")
      .select(
        "id, client_id, month, plan_status, plan_sent_at, content_items(status, revision_rounds, shown_to_client_at, slot_code)",
      )
      .in("month", [month, nextMonth]),
    supabase
      .from("kpi_months")
      .select("client_id, month, metrics")
      .gte("month", shiftMonth(month, -3))
      .not("client_id", "is", null),
    supabase
      .from("time_entries")
      .select("client_id, minutes, started_at")
      .not("minutes", "is", null),
    supabase
      .from("invoices")
      .select(
        "id, number, client_id, status, total, balance, due_date, issue_date",
      )
      .neq("status", "draft"),
    supabase.from("payments").select("amount, paid_on").gte("paid_on", yearAgo),
    supabase
      .from("leads")
      .select(
        "id, company, stage, estimated_value, next_action, next_action_date",
      ),
    supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent"),
    supabase.from("brand_kits").select("client_id, status, updated_at"),
  ]);

  const threshold = Number(settings?.profit_threshold_per_hour ?? 250);
  const list = clients ?? [];
  const nameOf = new Map(list.map((c) => [c.id, c.name]));
  const attention: Attention[] = [];

  // Brand kit status changes, to find kits stuck in one status.
  const kitIds = (kits ?? [])
    .filter((k) => k.status !== "approved")
    .map((k) => k.client_id);
  const { data: kitEvents } = kitIds.length
    ? await supabase
        .from("status_events")
        .select("client_id, created_at")
        .eq("entity_type", "brand_kit")
        .in("client_id", kitIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const kitMoved = new Map<string, string>();
  for (const e of kitEvents ?? [])
    if (!kitMoved.has(e.client_id)) kitMoved.set(e.client_id, e.created_at);

  // Money.
  const open = (invoices ?? []).filter(
    (i) =>
      (i.status === "issued" || i.status === "part_paid") &&
      Number(i.balance) > 0,
  );
  const overdue = open
    .filter((i) => i.due_date && i.due_date < today)
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!));
  for (const i of overdue)
    attention.push({
      tone: "bad",
      text: `${nameOf.get(i.client_id) ?? "A client"}: ${i.number} overdue since ${i.due_date}, P${Number(i.balance).toFixed(2)} unpaid`,
      href: `/admin/invoices/${i.number}`,
    });

  // Approvals waiting more than 2 working days.
  for (const m of months ?? []) {
    const who = nameOf.get(m.client_id) ?? "A client";
    for (const it of m.content_items)
      if (
        it.status === "client_review" &&
        it.shown_to_client_at &&
        workingDaysBetween(gaborone(it.shown_to_client_at), today) > 2
      )
        attention.push({
          tone: "warn",
          text: `${who}: ${it.slot_code} waiting for approval since ${gaborone(it.shown_to_client_at)}`,
          href: `/accounts/clients/${m.client_id}/calendar?month=${m.month.slice(0, 7)}`,
        });
    if (
      m.plan_status === "sent" &&
      m.plan_sent_at &&
      workingDaysBetween(gaborone(m.plan_sent_at), today) > 2
    )
      attention.push({
        tone: "warn",
        text: `${who}: the content calendar has waited for approval since ${gaborone(m.plan_sent_at)}`,
        href: `/accounts/clients/${m.client_id}/calendar?month=${m.month.slice(0, 7)}`,
      });
  }

  // Next month's calendar not approved by the 25th.
  if (Number(today.slice(8, 10)) >= 25)
    for (const c of list.filter((x) => x.status === "active")) {
      const next = (months ?? []).find(
        (m) => m.client_id === c.id && m.month === nextMonth,
      );
      if (next?.plan_status !== "approved")
        attention.push({
          tone: "warn",
          text: `${c.name}: next month's calendar isn't approved yet`,
          href: `/accounts/clients/${c.id}/calendar?month=${nextMonth.slice(0, 7)}`,
        });
    }

  // Leads whose next action date has passed.
  for (const l of (leads ?? []).filter(
    (x) =>
      OPEN_LEAD.includes(x.stage) &&
      x.next_action_date &&
      x.next_action_date < today,
  ))
    attention.push({
      tone: "warn",
      text: `${l.company}: "${l.next_action ?? "Next action"}" was due ${l.next_action_date}`,
      href: `/admin/sales/${l.id}`,
    });

  // Per-client health.
  const healthOf = (c: (typeof list)[number]): ClientHealth => {
    const cur = (months ?? []).find(
      (m) => m.client_id === c.id && m.month === month,
    );
    const items = cur?.content_items ?? [];
    const k = (kpis ?? []).filter((x) => x.client_id === c.id);
    const goal = c.main_goal ? GOAL_KPI[c.main_goal as GoalCategory] : null;
    const val = (m: string) => {
      const row = k.find((x) => x.month === m);
      const v = row
        ? (row.metrics as Record<string, unknown>)[goal?.key ?? ""]
        : undefined;
      return typeof v === "number"
        ? v
        : v != null && v !== "" && !Number.isNaN(Number(v))
          ? Number(v)
          : null;
    };
    const [m3, m2, m1] = [
      shiftMonth(month, -3),
      shiftMonth(month, -2),
      shiftMonth(month, -1),
    ].map(val);
    const trend =
      m1 == null || m2 == null
        ? "none"
        : m1 > m2
          ? "up"
          : m1 < m2
            ? "down"
            : "flat";
    const fellTwice =
      m1 != null && m2 != null && m3 != null && m1 < m2 && m2 < m3;
    const mine = (time ?? []).filter((t) => t.client_id === c.id);
    const minsMonth = mine
      .filter((t) => gaborone(t.started_at) >= month)
      .reduce((a, t) => a + (t.minutes ?? 0), 0);
    const minsTotal = mine.reduce((a, t) => a + (t.minutes ?? 0), 0);
    const fee = Number(c.monthly_fee ?? 0);
    const hours = round2(minsMonth / 60);
    const myOpen = open.filter((i) => i.client_id === c.id);
    const anyIssued = (invoices ?? []).some((i) => i.client_id === c.id);
    const kit = (kits ?? []).find((x) => x.client_id === c.id);
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      accountExec: c.ae?.full_name ?? null,
      service: c.service?.name ?? null,
      monthlyFee: fee,
      startDate: c.start_date,
      kitStatus: kit?.status ?? null,
      progress: {
        done: items.filter((i) => DONE.includes(i.status)).length,
        planned: items.length,
      },
      goal: { label: goal?.label ?? "—", trend, fellTwice },
      hoursThisMonth: hours,
      hoursTotal: round2(minsTotal / 60),
      rate: hours > 0 ? round2(fee / hours) : null,
      revisionsPerItem: items.length
        ? round2(
            items.reduce((a, i) => a + i.revision_rounds, 0) / items.length,
          )
        : null,
      balance: round2(myOpen.reduce((a, i) => a + Number(i.balance), 0)),
      invoice: myOpen.some((i) => i.due_date && i.due_date < today)
        ? "overdue"
        : myOpen.length
          ? "due"
          : anyIssued
            ? "paid"
            : "none",
    };
  };
  const health = list.filter((c) => c.status !== "ended").map(healthOf);

  for (const h of health.filter((x) => x.status === "active")) {
    if (h.goal.fellTwice)
      attention.push({
        tone: "warn",
        text: `${h.name}: ${h.goal.label.toLowerCase()} fell two months running`,
        href: `/accounts/clients/${h.id}/kpis`,
      });
    if (h.rate != null && h.rate < threshold)
      attention.push({
        tone: "warn",
        text: `${h.name}: P${h.rate.toFixed(2)} an hour this month, under the P${threshold.toFixed(2)} threshold`,
        href: `/admin/clients/${h.id}`,
      });
  }
  for (const k of (kits ?? []).filter((x) => x.status !== "approved")) {
    const since = gaborone(kitMoved.get(k.client_id) ?? k.updated_at);
    const c = list.find((x) => x.id === k.client_id);
    if (c && c.status !== "ended" && workingDaysBetween(since, today) > 5)
      attention.push({
        tone: "warn",
        text: `${c.name}: brand kit stuck since ${since}`,
        href: `/creative/clients/${c.id}`,
      });
  }

  // Revenue by month: invoiced (issued totals) against collected (payments).
  const revenue = Array.from({ length: 12 }, (_, i) =>
    shiftMonth(yearAgo, i),
  ).map((m) => {
    const key = m.slice(0, 7);
    return {
      month: m,
      invoiced: round2(
        (invoices ?? [])
          .filter((i) => i.issue_date?.startsWith(key))
          .reduce((a, i) => a + Number(i.total), 0),
      ),
      collected: round2(
        (payments ?? [])
          .filter((p) => p.paid_on.startsWith(key))
          .reduce((a, p) => a + Number(p.amount), 0),
      ),
    };
  });

  const active = list.filter((c) => c.status === "active");
  const openLeads = (leads ?? []).filter((l) => OPEN_LEAD.includes(l.stage));
  return {
    today,
    mrr: round2(active.reduce((a, c) => a + Number(c.monthly_fee ?? 0), 0)),
    // Clients who had started by last month's end and hadn't ended before this month.
    mrrLastMonth: round2(
      list
        .filter(
          (c) =>
            (c.status === "active" ||
              c.status === "paused" ||
              c.status === "ended") &&
            c.start_date &&
            c.start_date <= lastMonthEnd &&
            (!c.end_date || c.end_date >= month),
        )
        .reduce((a, c) => a + Number(c.monthly_fee ?? 0), 0),
    ),
    capacity: {
      active: active.length,
      max: settings?.max_active_clients ?? 10,
      onboarding: list.filter((c) => c.status === "onboarding").length,
      paused: list.filter((c) => c.status === "paused").length,
    },
    pipeline: {
      value: round2(
        openLeads.reduce((a, l) => a + Number(l.estimated_value ?? 0), 0),
      ),
      leads: openLeads.length,
      quotesWaiting: quotesWaiting ?? 0,
    },
    threshold,
    clients: health,
    attention: [
      ...attention.filter((a) => a.tone === "bad"),
      ...attention.filter((a) => a.tone === "warn"),
    ],
    revenue,
  };
}
