import Link from "next/link";
import { DocumentView } from "@/components/shared/document-view";
import { invoicePdfData, loadBillingCompany } from "@/lib/documents/money";
import {
  getPortalClient,
  listPortalInvoices,
  portalBalance,
} from "@/lib/data/portal";
import { formatDay, formatMoney, todayInGaborone } from "@/lib/format";
import type { Viewer } from "@/lib/portal/viewer";
import { createClient } from "@/lib/supabase/server";

// The client's invoices (prototype: invoicesHTML and invoiceModal). Issued
// invoices only; each opens in the prototype's invoice view with a PDF download.

export async function InvoicesPage({
  viewer,
  view,
}: {
  viewer: Viewer;
  view?: string;
}) {
  const today = todayInGaborone();
  const [client, invoices] = await Promise.all([
    getPortalClient(viewer.clientId),
    listPortalInvoices(viewer.clientId),
  ]);
  const balance = portalBalance(invoices, today);
  const year = today.slice(0, 4);
  const paidThisYear =
    Math.round(
      invoices
        .flatMap((i) => i.payments)
        .filter((p) => p.paid_on.startsWith(year))
        .reduce((a, p) => a + p.amount, 0) * 100,
    ) / 100;
  const open = view ? invoices.find((i) => i.number === view) : undefined;
  const company = open ? await loadBillingCompany(await createClient()) : null;

  return (
    <>
      <div className="head">
        <div>
          <h1>Invoices</h1>
          <p className="sub">
            Your retainer is invoiced on the 1st of each month. Ad budgets are
            paid by you directly to Meta and never appear on Midas invoices.
          </p>
        </div>
      </div>
      <div className="g3" style={{ marginBottom: 16 }}>
        <div className="panel">
          <div className="label">Balance due</div>
          <div className="big" style={{ marginTop: 8 }}>
            {formatMoney(balance.due)}
          </div>
          <p
            className="sub"
            style={balance.overdue ? { color: "var(--bad)" } : undefined}
          >
            {balance.due
              ? `${balance.overdue ? "Overdue since" : "Due"} ${formatDay(balance.nextDue)}`
              : "Nothing outstanding"}
          </p>
        </div>
        <div className="panel">
          <div className="label">Paid this year</div>
          <div className="big" style={{ marginTop: 8 }}>
            {formatMoney(paidThisYear)}
          </div>
        </div>
        <div className="panel">
          <div className="label">Monthly fee</div>
          <div className="big" style={{ marginTop: 8 }}>
            {formatMoney(client?.monthly_fee)}
          </div>
          <p className="sub">{client?.service_name ?? ""}</p>
        </div>
      </div>

      {open && company ? (
        <section
          className="panel"
          style={{ marginBottom: 16 }}
          aria-label={`Invoice ${open.number}`}
        >
          <div className="row between" style={{ marginBottom: 12 }}>
            <h2>
              {open.title} {open.number}
            </h2>
            <div className="row" style={{ gap: 8 }}>
              <a
                className="btn sm"
                href={`/api/documents/invoice/${open.number}`}
              >
                Download PDF
              </a>
              <Link className="btn sm" href={`${viewer.base}/invoices`}>
                Close
              </Link>
            </div>
          </div>
          <DocumentView d={invoicePdfData(open, company, today)} />
          {open.credits.length ? (
            <p className="sub" style={{ marginTop: 10 }}>
              Credit notes:{" "}
              {open.credits.map((n, i) => (
                <span key={n.id}>
                  {i ? ", " : ""}
                  <a href={`/api/documents/credit_note/${n.number}`}>
                    {n.number} ({formatMoney(n.amount)})
                  </a>
                </span>
              ))}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="panel">
        {invoices.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Period</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th className="num-c">Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => {
                  const overdue =
                    i.balance > 0 && !!i.due_date && i.due_date < today;
                  const lastPaid = i.payments.at(-1)?.paid_on;
                  const pill =
                    i.status === "paid"
                      ? {
                          cls: "s-good",
                          text: `Paid ${formatDay(lastPaid ?? null)}`,
                        }
                      : i.status === "credited"
                        ? { cls: "", text: "Credited" }
                        : overdue
                          ? { cls: "s-bad", text: "Overdue" }
                          : i.status === "part_paid"
                            ? {
                                cls: "s-warn",
                                text: `Part paid · ${formatMoney(i.balance)} due`,
                              }
                            : { cls: "s-warn", text: "Due" };
                  return (
                    <tr key={i.id}>
                      <td>
                        <b>{i.number}</b>
                      </td>
                      <td>{i.period_label ?? "—"}</td>
                      <td>{formatDay(i.issue_date)}</td>
                      <td>{formatDay(i.due_date)}</td>
                      <td className="num-c">{formatMoney(i.total)}</td>
                      <td>
                        <span className={`pill ${pill.cls}`}>{pill.text}</span>
                      </td>
                      <td>
                        <Link
                          className="link"
                          href={`${viewer.base}/invoices?view=${i.number}`}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="sub" style={{ margin: 0 }}>
            No invoices yet. Each one appears here when Midas issues it.
          </p>
        )}
      </div>
    </>
  );
}
