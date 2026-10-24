"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/auth/action-state";
import { staffWithRole } from "@/lib/auth/session";
import {
  getQuote,
  loadCompany,
  pdfPath,
  quotePdfData,
  quoteRecipient,
  storePdf,
  type Quote,
} from "@/lib/documents/money";
import { friendlyError } from "@/lib/data/errors";
import { sendEmail } from "@/lib/email/send";
import { quoteEmail } from "@/lib/email/templates";
import { formatDay, formatMoney } from "@/lib/format";
import type { ServiceUnit } from "@/lib/format/status";
import { createClient } from "@/lib/supabase/server";
import { newQuote, quoteDraft, uuid } from "@/lib/validation/admin";

const CEO_ONLY: ActionState = { error: "Only the CEO can do this." };
const DEFAULT_TERMS =
  "Monthly services are invoiced on the 1st of each month. Ad budgets are paid by the client directly to Meta and aren't included.";

function refresh(q?: { number: string | null; id: string }) {
  revalidatePath("/admin/quotes");
  revalidatePath("/admin/sales", "layout");
  revalidatePath("/admin");
  if (q) revalidatePath(`/admin/quotes/${q.number ?? q.id}`);
}

export async function createQuoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  const parsed = newQuote.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: { recipient: parsed.error.issues[0].message } };
  const [kind, id] = parsed.data.recipient.split(":");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .insert({
      lead_id: kind === "lead" ? id : null,
      client_id: kind === "client" ? id : null,
      terms: DEFAULT_TERMS,
    })
    .select("id")
    .single();
  if (error || !data)
    return {
      error: friendlyError(error, "The quote couldn't be started. Try again."),
    };
  refresh();
  redirect(`/admin/quotes/${data.id}`);
}

/** Saves a draft's text and replaces its lines (drafts only; the database checks). */
export async function saveQuoteDraftAction(
  input: unknown,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  const parsed = quoteDraft.safeParse(input);
  if (!parsed.success)
    return {
      error:
        parsed.error.issues[0]?.message ?? "Check the quote and try again.",
    };
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("quotes")
    .update({ intro: d.intro, terms: d.terms, valid_until: d.validUntil })
    .eq("id", d.id)
    .eq("status", "draft");
  if (error)
    return { error: friendlyError(error, "The quote didn't save. Try again.") };
  const { error: delError } = await supabase
    .from("quote_lines")
    .delete()
    .eq("quote_id", d.id);
  if (delError)
    return {
      error: friendlyError(delError, "The lines didn't save. Try again."),
    };
  if (d.lines.length) {
    const { error: insError } = await supabase.from("quote_lines").insert(
      d.lines.map((l, i) => ({
        quote_id: d.id,
        service_id: l.serviceId,
        name: l.name,
        description: l.description,
        unit: l.unit as ServiceUnit | null,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        sort: i,
      })),
    );
    if (insError)
      return {
        error: friendlyError(insError, "The lines didn't save. Try again."),
      };
  }
  refresh({ id: d.id, number: null });
  return { ok: "Quote saved." };
}

export async function deleteQuoteDraftAction(id: string): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  if (!uuid.safeParse(id).success)
    return { error: "Reload the page and try again." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", id)
    .eq("status", "draft")
    .select("lead_id");
  if (error || !data?.length)
    return { error: friendlyError(error, "Only draft quotes can be removed.") };
  refresh();
  redirect(
    data[0].lead_id ? `/admin/sales/${data[0].lead_id}` : "/admin/quotes",
  );
}

async function emailQuote(q: Quote, pdf: Buffer, replyTo: string | undefined) {
  const to = quoteRecipient(q);
  await sendEmail(
    quoteEmail({
      to: to.email!,
      name: to.contact,
      number: q.number!,
      total: formatMoney(q.total),
      validUntil: formatDay(q.valid_until),
      from: "Midas Media",
      replyTo,
      pdf,
    }),
  );
}

/**
 * Send: numbers the quote, makes and stores its PDF, emails it to the
 * contact and moves the lead to Quote sent. Once numbered the quote stays
 * sent even if the email fails; "Email again" retries.
 */
export async function sendQuoteAction(id: string): Promise<ActionState> {
  const me = await staffWithRole(["ceo"]);
  if (!me) return CEO_ONLY;
  const supabase = await createClient();
  const draft = await getQuote(supabase, id);
  if (!draft) return { error: "That quote wasn't found. Reload the page." };
  if (!quoteRecipient(draft).email)
    return {
      error: draft.client
        ? "Add a contact email to the client before sending."
        : "Add an email to the lead before sending.",
    };
  const { error } = await supabase.rpc("send_quote", { p_quote_id: id });
  if (error)
    return { error: friendlyError(error, "The quote wasn't sent. Try again.") };

  const q = (await getQuote(supabase, id))!;
  refresh(q);
  try {
    const company = await loadCompany(supabase);
    const pdf = await storePdf(
      supabase,
      "quote",
      q.id,
      pdfPath("quote", q.number!),
      quotePdfData(q, company),
    );
    await emailQuote(q, pdf, company.email ?? me.email);
  } catch (e) {
    console.error("Quote email or PDF failed", q.number, e);
    redirect(`/admin/quotes/${q.number}?problem=email`);
  }
  redirect(`/admin/quotes/${q.number}?sent=1`);
}

export async function resendQuoteAction(id: string): Promise<ActionState> {
  const me = await staffWithRole(["ceo"]);
  if (!me) return CEO_ONLY;
  const supabase = await createClient();
  const q = await getQuote(supabase, id);
  if (!q || q.status === "draft" || !q.number)
    return { error: "Send the quote first." };
  if (!quoteRecipient(q).email)
    return { error: "There's no email address to send it to." };
  try {
    const company = await loadCompany(supabase);
    const pdf = await storePdf(
      supabase,
      "quote",
      q.id,
      q.pdf_path ?? pdfPath("quote", q.number),
      quotePdfData(q, company),
    );
    await emailQuote(q, pdf, company.email ?? me.email);
  } catch (e) {
    console.error("Quote resend failed", q.number, e);
    return {
      error: "The email didn't send. Check the email settings, then try again.",
    };
  }
  refresh(q);
  return { ok: `Quote ${q.number} emailed to ${quoteRecipient(q).email}.` };
}

export async function setQuoteOutcomeAction(
  id: string,
  outcome: "accepted" | "declined",
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  if (
    !uuid.safeParse(id).success ||
    !["accepted", "declined"].includes(outcome)
  )
    return { error: "Reload the page and try again." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_quote_outcome", {
    p_quote_id: id,
    p_outcome: outcome,
  });
  if (error)
    return { error: friendlyError(error, "That didn't save. Try again.") };
  const q = await getQuote(supabase, id);
  refresh(q ?? undefined);
  return {
    ok: outcome === "accepted" ? "Marked accepted." : "Marked declined.",
  };
}

/** Accepted → Create invoice: copies the quote's lines into a draft invoice. */
export async function quoteToInvoiceAction(id: string): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  const supabase = await createClient();
  const q = await getQuote(supabase, id);
  if (!q) return { error: "That quote wasn't found. Reload the page." };
  if (q.status !== "accepted")
    return { error: "Only an accepted quote can become an invoice." };
  if (q.invoiceId) redirect(`/admin/invoices/${q.invoiceId}`);
  if (!q.client)
    return {
      error:
        "Create the client first: mark the lead as won and create the client from it.",
    };
  const { data: inv, error } = await supabase
    .from("invoices")
    .insert({ client_id: q.client.id, quote_id: q.id, notes: null })
    .select("id")
    .single();
  if (error || !inv)
    return {
      error: friendlyError(
        error,
        "The invoice couldn't be created. Try again.",
      ),
    };
  const { error: lineError } = await supabase.from("invoice_lines").insert(
    q.lines.map((l, i) => ({
      invoice_id: inv.id,
      service_id: l.serviceId,
      name: l.name,
      description: l.description,
      unit: l.unit as ServiceUnit | null,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      sort: i,
    })),
  );
  if (lineError)
    return {
      error: friendlyError(
        lineError,
        "The lines didn't copy. Open the draft and add them.",
      ),
    };
  revalidatePath("/admin/invoices");
  redirect(`/admin/invoices/${inv.id}`);
}
