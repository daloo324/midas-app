"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldErrorsFrom, type ActionState } from "@/lib/auth/action-state";
import { staffWithRole } from "@/lib/auth/session";
import {
  creditNotePdfData,
  getInvoice,
  invoicePdfData,
  loadCompany,
  pdfPath,
  storePdf,
  type Invoice,
} from "@/lib/documents/money";
import { friendlyError } from "@/lib/data/errors";
import { appUrl } from "@/lib/auth/links";
import { sendEmail } from "@/lib/email/send";
import { invoiceEmail } from "@/lib/email/templates";
import { formatDay, formatMoney, todayInGaborone } from "@/lib/format";
import type { ServiceUnit } from "@/lib/format/status";
import { createClient } from "@/lib/supabase/server";
import {
  creditNoteSchema,
  invoiceDraft,
  paymentSchema,
  uuid,
} from "@/lib/validation/admin";

const CEO_ONLY: ActionState = { error: "Only the CEO can do this." };

function refresh(inv?: {
  id: string;
  number: string | null;
  clientId?: string;
}) {
  revalidatePath("/admin/invoices", "layout");
  revalidatePath("/admin");
  revalidatePath("/portal", "layout");
  if (inv?.clientId) revalidatePath(`/admin/clients/${inv.clientId}`);
}

export async function createInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  const clientId = uuid.safeParse(formData.get("clientId"));
  if (!clientId.success)
    return { fieldErrors: { clientId: "Choose a client." } };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .insert({ client_id: clientId.data })
    .select("id")
    .single();
  if (error || !data)
    return {
      error: friendlyError(
        error,
        "The invoice couldn't be started. Try again.",
      ),
    };
  refresh();
  redirect(`/admin/invoices/${data.id}`);
}

export async function saveInvoiceDraftAction(
  input: unknown,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  const parsed = invoiceDraft.safeParse(input);
  if (!parsed.success)
    return {
      error:
        parsed.error.issues[0]?.message ?? "Check the invoice and try again.",
    };
  const d = parsed.data;
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("invoices")
    .update({ period_label: d.periodLabel, notes: d.notes })
    .eq("id", d.id)
    .eq("status", "draft")
    .select("id");
  if (error || !rows?.length)
    return {
      error: friendlyError(error, "Only draft invoices can be changed."),
    };
  const { error: delError } = await supabase
    .from("invoice_lines")
    .delete()
    .eq("invoice_id", d.id);
  if (delError)
    return {
      error: friendlyError(delError, "The lines didn't save. Try again."),
    };
  if (d.lines.length) {
    const { error: insError } = await supabase.from("invoice_lines").insert(
      d.lines.map((l, i) => ({
        invoice_id: d.id,
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
  refresh();
  return { ok: "Draft saved." };
}

export async function deleteInvoiceDraftAction(
  id: string,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  if (!uuid.safeParse(id).success)
    return { error: "Reload the page and try again." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("status", "draft")
    .select("id");
  if (error || !data?.length)
    return {
      error: friendlyError(error, "Only draft invoices can be removed."),
    };
  refresh();
  redirect("/admin/invoices");
}

/** Makes and stores the PDF, then emails it to the client's contact. */
async function deliver(inv: Invoice, replyTo: string): Promise<string | null> {
  const supabase = await createClient();
  const company = await loadCompany(supabase);
  const pdf = await storePdf(
    supabase,
    "invoice",
    inv.id,
    inv.pdf_path ?? pdfPath("invoice", inv.number!, inv.client.id),
    invoicePdfData(inv, company, todayInGaborone()),
  );
  if (!inv.client.contact_email) return "no_email";
  await sendEmail(
    invoiceEmail({
      to: inv.client.contact_email,
      name: inv.client.contact_name,
      number: inv.number!,
      title: inv.title ?? "Invoice",
      total: formatMoney(inv.total),
      dueDate: formatDay(inv.due_date),
      portalUrl: `${appUrl()}/portal/invoices?view=${inv.number}`,
      from: "Midas Media",
      replyTo: company.email ?? replyTo,
      pdf,
    }),
  );
  return null;
}

/** Issue one invoice: number, dates, PDF, visible in the portal, emailed. */
async function issueOne(
  id: string,
  replyTo: string,
): Promise<{ number?: string; error?: string; warning?: string }> {
  const supabase = await createClient();
  const { data: number, error } = await supabase.rpc("issue_invoice", {
    p_invoice_id: id,
  });
  if (error)
    return {
      error: friendlyError(error, "The invoice wasn't issued. Try again."),
    };
  const inv = (await getInvoice(supabase, id))!;
  try {
    const problem = await deliver(inv, replyTo);
    if (problem === "no_email")
      return {
        number,
        warning: `${inv.client.name} has no contact email, so ${number} wasn't emailed. It's in their portal.`,
      };
  } catch (e) {
    console.error("Invoice PDF or email failed", number, e);
    return {
      number,
      warning: `${number} is issued, but the PDF or email didn't go through. Use Email again.`,
    };
  }
  return { number };
}

export async function issueInvoiceAction(id: string): Promise<ActionState> {
  const me = await staffWithRole(["ceo"]);
  if (!me) return CEO_ONLY;
  const r = await issueOne(id, me.email);
  if (r.error) return { error: r.error };
  refresh();
  redirect(
    `/admin/invoices/${r.number}${r.warning ? "?problem=1" : "?issued=1"}`,
  );
}

/** The retainer review screen: issue the chosen drafts together. */
export async function issueManyAction(ids: string[]): Promise<ActionState> {
  const me = await staffWithRole(["ceo"]);
  if (!me) return CEO_ONLY;
  if (
    !Array.isArray(ids) ||
    !ids.length ||
    ids.length > 200 ||
    !ids.every((i) => uuid.safeParse(i).success)
  )
    return { error: "Choose the drafts to issue." };
  const issued: string[] = [];
  const problems: string[] = [];
  for (const id of ids) {
    const r = await issueOne(id, me.email);
    if (r.number) issued.push(r.number);
    if (r.error) problems.push(r.error);
    if (r.warning) problems.push(r.warning);
  }
  refresh();
  const done = issued.length
    ? `Issued ${issued.length} invoice${issued.length === 1 ? "" : "s"}.`
    : "";
  return problems.length
    ? { error: [done, ...problems].filter(Boolean).join(" ") }
    : { ok: done };
}

export async function resendInvoiceAction(id: string): Promise<ActionState> {
  const me = await staffWithRole(["ceo"]);
  if (!me) return CEO_ONLY;
  const supabase = await createClient();
  const inv = await getInvoice(supabase, id);
  if (!inv || inv.status === "draft")
    return { error: "Issue the invoice first." };
  try {
    const problem = await deliver(inv, me.email);
    if (problem === "no_email")
      return {
        error: `${inv.client.name} has no contact email. Add one on their record, then try again.`,
      };
  } catch (e) {
    console.error("Invoice resend failed", inv.number, e);
    return {
      error: "The email didn't send. Check the email settings, then try again.",
    };
  }
  refresh();
  return { ok: `${inv.number} emailed to ${inv.client.contact_email}.` };
}

export async function recordPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await staffWithRole(["ceo"]);
  if (!me) return CEO_ONLY;
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    invoice_id: p.invoiceId,
    amount: p.amount,
    paid_on: p.paidOn,
    method: p.method,
    reference: p.reference,
    recorded_by: me.id,
  });
  if (error)
    return {
      error: friendlyError(error, "The payment didn't save. Try again."),
    };
  refresh();
  return { ok: `Payment of ${formatMoney(p.amount)} recorded.` };
}

export async function creditNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  const parsed = creditNoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const c = parsed.data;
  const supabase = await createClient();
  const { data: noteId, error } = await supabase.rpc("issue_credit_note", {
    p_invoice_id: c.invoiceId,
    p_amount: c.amount,
    p_reason: c.reason,
  });
  if (error || !noteId)
    return {
      error: friendlyError(error, "The credit note wasn't issued. Try again."),
    };
  const inv = (await getInvoice(supabase, c.invoiceId))!;
  const note = inv.credits.find((n) => n.id === noteId)!;
  try {
    await storePdf(
      supabase,
      "credit_note",
      note.id,
      pdfPath("credit_note", note.number, inv.client.id),
      creditNotePdfData(inv, note, await loadCompany(supabase)),
    );
  } catch (e) {
    // The credit note stands; its PDF is made on first download instead.
    console.error("Credit note PDF failed", note.number, e);
  }
  refresh();
  return {
    ok: `Credit note ${note.number} issued for ${formatMoney(note.amount)}.`,
  };
}

/** The monthly retainer run, by hand (the cron job does the same on the 1st). */
export async function runRetainerAction(month: string): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  if (!/^\d{4}-\d{2}-01$/.test(month)) return { error: "Choose a month." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_retainer_drafts", {
    p_month: month,
  });
  if (error)
    return {
      error: friendlyError(error, "The retainer run didn't finish. Try again."),
    };
  refresh();
  return {
    ok: data
      ? `Made ${data} retainer draft${data === 1 ? "" : "s"}. Review them below, then issue.`
      : "Every active client already has a retainer invoice for that month.",
  };
}
