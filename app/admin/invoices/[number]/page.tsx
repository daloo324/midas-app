import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { saveInvoiceDraftAction } from "@/app/admin/invoices/actions";
import { DocumentEditor } from "@/components/admin/document-editor";
import {
  CreditNoteForm,
  DraftInvoiceActions,
  PaymentForm,
  ResendInvoiceButton,
} from "@/components/admin/invoice-forms";
import { DocumentView } from "@/components/shared/document-view";
import {
  getInvoice,
  invoicePdfData,
  invoiceStatusLabel,
  loadCompany,
} from "@/lib/documents/money";
import { formatDay, formatMoney, todayInGaborone } from "@/lib/format";
import {
  INVOICE_STATUS_PILL,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/lib/format/status";
import { requireArea } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({
  params,
  searchParams,
}: PageProps<"/admin/invoices/[number]">) {
  await requireArea("admin");
  const { number } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const inv = await getInvoice(supabase, decodeURIComponent(number));
  if (!inv) notFound();
  const today = todayInGaborone();
  const [company, { data: services }] = await Promise.all([
    loadCompany(supabase),
    supabase
      .from("services")
      .select("id, name, description, unit, price")
      .eq("active", true)
      .order("sort")
      .order("name"),
  ]);
  const label = invoiceStatusLabel(inv, today);
  const open = inv.status === "issued" || inv.status === "part_paid";

  return (
    <>
      <div className="crumbs">
        <Link href="/admin/invoices" style={{ color: "inherit" }}>
          Invoices
        </Link>{" "}
        / {inv.number ?? "Draft"}
      </div>
      <div className="head">
        <div>
          <h1>{inv.number ? `${inv.title} ${inv.number}` : "Draft invoice"}</h1>
          <p className="sub row" style={{ gap: 10 }}>
            <span
              className={`pill ${label === "Overdue" ? "s-bad" : INVOICE_STATUS_PILL[inv.status]}`}
            >
              {label}
            </span>
            <span>
              For{" "}
              <Link href={`/admin/clients/${inv.client.id}`}>
                {inv.client.name}
              </Link>
            </span>
            {inv.period_label ? <span>{inv.period_label}</span> : null}
            {inv.balance > 0 && inv.status !== "draft" ? (
              <span>Balance {formatMoney(inv.balance)}</span>
            ) : null}
          </p>
        </div>
        {inv.number ? (
          <div className="row" style={{ gap: 8 }}>
            <ResendInvoiceButton id={inv.id} />
            <a className="btn" href={`/api/documents/invoice/${inv.number}`}>
              Download PDF
            </a>
          </div>
        ) : null}
      </div>

      {sp.issued ? (
        <div className="notice ok" role="status" style={{ marginBottom: 14 }}>
          {inv.number} issued
          {inv.client.contact_email
            ? ` and emailed to ${inv.client.contact_email}`
            : ""}
          . It&apos;s in the client&apos;s portal.
        </div>
      ) : null}
      {sp.problem ? (
        <div className="notice err" role="alert" style={{ marginBottom: 14 }}>
          {inv.number} is issued and in the client&apos;s portal, but{" "}
          {inv.client.contact_email
            ? "the PDF or email didn't go through. Use Email again to retry."
            : "the client has no contact email, so it wasn't emailed. Add one on their record, then use Email again."}
        </div>
      ) : null}

      {inv.status === "draft" ? (
        <div className="two">
          <section className="panel">
            <h2 style={{ marginBottom: 12 }}>Lines</h2>
            <DocumentEditor
              kind="invoice"
              id={inv.id}
              fields={{ periodLabel: inv.period_label, notes: inv.notes }}
              lines={inv.lines.map((l) => ({
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
              save={saveInvoiceDraftAction}
            />
          </section>
          <section className="panel">
            <h2 style={{ marginBottom: 12 }}>Issue</h2>
            <DraftInvoiceActions id={inv.id} email={inv.client.contact_email} />
          </section>
        </div>
      ) : (
        <div className="two">
          <DocumentView d={invoicePdfData(inv, company, today)} />
          <div className="stack">
            <section className="panel">
              <h2 style={{ marginBottom: 8 }}>Payments</h2>
              {inv.payments.length ? (
                <div className="list" style={{ marginBottom: 12 }}>
                  {inv.payments.map((p) => (
                    <div key={p.id}>
                      <span>
                        {formatDay(p.paid_on)} ·{" "}
                        {PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ??
                          p.method}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </span>
                      <span className="num">{formatMoney(p.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="sub">No payments yet.</p>
              )}
              {open ? (
                <PaymentForm
                  invoiceId={inv.id}
                  balance={inv.balance}
                  today={today}
                />
              ) : null}
            </section>
            <section className="panel">
              <h2 style={{ marginBottom: 8 }}>Credit notes</h2>
              {inv.credits.length ? (
                <div className="list" style={{ marginBottom: 12 }}>
                  {inv.credits.map((n) => (
                    <div key={n.id}>
                      <span>
                        <a href={`/api/documents/credit_note/${n.number}`}>
                          {n.number}
                        </a>{" "}
                        · {formatDay(n.issued_on)} · {n.reason}
                      </span>
                      <span className="num">{formatMoney(n.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="sub">
                  None. To correct this invoice, issue a credit note.
                </p>
              )}
              {open ? (
                <CreditNoteForm invoiceId={inv.id} balance={inv.balance} />
              ) : null}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
