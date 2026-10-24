import "server-only";
import {
  INVOICE_COLUMNS,
  toInvoice,
  type Invoice,
} from "@/lib/documents/money";
import type { InvoiceStatus } from "@/lib/format/status";
import { createClient } from "@/lib/supabase/server";

// Invoice lists and money totals. Runs as the signed-in user, so the CEO
// sees every invoice, an account exec their clients', a client their own
// issued ones (RLS).

export type InvoiceFilter = {
  status?: InvoiceStatus | "overdue";
  clientId?: string;
  month?: string; // "2026-11": issued (or, for drafts, made) in that month
};

export async function listInvoices(
  f: InvoiceFilter,
  today: string,
): Promise<Invoice[]> {
  const supabase = await createClient();
  let q = supabase.from("invoices").select(INVOICE_COLUMNS);
  if (f.status === "overdue")
    q = q.in("status", ["issued", "part_paid"]).lt("due_date", today);
  else if (f.status) q = q.eq("status", f.status);
  if (f.clientId) q = q.eq("client_id", f.clientId);
  const { data } = await q.order("created_at", { ascending: false });
  let list = ((data ?? []) as unknown as Parameters<typeof toInvoice>[0][]).map(
    toInvoice,
  );
  if (f.month)
    list = list.filter(
      (i) =>
        (i.issue_date ?? i.period_month ?? i.created_at).slice(0, 7) ===
        f.month,
    );
  return list;
}

export type MoneyTotals = {
  owed: number;
  owedCount: number;
  overdue: number;
  overdueCount: number;
  collectedThisMonth: number;
};

/** Owed (issued balances), overdue, and cash collected this month (payments). */
export async function moneyTotals(today: string): Promise<MoneyTotals> {
  const supabase = await createClient();
  const month = today.slice(0, 7);
  const [{ data: open }, { data: payments }] = await Promise.all([
    supabase
      .from("invoices")
      .select("balance, due_date")
      .in("status", ["issued", "part_paid"]),
    supabase
      .from("payments")
      .select("amount")
      .gte("paid_on", `${month}-01`)
      .lte("paid_on", today),
  ]);
  const rows = (open ?? []).map((r) => ({
    balance: Number(r.balance ?? 0),
    due: r.due_date,
  }));
  const late = rows.filter((r) => r.due && r.due < today && r.balance > 0);
  const sum = (xs: number[]) =>
    Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;
  return {
    owed: sum(rows.map((r) => r.balance)),
    owedCount: rows.filter((r) => r.balance > 0).length,
    overdue: sum(late.map((r) => r.balance)),
    overdueCount: late.length,
    collectedThisMonth: sum((payments ?? []).map((p) => Number(p.amount))),
  };
}
