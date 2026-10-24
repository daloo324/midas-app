import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDay } from "@/lib/format";
import {
  INVOICE_STATUS_LABELS,
  type InvoiceStatus,
  type QuoteStatus,
} from "@/lib/format/status";
import { renderPdf, type PdfData, type PdfLine } from "@/lib/pdf/document";
import type { Database } from "@/lib/supabase/database.types";

// Loading quotes, invoices and credit notes with everything their PDFs need,
// and making, storing and fetching those PDFs. Runs as the signed-in user
// (the CEO, or for downloads anyone RLS lets read the document).

type Db = SupabaseClient<Database>;

export type DocLine = PdfLine & {
  id: string;
  serviceId: string | null;
  unit: string | null;
  sort: number;
};

export type Company = PdfData["company"] & {
  bank: Record<string, string | null>;
  footer: string | null;
  paymentTermsDays: number;
  vatRegistered: boolean;
  vatRate: number;
};

const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

function lines(
  rows: {
    id: string;
    service_id: string | null;
    name: string;
    description: string | null;
    unit: string | null;
    quantity: number | string;
    unit_price: number | string;
    line_total: number | string | null;
    sort: number;
  }[],
): DocLine[] {
  return rows
    .map((l) => ({
      id: l.id,
      serviceId: l.service_id,
      name: l.name,
      description: l.description,
      unit: l.unit,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unit_price),
      lineTotal: Number(l.line_total ?? 0),
      sort: l.sort,
    }))
    .sort((a, b) => a.sort - b.sort);
}

/** Company, bank and invoicing settings (CEO only), with the logo file. */
export async function loadCompany(supabase: Db): Promise<Company> {
  const { data: st } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (!st) throw new Error("Settings are missing.");
  let logo: Buffer | null = null;
  if (st.logo_path) {
    const { data } = await supabase.storage
      .from("documents")
      .download(st.logo_path);
    if (data) logo = Buffer.from(await data.arrayBuffer());
  }
  return {
    name: st.company_name,
    legalName: st.legal_name,
    address: st.address,
    email: st.email,
    phone: st.phone,
    vatNumber: st.vat_registered ? st.vat_number : null,
    logo,
    bank: (st.bank_details ?? {}) as Record<string, string | null>,
    footer: st.invoice_footer,
    paymentTermsDays: st.payment_terms_days,
    vatRegistered: st.vat_registered,
    vatRate: Number(st.vat_rate),
  };
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

export type Quote = {
  id: string;
  number: string | null;
  status: QuoteStatus;
  issue_date: string | null;
  valid_until: string | null;
  intro: string | null;
  terms: string | null;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  pdf_path: string | null;
  sent_at: string | null;
  created_at: string;
  lead: {
    id: string;
    company: string;
    contact_name: string | null;
    email: string | null;
  } | null;
  client: {
    id: string;
    name: string;
    contact_name: string | null;
    contact_email: string | null;
    client_code: string;
  } | null;
  lines: DocLine[];
  invoiceId: string | null;
};

export async function getQuote(
  supabase: Db,
  ref: string,
): Promise<Quote | null> {
  const q = supabase
    .from("quotes")
    .select(
      "id, number, status, issue_date, valid_until, intro, terms, subtotal, vat_rate, vat_amount, total, pdf_path, sent_at, created_at, lead:leads(id, company, contact_name, email), client:clients(id, name, contact_name, contact_email, client_code), quote_lines(id, service_id, name, description, unit, quantity, unit_price, line_total, sort), invoices(id)",
    );
  const { data } = await (
    isUuid(ref) ? q.eq("id", ref) : q.eq("number", ref)
  ).maybeSingle();
  if (!data) return null;
  return {
    ...data,
    subtotal: Number(data.subtotal),
    vat_rate: Number(data.vat_rate),
    vat_amount: Number(data.vat_amount),
    total: Number(data.total),
    lines: lines(data.quote_lines),
    invoiceId: data.invoices[0]?.id ?? null,
  };
}

/** Who a quote goes to: the client's contact, or the lead's. */
export function quoteRecipient(q: Quote) {
  if (q.client)
    return {
      name: q.client.name,
      contact: q.client.contact_name,
      email: q.client.contact_email,
      code: q.client.client_code,
    };
  return {
    name: q.lead?.company ?? "—",
    contact: q.lead?.contact_name ?? null,
    email: q.lead?.email ?? null,
    code: null,
  };
}

export function quotePdfData(q: Quote, c: Company): PdfData {
  const to = quoteRecipient(q);
  return {
    heading: "QUOTE",
    number: q.number ?? "Draft",
    dates: [
      { label: "Issued", value: formatDay(q.issue_date) },
      { label: "Valid until", value: formatDay(q.valid_until) },
    ],
    company: c,
    billTo: {
      name: to.name,
      lines: [to.contact, to.email, to.code && `Client ID ${to.code}`].filter(
        (x): x is string => !!x,
      ),
    },
    intro: q.intro,
    lines: q.lines,
    subtotal: q.subtotal,
    vatRate: q.vat_rate,
    vatAmount: q.vat_amount,
    total: q.total,
    terms: q.terms,
    footer: c.footer,
  };
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export type Invoice = {
  id: string;
  number: string | null;
  status: InvoiceStatus;
  title: string | null;
  period_label: string | null;
  period_month: string | null;
  is_retainer: boolean;
  issue_date: string | null;
  due_date: string | null;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  amount_paid: number;
  amount_credited: number;
  balance: number;
  notes: string | null;
  pdf_path: string | null;
  quote_id: string | null;
  created_at: string;
  client: {
    id: string;
    name: string;
    contact_name: string | null;
    contact_email: string | null;
    client_code: string;
    reminders_enabled: boolean;
  };
  lines: DocLine[];
  payments: {
    id: string;
    amount: number;
    paid_on: string;
    method: string;
    reference: string | null;
  }[];
  credits: {
    id: string;
    number: string;
    amount: number;
    reason: string;
    issued_on: string;
    pdf_path: string | null;
  }[];
};

export const INVOICE_COLUMNS =
  "id, number, status, title, period_label, period_month, is_retainer, issue_date, due_date, subtotal, vat_rate, vat_amount, total, amount_paid, amount_credited, balance, notes, pdf_path, quote_id, created_at, client:clients(id, name, contact_name, contact_email, client_code, reminders_enabled), invoice_lines(id, service_id, name, description, unit, quantity, unit_price, line_total, sort), payments(id, amount, paid_on, method, reference), credit_notes(id, number, amount, reason, issued_on, pdf_path)";

type InvoiceRow = Omit<
  Invoice,
  | "lines"
  | "payments"
  | "credits"
  | "subtotal"
  | "vat_rate"
  | "vat_amount"
  | "total"
  | "amount_paid"
  | "amount_credited"
  | "balance"
  | "client"
> & {
  subtotal: number | string;
  vat_rate: number | string;
  vat_amount: number | string;
  total: number | string;
  amount_paid: number | string;
  amount_credited: number | string;
  balance: number | string | null;
  client: Invoice["client"] | null;
  invoice_lines: Parameters<typeof lines>[0];
  payments: {
    id: string;
    amount: number | string;
    paid_on: string;
    method: string;
    reference: string | null;
  }[];
  credit_notes: {
    id: string;
    number: string;
    amount: number | string;
    reason: string;
    issued_on: string;
    pdf_path: string | null;
  }[];
};

export function toInvoice(r: InvoiceRow): Invoice {
  return {
    ...r,
    client: r.client!,
    subtotal: Number(r.subtotal),
    vat_rate: Number(r.vat_rate),
    vat_amount: Number(r.vat_amount),
    total: Number(r.total),
    amount_paid: Number(r.amount_paid),
    amount_credited: Number(r.amount_credited),
    balance: Number(r.balance ?? 0),
    lines: lines(r.invoice_lines),
    payments: r.payments
      .map((p) => ({ ...p, amount: Number(p.amount) }))
      .sort((a, b) => a.paid_on.localeCompare(b.paid_on)),
    credits: r.credit_notes
      .map((n) => ({ ...n, amount: Number(n.amount) }))
      .sort((a, b) => a.number.localeCompare(b.number)),
  };
}

export async function getInvoice(
  supabase: Db,
  ref: string,
): Promise<Invoice | null> {
  const q = supabase.from("invoices").select(INVOICE_COLUMNS);
  const { data } = await (
    isUuid(ref) ? q.eq("id", ref) : q.eq("number", ref)
  ).maybeSingle();
  return data ? toInvoice(data as unknown as InvoiceRow) : null;
}

export function bankLines(c: Company, reference: string | null): string[] {
  const b = c.bank;
  const parts = [
    b.bank && `Bank: ${b.bank}`,
    b.account_name && `Account name: ${b.account_name}`,
    b.account_number && `Account: ${b.account_number}`,
    b.branch_code && `Branch: ${b.branch_code}`,
    b.swift && `SWIFT: ${b.swift}`,
  ].filter((x): x is string => !!x);
  return [
    reference
      ? `Bank transfer, using ${reference} as the reference.`
      : "Bank transfer.",
    ...(parts.length ? [parts.join(" · ")] : ["Bank details to follow."]),
  ];
}

export function invoicePdfData(
  inv: Invoice,
  c: Company,
  today: string,
): PdfData {
  const overdue = inv.balance > 0 && !!inv.due_date && inv.due_date < today;
  const status =
    inv.status === "paid"
      ? { label: "Paid", tone: "good" as const }
      : inv.status === "credited"
        ? { label: "Credited", tone: "muted" as const }
        : { label: overdue ? "Overdue" : "Due", tone: "warn" as const };
  const extra: { label: string; value: number }[] = [];
  if (inv.amount_paid > 0)
    extra.push({ label: "Paid", value: inv.amount_paid });
  if (inv.amount_credited > 0)
    extra.push({ label: "Credited", value: inv.amount_credited });
  if (extra.length) extra.push({ label: "Balance", value: inv.balance });
  return {
    heading: (inv.title ?? "Invoice").toUpperCase(),
    number: inv.number ?? "Draft",
    dates: [
      { label: "Issued", value: formatDay(inv.issue_date) },
      { label: "Due", value: formatDay(inv.due_date) },
    ],
    company: c,
    billTo: {
      name: inv.client.name,
      lines: [
        inv.client.contact_name,
        inv.client.contact_email,
        `Client ID ${inv.client.client_code}`,
        inv.period_label && `Period: ${inv.period_label}`,
      ].filter((x): x is string => !!x),
    },
    status,
    lines: inv.lines,
    subtotal: inv.subtotal,
    vatRate: inv.vat_rate,
    vatAmount: inv.vat_amount,
    total: inv.total,
    extraTotals: extra,
    payment: bankLines(c, inv.number),
    terms: inv.notes,
    footer: [
      "Ad budgets are paid by the client directly to Meta and are not included.",
      c.footer,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function creditNotePdfData(
  inv: Invoice,
  note: Invoice["credits"][number],
  c: Company,
): PdfData {
  // A VAT invoice's credit carries VAT at the same rate.
  const sub =
    inv.vat_rate > 0
      ? Math.round((note.amount / (1 + inv.vat_rate / 100)) * 100) / 100
      : note.amount;
  return {
    heading: "CREDIT NOTE",
    number: note.number,
    dates: [
      { label: "Issued", value: formatDay(note.issued_on) },
      { label: "Against", value: inv.number ?? "—" },
    ],
    company: c,
    billTo: {
      name: inv.client.name,
      lines: [
        inv.client.contact_name,
        `Client ID ${inv.client.client_code}`,
      ].filter((x): x is string => !!x),
    },
    lines: [
      {
        name: `Credit against ${inv.title ?? "invoice"} ${inv.number}`,
        description: note.reason,
        quantity: 1,
        unitPrice: sub,
        lineTotal: sub,
      },
    ],
    subtotal: sub,
    vatRate: inv.vat_rate,
    vatAmount: Math.round((note.amount - sub) * 100) / 100,
    total: note.amount,
    footer:
      `This credit reduces the balance of ${inv.number}. ${c.footer ?? ""}`.trim(),
  };
}

export function invoiceStatusLabel(
  inv: Pick<Invoice, "status" | "balance" | "due_date">,
  today: string,
) {
  if (
    inv.balance > 0 &&
    inv.status !== "draft" &&
    inv.due_date &&
    inv.due_date < today
  )
    return "Overdue";
  return INVOICE_STATUS_LABELS[inv.status];
}

// ---------------------------------------------------------------------------
// Storing and fetching PDFs
// ---------------------------------------------------------------------------

export function pdfPath(
  kind: "quote" | "invoice" | "credit_note",
  number: string,
  clientId?: string,
) {
  if (kind === "quote") return `quotes/${number}.pdf`;
  return `${clientId}/invoices/${number}.pdf`;
}

/** Renders, uploads and records a document's PDF. Returns the file. */
export async function storePdf(
  supabase: Db,
  kind: "quote" | "invoice" | "credit_note",
  id: string,
  path: string,
  data: PdfData,
): Promise<Buffer> {
  const pdf = await renderPdf(data);
  const { error } = await supabase.storage
    .from("documents")
    .upload(path, pdf, { contentType: "application/pdf", upsert: false });
  // Already there from an earlier try: keep the stored file (documents never change).
  if (error && !/exists|duplicate/i.test(error.message))
    throw new Error(error.message);
  const { error: e2 } = await supabase.rpc("set_document_pdf", {
    p_kind: kind,
    p_id: id,
    p_path: path,
  });
  if (e2) throw new Error(e2.message);
  if (error) {
    const { data: existing } = await supabase.storage
      .from("documents")
      .download(path);
    if (existing) return Buffer.from(await existing.arrayBuffer());
  }
  return pdf;
}
