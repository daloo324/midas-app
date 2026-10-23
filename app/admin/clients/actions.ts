"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldErrorsFrom, type ActionState } from "@/lib/auth/action-state";
import { staffWithRole } from "@/lib/auth/session";
import { todayInGaborone } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  clientAdminSchema,
  clientRecordSchema,
  newClientSchema,
} from "@/lib/validation/clients";

const CEO_ONLY = "Only the CEO can do this.";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function isActiveAccountExec(supabase: Supabase, id: string) {
  const { data } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", id)
    .maybeSingle();
  return Boolean(data && data.active && data.role === "account_exec");
}

export async function createClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return { error: CEO_ONLY };
  const parsed = newClientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const input = parsed.data;

  const supabase = await createClient();
  if (!(await isActiveAccountExec(supabase, input.accountExecId))) {
    return { fieldErrors: { accountExecId: "Choose an active account exec." } };
  }
  const { data: service } = await supabase
    .from("services")
    .select("id, price, active")
    .eq("id", input.serviceId)
    .maybeSingle();
  if (!service || !service.active)
    return { fieldErrors: { serviceId: "Choose an active service." } };

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      name: input.name,
      industry: input.industry ?? null,
      contact_name: input.contactName ?? null,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone ?? null,
      account_exec_id: input.accountExecId,
      service_id: service.id,
      monthly_fee: service.price, // copied, so later price changes don't alter it
      status: "onboarding",
    })
    .select("id")
    .single();
  if (error || !client)
    return { error: "The client couldn't be created. Try again." };

  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${client.id}`);
}

export async function updateClientRecordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return { error: CEO_ONLY };
  const parsed = clientRecordSchema.safeParse({
    ...Object.fromEntries(formData),
    platforms: formData.getAll("platforms"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const input = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update({
      name: input.name,
      industry: input.industry ?? null,
      contact_name: input.contactName ?? null,
      contact_role: input.contactRole ?? null,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone ?? null,
      decision_maker: input.decisionMaker ?? null,
      platforms: input.platforms,
      notes: input.notes ?? null,
    })
    .eq("id", input.clientId)
    .select("id");
  if (error || !data?.length)
    return { error: "The changes couldn't be saved. Try again." };

  revalidatePath(`/admin/clients/${input.clientId}`);
  revalidatePath("/admin/clients");
  return { ok: "Saved." };
}

export async function updateClientAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return { error: CEO_ONLY };
  const parsed = clientAdminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const input = parsed.data;

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("clients")
    .select("service_id, monthly_fee, start_date, end_date")
    .eq("id", input.clientId)
    .maybeSingle();
  if (!current) return { error: "That client doesn't exist." };

  if (!(await isActiveAccountExec(supabase, input.accountExecId))) {
    // Keeping a deactivated account exec already assigned is allowed; choosing one newly is not.
    const { data: same } = await supabase
      .from("clients")
      .select("id")
      .eq("id", input.clientId)
      .eq("account_exec_id", input.accountExecId)
      .maybeSingle();
    if (!same)
      return {
        fieldErrors: { accountExecId: "Choose an active account exec." },
      };
  }

  let monthlyFee = current.monthly_fee;
  if (input.serviceId !== current.service_id) {
    const { data: service } = await supabase
      .from("services")
      .select("price, active")
      .eq("id", input.serviceId)
      .maybeSingle();
    if (!service || !service.active)
      return { fieldErrors: { serviceId: "Choose an active service." } };
    monthlyFee = service.price; // copied at the moment the service is assigned
  }

  const today = todayInGaborone();
  const startDate =
    input.startDate ??
    (input.status === "active" ? (current.start_date ?? today) : null);
  const endDate =
    input.endDate ??
    (input.status === "ended" ? (current.end_date ?? today) : null);
  if (startDate && endDate && endDate < startDate) {
    return {
      fieldErrors: { endDate: "The end date can't be before the start date." },
    };
  }

  const { error } = await supabase
    .from("clients")
    .update({
      status: input.status as
        "lead_won" | "onboarding" | "active" | "paused" | "ended",
      account_exec_id: input.accountExecId,
      service_id: input.serviceId,
      monthly_fee: monthlyFee,
      start_date: startDate,
      end_date: endDate,
    })
    .eq("id", input.clientId);
  if (error) {
    if (error.code === "P0001")
      return { fieldErrors: { status: error.message } };
    return { error: "The changes couldn't be saved. Try again." };
  }

  revalidatePath(`/admin/clients/${input.clientId}`);
  revalidatePath("/admin/clients");
  revalidatePath("/admin/team");
  return { ok: "Saved." };
}
