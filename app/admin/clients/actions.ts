"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldErrorsFrom, type ActionState } from "@/lib/auth/action-state";
import { staffWithRole } from "@/lib/auth/session";
import {
  createClientRecord,
  updateClientAccount,
  updateClientProfile,
} from "@/lib/data/clients";
import type { ClientStatus } from "@/lib/format/status";
import {
  clientAdminSchema,
  clientRecordSchema,
  newClientSchema,
} from "@/lib/validation/clients";

const CEO_ONLY = "Only the CEO can do this.";

export async function createClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return { error: CEO_ONLY };
  const parsed = newClientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const input = parsed.data;

  const result = await createClientRecord({
    name: input.name,
    industry: input.industry ?? null,
    contactName: input.contactName ?? null,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone ?? null,
    accountExecId: input.accountExecId,
    serviceId: input.serviceId,
  });
  if (!result.id) return result;

  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${result.id}`);
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

  const result = await updateClientProfile({
    clientId: input.clientId,
    name: input.name,
    industry: input.industry ?? null,
    contactName: input.contactName ?? null,
    contactRole: input.contactRole ?? null,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone ?? null,
    decisionMaker: input.decisionMaker ?? null,
    platforms: input.platforms,
    notes: input.notes ?? null,
  });
  revalidatePath(`/admin/clients/${input.clientId}`);
  revalidatePath("/admin/clients");
  return result;
}

export async function updateClientAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return { error: CEO_ONLY };
  const parsed = clientAdminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const input = parsed.data;

  const result = await updateClientAccount({
    clientId: input.clientId,
    status: input.status as ClientStatus,
    accountExecId: input.accountExecId,
    serviceId: input.serviceId,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
  });
  revalidatePath(`/admin/clients/${input.clientId}`);
  revalidatePath("/admin/clients");
  revalidatePath("/admin/team");
  return result;
}
