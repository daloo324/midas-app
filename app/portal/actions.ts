"use server";

import { z } from "zod";
import type { ActionState } from "@/lib/auth/action-state";
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
