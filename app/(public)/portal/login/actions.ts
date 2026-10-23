"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { fieldErrorsFrom, type ActionState } from "@/lib/auth/action-state";
import {
  emailForLoginId,
  isLoginLocked,
  recordLoginAttempt,
  sendClientReset,
} from "@/lib/auth/admin";
import { destinationAfterSignIn } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";
import { clientResetSchema, clientSignInSchema } from "@/lib/validation/auth";

// One message for every failure: unknown ID, wrong password, deactivated or
// locked. It never hints which part was wrong (01-auth-and-roles.md).
const NO_MATCH = "That client ID and password don't match.";

async function clientIp(): Promise<string | null> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null
  );
}

export async function signInClient(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = clientSignInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const { loginId, password, next } = parsed.data;
  const ip = await clientIp();

  if (await isLoginLocked(loginId)) return { error: NO_MATCH };

  const email = await emailForLoginId(loginId);
  if (!email) {
    await recordLoginAttempt(loginId, false, ip);
    return { error: NO_MATCH };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    await recordLoginAttempt(loginId, false, ip);
    return { error: NO_MATCH };
  }

  const { data: login } = await supabase
    .from("client_users")
    .select("login_id, active")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!login || !login.active || login.login_id !== loginId) {
    await supabase.auth.signOut();
    await recordLoginAttempt(loginId, false, ip);
    return { error: NO_MATCH };
  }

  await recordLoginAttempt(loginId, true, ip);
  redirect(destinationAfterSignIn(next, "client"));
}

export async function requestClientReset(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = clientResetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const { loginId } = parsed.data;
  after(() => sendClientReset(loginId));
  return { ok: "If that ID exists, we've emailed a reset link." };
}
