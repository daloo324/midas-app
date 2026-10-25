import type { Metadata } from "next";
import Link from "next/link";
import { NewInvoiceForm } from "@/components/admin/invoice-forms";
import { invoiceStatusLabel } from "@/lib/documents/money";
import { listInvoices, moneyTotals } from "@/lib/data/invoices";
import { formatDay, formatMoney, todayInGaborone } from "@/lib/format";
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_PILL,
  type InvoiceStatus,
} from "@/lib/format/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage({
  searchParams,
}: PageProps<"/admin/invoices">) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) =>
    typeof v === "string" && v ? v : undefined;
  const status = str(sp.status) as InvoiceStatus | "overdue" | undefined;
  const clientId = str(sp.client);
  const month = str(sp.month);
  const today = todayInGaborone();
  const supabase = await createClient();
  const [list, totals, { data: clients }, { count: drafts }] =
    await Promise.all([
      listInvoices(
        {
          status:
            status &&
            (status === "overdue" || INVOICE_STATUSES.includes(status))
              ? status
              : undefined,
          clientId:
            clientId && /^[0-9a-f-]{36}$/i.test(clientId)
              ? clientId
              : undefined,
          month: month && /^\d{4}-\d{2}$/.test(month) ? month : undefined,
        },
        today,
      ),
      moneyTotals(today),
      supabase.from("clients").select("id, name, status").order("name"),
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("status", "draft")
        .eq("is_retainer", true),
    ]);

  return (
    <>
      <div className="head">
        <div>
          <h1>Invoices</h1>
          <p className="sub">
            Issued invoices are never changed or deleted; correct them with a
            credit note. Retainer drafts are made on the 1st of each month for
            you to review and issue.
          </p>
        </div>
        <Link className="btn gold" href="/admin/invoices/drafts">
          Retainer drafts{drafts ? ` (${drafts})` : ""}
        </Link>
      </div>

      <div className="stat">
        <div>
          <span>Owed to Midas</span>
          <b>{formatMoney(totals.owed)}</b>
          <span>{totals.owedCount} unpaid</span>
        </div>
        <div>
          <span>Overdue</span>
          <b style={{ color: totals.overdue ? "var(--bad)" : undefined }}>
            {formatMoney(totals.overdue)}
          </b>
          <span>
            <Link href="?status=overdue">{totals.overdueCount} overdue</Link>
          </span>
        </div>
        <div>
          <span>Collected this month</span>
          <b>{formatMoney(totals.collectedThisMonth)}</b>
        </div>
      </div>

      <form
        className="row panel"
        style={{
          gap: 10,
          flexWrap: "wrap",
          alignItems: "end",
          marginBottom: 14,
        }}
      >
        <label className="f">
          Status
          <select className="field" name="status" defaultValue={status ?? ""}>
            <option value="">All</option>
            <option value="overdue">Overdue</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {INVOICE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          Client
          <select className="field" name="client" defaultValue={clientId ?? ""}>
            <option value="">All clients</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="f">
          Month
          <input
            className="field"
            type="month"
            name="month"
            defaultValue={month ?? ""}
          />
        </label>
        <button className="btn" type="submit">
          Filter
        </button>
        {status || clientId || month ? (
          <Link className="link" href="/admin/invoices">
            Clear
          </Link>
        ) : null}
      </form>

      <div className="panel">
        {list.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Period</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th className="num-c">Total</th>
                  <th className="num-c">Paid</th>
                  <th className="num-c">Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((i) => {
                  const label = invoiceStatusLabel(i, today);
                  return (
                    <tr key={i.id}>
                      <td>
                        <Link href={`/admin/invoices/${i.number ?? i.id}`}>
                          <b>{i.number ?? "Draft"}</b>
                        </Link>
                      </td>
                      <td>{i.client.name}</td>
                      <td>{i.period_label ?? "—"}</td>
                      <td>{formatDay(i.issue_date)}</td>
                      <td>{formatDay(i.due_date)}</td>
                      <td className="num-c">{formatMoney(i.total)}</td>
                      <td className="num-c">{formatMoney(i.amount_paid)}</td>
                      <td className="num-c">{formatMoney(i.balance)}</td>
                      <td>
                        <span
                          className={`pill ${label === "Overdue" ? "s-bad" : INVOICE_STATUS_PILL[i.status]}`}
                        >
                          {label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="sub" style={{ margin: 0 }}>
            No invoices match.
          </p>
        )}
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>A once-off invoice</h2>
        <NewInvoiceForm
          clients={(clients ?? []).filter((c) => c.status !== "ended")}
        />
      </section>
    </>
  );
}
