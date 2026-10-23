"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { fieldErrorsFrom, type ActionState } from "@/lib/auth/action-state";
import { sendStaffReset } from "@/lib/auth/admin";
import { destinationAfterSignIn } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";
import { staffResetSchema, staffSignInSchema } from "@/lib/validation/auth";

const NO_MATCH = "That email and password don't match.";

export async function signInStaff(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = staffSignInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const { email, password, next } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) return { error: NO_MATCH };

  // Only active staff sign in here. Clients use their client ID on the portal.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    return { error: NO_MATCH };
  }

  redirect(destinationAfterSignIn(next, profile.role));
}

export async function requestStaffReset(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = staffResetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const { email } = parsed.data;
  // Send after responding, so the reply takes the same time whether or not the account exists.
  after(() => sendStaffReset(email));
  return { ok: "If that email has an account, we've emailed a reset link." };
}
