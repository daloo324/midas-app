import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { saveQuoteDraftAction } from "@/app/admin/quotes/actions";
import { DocumentEditor } from "@/components/admin/document-editor";
import { QuoteActions } from "@/components/admin/quote-actions";
import { DocumentView } from "@/components/shared/document-view";
import {
  getQuote,
  loadCompany,
  quotePdfData,
  quoteRecipient,
} from "@/lib/documents/money";
import { formatDateTime } from "@/lib/format";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_PILL } from "@/lib/format/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Quote" };

export default async function QuotePage({
  params,
  searchParams,
}: PageProps<"/admin/quotes/[number]">) {
  const { number } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const q = await getQuote(supabase, decodeURIComponent(number));
  if (!q) notFound();
  const to = quoteRecipient(q);
  const [company, { data: services }] = await Promise.all([
    loadCompany(supabase),
    supabase
      .from("services")
      .select("id, name, description, unit, price")
      .eq("active", true)
      .order("sort")
      .order("name"),
  ]);
  const backHref = q.lead ? `/admin/sales/${q.lead.id}` : "/admin/quotes";

  return (
    <>
      <div className="crumbs">
        <Link href="/admin/quotes" style={{ color: "inherit" }}>
          Quotes
        </Link>{" "}
        / {q.number ?? "Draft"}
      </div>
      <div className="head">
        <div>
          <h1>{q.number ? `Quote ${q.number}` : "Draft quote"}</h1>
          <p className="sub row" style={{ gap: 10 }}>
            <span className={`pill ${QUOTE_STATUS_PILL[q.status]}`}>
              {QUOTE_STATUS_LABELS[q.status]}
            </span>
            <span>
              For{" "}
              <Link
                href={q.client ? `/admin/clients/${q.client.id}` : backHref}
              >
                {to.name}
              </Link>
            </span>
            {q.sent_at ? <span>Sent {formatDateTime(q.sent_at)}</span> : null}
          </p>
        </div>
        {q.number ? (
          <a className="btn" href={`/api/documents/quote/${q.number}`}>
            Download PDF
          </a>
        ) : null}
      </div>

      {sp.sent ? (
        <div className="notice ok" role="status" style={{ marginBottom: 14 }}>
          Quote {q.number} sent to {to.email} with the PDF attached.
        </div>
      ) : null}
      {sp.problem ? (
        <div className="notice err" role="alert" style={{ marginBottom: 14 }}>
          Quote {q.number} is numbered and saved, but the PDF or email
          didn&apos;t go through. Use Email again to retry.
        </div>
      ) : null}

      {q.status === "draft" ? (
        <div className="two">
          <section className="panel">
            <h2 style={{ marginBottom: 12 }}>Lines</h2>
            <DocumentEditor
              kind="quote"
              id={q.id}
              fields={{
                intro: q.intro,
                terms: q.terms,
                validUntil: q.valid_until,
              }}
              lines={q.lines.map((l) => ({
                serviceId: l.serviceId,
                name: l.name,
                description: l.description,
                unit: l.unit,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
              }))}
              services={(services ?? []).map((s) => ({
                ...s,
                price: Number(s.price),
              }))}
              vatRate={company.vatRegistered ? company.vatRate : 0}
              save={saveQuoteDraftAction}
            />
          </section>
          <section className="panel">
            <h2 style={{ marginBottom: 12 }}>Send</h2>
            <QuoteActions
              id={q.id}
              status={q.status}
              hasInvoice={false}
              hasClient={!!q.client}
              recipientEmail={to.email}
            />
          </section>
        </div>
      ) : (
        <div className="stack">
          <section className="panel">
            <QuoteActions
              id={q.id}
              status={q.status}
              hasInvoice={!!q.invoiceId}
              hasClient={!!q.client}
              recipientEmail={to.email}
            />
            {q.status === "accepted" && !q.client && q.lead ? (
              <p className="sub" style={{ marginTop: 10 }}>
                To invoice it,{" "}
                <Link href={`/admin/sales/${q.lead.id}#win`}>
                  mark the lead as won and create the client
                </Link>{" "}
                first.
              </p>
            ) : null}
          </section>
          <DocumentView d={quotePdfData(q, company)} />
        </div>
      )}
    </>
  );
}
