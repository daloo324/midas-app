"use server";

import { revalidatePath } from "next/cache";
import { fieldErrorsFrom, type ActionState } from "@/lib/auth/action-state";
import { createClientLogin, setSignInBlocked } from "@/lib/auth/admin";
import { staffWithRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  clientLoginActiveSchema,
  clientLoginSchema,
} from "@/lib/validation/clients";

// Client logins can be created by the CEO or the client's own account exec
// (01-auth-and-roles.md). The RLS read below is what proves an account exec
// is assigned to the client.

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

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, name, account_exec:profiles!clients_account_exec_id_fkey(full_name)",
    )
    .eq("id", parsed.data.clientId)
    .maybeSingle();
  if (!client) return { error: NOT_ALLOWED };

  const result = await createClientLogin({
    clientId: client.id,
    clientName: client.name,
    accountExecName: client.account_exec?.full_name ?? null,
    fullName: parsed.data.fullName,
    email: parsed.data.email,
  });
  revalidatePath(`/admin/clients/${client.id}`);
  return result.ok ? { ok: result.message } : { error: result.error };
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
  const { clientUserId, active } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_users")
    .update({ active })
    .eq("id", clientUserId)
    .select("user_id, client_id");
  if (error || !data?.length) return { error: NOT_ALLOWED };
  const [row] = data;

  if (!(await setSignInBlocked(row.user_id, !active))) {
    await supabase
      .from("client_users")
      .update({ active: !active })
      .eq("id", clientUserId);
    return {
      error: "Sign-in couldn't be updated, so nothing was changed. Try again.",
    };
  }

  revalidatePath(`/admin/clients/${row.client_id}`);
  return {
    ok: active
      ? "Login switched back on."
      : "Login switched off. They can no longer sign in.",
  };
}
