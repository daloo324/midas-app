"use server";

import { redirect } from "next/navigation";
import { fieldErrorsFrom, type ActionState } from "@/lib/auth/action-state";
import { homeFor } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { setPasswordSchema } from "@/lib/validation/auth";

const EXPIRED =
  'This link has expired or was already used. Ask for a new one with "Forgot password".';

export async function setPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = setPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const { password, tokenHash, type } = parsed.data;

  const supabase = await createClient();

  // The one-time token is used only now, when the person submits the form.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) return { error: EXPIRED };
  }

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { error: EXPIRED };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password")
      return {
        fieldErrors: {
          password: "Choose a different password from your last one.",
        },
      };
    if (error.code === "weak_password")
      return {
        fieldErrors: { password: "Choose a longer, harder-to-guess password." },
      };
    return { error: "Your password couldn't be saved. Try again." };
  }

  const user = await getCurrentUser();
  if (!user) {
    await supabase.auth.signOut();
    return { error: "This account is switched off. Ask Midas Media for help." };
  }
  redirect(homeFor(user.role));
}
