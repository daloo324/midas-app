import type { Metadata } from "next";
import Link from "next/link";
import { formatDay, formatMoney } from "@/lib/format";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_PILL,
  type QuoteStatus,
} from "@/lib/format/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Quotes" };

const FILTERS: { key: string; label: string; statuses: QuoteStatus[] }[] = [
  { key: "", label: "All", statuses: [] },
  { key: "draft", label: "Drafts", statuses: ["draft"] },
  { key: "waiting", label: "Waiting on a reply", statuses: ["sent"] },
  { key: "accepted", label: "Accepted", statuses: ["accepted"] },
  {
    key: "closed",
    label: "Declined or expired",
    statuses: ["declined", "expired"],
  },
];

export default async function QuotesPage({
  searchParams,
}: PageProps<"/admin/quotes">) {
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.status) ?? FILTERS[0];
  const supabase = await createClient();
  // Flag sent quotes past their date before listing.
  await supabase.rpc("expire_quotes");
  let q = supabase
    .from("quotes")
    .select(
      "id, number, status, total, issue_date, valid_until, created_at, lead:leads(company), client:clients(name)",
    )
    .order("created_at", { ascending: false });
  if (filter.statuses.length) q = q.in("status", filter.statuses);
  const { data: quotes } = await q;

  return (
    <>
      <div className="head">
        <div>
          <h1>Quotes</h1>
          <p className="sub">
            Numbered when sent. Sent quotes can't be changed; make a new one
            instead.
          </p>
        </div>
        <Link className="btn pri" href="/admin/quotes/new">
          New quote
        </Link>
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            className="chip"
            href={f.key ? `?status=${f.key}` : "?"}
            aria-current={f === filter ? "page" : undefined}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <div className="panel">
        {quotes?.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Quote</th>
                  <th>For</th>
                  <th>Issued</th>
                  <th>Valid until</th>
                  <th className="num-c">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <Link href={`/admin/quotes/${x.number ?? x.id}`}>
                        <b>{x.number ?? "Draft"}</b>
                      </Link>
                    </td>
                    <td>{x.client?.name ?? x.lead?.company ?? "—"}</td>
                    <td>{formatDay(x.issue_date)}</td>
                    <td>{formatDay(x.valid_until)}</td>
                    <td className="num-c">{formatMoney(x.total)}</td>
                    <td>
                      <span className={`pill ${QUOTE_STATUS_PILL[x.status]}`}>
                        {QUOTE_STATUS_LABELS[x.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="sub" style={{ margin: 0 }}>
            No quotes here yet.
          </p>
        )}
      </div>
    </>
  );
}
