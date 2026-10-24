"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldErrorsFrom, type ActionState } from "@/lib/auth/action-state";
import { staffWithRole } from "@/lib/auth/session";
import { createClientRecord } from "@/lib/data/clients";
import { friendlyError } from "@/lib/data/errors";
import type { LeadSource, LeadStage } from "@/lib/format/status";
import { createClient } from "@/lib/supabase/server";
import { leadMove, leadSchema, winLead } from "@/lib/validation/admin";

const CEO_ONLY: ActionState = { error: "Only the CEO can do this." };

function refresh(id?: string) {
  revalidatePath("/admin/sales");
  revalidatePath("/admin");
  if (id) revalidatePath(`/admin/sales/${id}`);
}

export async function saveLeadAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const l = parsed.data;
  const row = {
    company: l.company,
    contact_name: l.contactName,
    email: l.email,
    phone: l.phone,
    source: l.source as LeadSource,
    estimated_value: l.estimatedValue,
    owner_id: l.ownerId,
    next_action: l.nextAction,
    next_action_date: l.nextActionDate,
    notes: l.notes,
  };
  const supabase = await createClient();
  if (l.id) {
    const { error } = await supabase.from("leads").update(row).eq("id", l.id);
    if (error)
      return {
        error: friendlyError(error, "The lead didn't save. Try again."),
      };
    refresh(l.id);
    return { ok: "Lead saved." };
  }
  const { data, error } = await supabase
    .from("leads")
    .insert(row)
    .select("id")
    .single();
  if (error || !data)
    return { error: friendlyError(error, "The lead didn't save. Try again.") };
  refresh();
  redirect(`/admin/sales/${data.id}`);
}

/** Moves a lead between columns. Lost needs a reason; Won leads to creating the client. */
export async function moveLeadAction(input: unknown): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  const parsed = leadMove.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Try again." };
  const { id, stage, lostReason } = parsed.data;
  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("client_id, stage")
    .eq("id", id)
    .maybeSingle();
  if (!lead) return { error: "That lead wasn't found. Reload the page." };
  if (lead.client_id && stage !== "won")
    return {
      error: "This lead is already a client, so it stays in Won.",
    };
  const { error } = await supabase
    .from("leads")
    .update({
      stage: stage as LeadStage,
      lost_reason: stage === "lost" ? lostReason : null,
    })
    .eq("id", id);
  if (error)
    return { error: friendlyError(error, "The lead didn't move. Try again.") };
  refresh(id);
  return {
    ok:
      stage === "won"
        ? "Marked as won. Create the client next."
        : stage === "lost"
          ? "Marked as lost."
          : "Lead moved.",
  };
}

/**
 * Won → client: copies the lead's details into a new onboarding client, with
 * the service and fee from the accepted quote when there is one.
 */
export async function winLeadAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  const parsed = winLead.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const { leadId, accountExecId, serviceId } = parsed.data;
  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, company, contact_name, email, phone, client_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { error: "That lead wasn't found. Reload the page." };
  if (lead.client_id) redirect(`/admin/clients/${lead.client_id}`);

  const created = await createClientRecord({
    name: lead.company,
    industry: null,
    contactName: lead.contact_name,
    contactEmail: lead.email,
    contactPhone: lead.phone,
    accountExecId,
    serviceId,
  });
  if (!created.id) return created;

  // The fee agreed on the accepted quote wins over the catalogue price.
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, quote_lines(service_id, unit_price)")
    .eq("lead_id", leadId)
    .eq("status", "accepted")
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const agreed = quote?.quote_lines.find((l) => l.service_id === serviceId);
  if (agreed)
    await supabase
      .from("clients")
      .update({ monthly_fee: Number(agreed.unit_price) })
      .eq("id", created.id);

  await Promise.all([
    supabase
      .from("leads")
      .update({ stage: "won", client_id: created.id })
      .eq("id", leadId),
    supabase
      .from("quotes")
      .update({ client_id: created.id })
      .eq("lead_id", leadId)
      .is("client_id", null),
  ]);
  refresh(leadId);
  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${created.id}`);
}

export async function deleteLeadAction(id: string): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  const supabase = await createClient();
  const [{ data: lead }, { count }] = await Promise.all([
    supabase.from("leads").select("client_id").eq("id", id).maybeSingle(),
    supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", id),
  ]);
  if (!lead) return { error: "That lead wasn't found. Reload the page." };
  if (lead.client_id || count)
    return {
      error:
        "This lead has quotes or became a client, so it's kept. Mark it lost instead.",
    };
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error)
    return {
      error: friendlyError(error, "The lead wasn't removed. Try again."),
    };
  refresh();
  redirect("/admin/sales");
}
