"use server";

import { z } from "zod";
import { fieldErrorsFrom, type ActionState } from "@/lib/auth/action-state";
import { setPasswordSchema } from "@/lib/validation/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { friendlyError } from "@/lib/data/errors";
import { createClient } from "@/lib/supabase/server";

// The client's answers in the portal. The database checks it's their own
// client and that the work is waiting for them. The page isn't refreshed, so
// the answered item stays on screen with its result (client-portal.html).

const answer = z.object({
  id: z.uuid(),
  approve: z.boolean(),
  note: z.string().trim().max(2000),
});

async function isClient() {
  const user = await getCurrentUser();
  return user?.kind === "client";
}

const SENT = "Sent. Midas replies within 48 hours.";
const APPROVED = "Approved. Midas has been notified.";

export async function respondToCalendarAction(
  input: unknown,
): Promise<ActionState> {
  if (!(await isClient()))
    return { error: "Sign in with your client ID to approve." };
  const parsed = answer.safeParse(input);
  if (!parsed.success)
    return { error: "Something went wrong. Reload the page and try again." };
  if (!parsed.data.approve && !parsed.data.note)
    return { error: "Tell us what should change first." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_calendar", {
    p_month_id: parsed.data.id,
    p_approve: parsed.data.approve,
    p_comment: parsed.data.note || undefined,
  });
  if (error)
    return {
      error: friendlyError(error, "Your answer didn't send. Try again."),
    };
  return { ok: parsed.data.approve ? APPROVED : SENT };
}

export async function respondToBriefAction(
  input: unknown,
): Promise<ActionState> {
  if (!(await isClient()))
    return { error: "Sign in with your client ID to approve." };
  const parsed = answer.safeParse(input);
  if (!parsed.success)
    return { error: "Something went wrong. Reload the page and try again." };
  if (!parsed.data.approve && !parsed.data.note)
    return { error: "Tell us what should change first." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_campaign_status", {
    p_campaign_id: parsed.data.id,
    p_new_status: parsed.data.approve ? "approved" : "draft",
    p_comment: parsed.data.note || undefined,
  });
  if (error)
    return {
      error: friendlyError(error, "Your answer didn't send. Try again."),
    };
  return { ok: parsed.data.approve ? APPROVED : SENT };
}

/** The client signs off their brand kit, or asks for changes with a note. */
export async function respondToKitAction(input: unknown): Promise<ActionState> {
  const user = await getCurrentUser();
  if (user?.kind !== "client")
    return { error: "Sign in with your client ID to approve." };
  const parsed = answer.safeParse(input);
  if (!parsed.success || parsed.data.id !== user.clientId)
    return { error: "Something went wrong. Reload the page and try again." };
  if (!parsed.data.approve && !parsed.data.note)
    return { error: "Tell us what should change first." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_brand_kit_status", {
    p_client_id: parsed.data.id,
    p_new_status: parsed.data.approve ? "approved" : "changes_requested",
    p_comment: parsed.data.note || undefined,
  });
  if (error)
    return {
      error: friendlyError(error, "Your answer didn't send. Try again."),
    };
  return {
    ok: parsed.data.approve
      ? "Signed off. Your brand assets are in the Brand assets tab now."
      : SENT,
  };
}

const undoInput = z.object({
  entityType: z.enum([
    "content_item",
    "content_month",
    "campaign",
    "brand_kit",
  ]),
  id: z.uuid(),
});

/** Takes back an answer within 10 minutes, if Midas hasn't acted on it yet. */
export async function undoAction(input: unknown): Promise<ActionState> {
  if (!(await isClient())) return { error: "Sign in with your client ID." };
  const parsed = undoInput.safeParse(input);
  if (!parsed.success)
    return { error: "Something went wrong. Reload the page and try again." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("undo_client_response", {
    p_entity_type: parsed.data.entityType,
    p_entity_id: parsed.data.id,
  });
  if (error)
    return {
      error: friendlyError(error, "That couldn't be undone. Try again."),
    };
  return { ok: "Undone. It's waiting for you again." };
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await isClient())) return { error: "Sign in with your client ID." };
  const parsed = setPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return {
      error: /same|different/i.test(error.message)
        ? "Choose a password you haven't used here before."
        : "Your password didn't change. Try again.",
    };
  }
  return { ok: "Password changed. Use it next time you sign in." };
}

/** The client approves a piece of content, or asks for changes with a note. */
export async function respondToItemAction(
  input: unknown,
): Promise<ActionState> {
  if (!(await isClient()))
    return { error: "Sign in with your client ID to approve." };
  const parsed = answer.safeParse(input);
  if (!parsed.success)
    return { error: "Something went wrong. Reload the page and try again." };
  if (!parsed.data.approve && !parsed.data.note)
    return { error: "Tell us what should change first." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_content_status", {
    p_item_id: parsed.data.id,
    p_new_status: parsed.data.approve ? "approved" : "changes_requested",
    p_comment: parsed.data.note || undefined,
  });
  if (error)
    return {
      error: friendlyError(error, "Your answer didn't send. Try again."),
    };
  return { ok: parsed.data.approve ? APPROVED : SENT };
}
