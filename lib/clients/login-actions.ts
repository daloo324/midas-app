"use server";

import { revalidatePath } from "next/cache";
import { fieldErrorsFrom, type ActionState } from "@/lib/auth/action-state";
import { staffWithRole } from "@/lib/auth/session";
import { createLoginForClient, setClientLoginActive } from "@/lib/data/clients";
import {
  clientLoginActiveSchema,
  clientLoginSchema,
} from "@/lib/validation/clients";

// Client logins can be created by the CEO or the client's own account exec
// (01-auth-and-roles.md). Used by /admin/clients now and the account exec's
// client profile in Phase 2.

const NOT_ALLOWED =
  "Only the CEO or this client's account exec can manage client logins.";

export async function createClientLoginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo", "account_exec"])))
    return { error: NOT_ALLOWED };
  const parsed = clientLoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const result = await createLoginForClient(parsed.data);
  revalidatePath(`/admin/clients/${parsed.data.clientId}`);
  return result;
}

export async function setClientLoginActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo", "account_exec"])))
    return { error: NOT_ALLOWED };
  const parsed = clientLoginActiveSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success)
    return { error: "Something went wrong. Reload the page and try again." };
  const result = await setClientLoginActive(
    parsed.data.clientUserId,
    parsed.data.active,
  );
  if (result.id) revalidatePath(`/admin/clients/${result.id}`);
  return { ok: result.ok, error: result.error };
}
