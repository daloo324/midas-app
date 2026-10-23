"use server";

import { revalidatePath } from "next/cache";
import { fieldErrorsFrom, type ActionState } from "@/lib/auth/action-state";
import {
  inviteStaff,
  resendStaffInvite,
  setSignInBlocked,
} from "@/lib/auth/admin";
import { staffWithRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  staffActiveSchema,
  staffInviteSchema,
  staffRoleSchema,
  staffUserSchema,
} from "@/lib/validation/auth";

const CEO_ONLY = "Only the CEO can change the team.";

export async function inviteStaffAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return { error: CEO_ONLY };
  const parsed = staffInviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const result = await inviteStaff(parsed.data);
  revalidatePath("/admin/team");
  return result.ok ? { ok: result.message } : { error: result.error };
}

export async function changeRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return { error: CEO_ONLY };
  const parsed = staffRoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Choose a role." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.userId)
    .select("id");
  if (error)
    return {
      error:
        error.code === "P0001"
          ? error.message
          : "The role couldn't be changed. Try again.",
    };
  if (!data?.length) return { error: "That person isn't on the team." };

  revalidatePath("/admin/team");
  return { ok: "Role changed." };
}

export async function setStaffActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await staffWithRole(["ceo"]);
  if (!me) return { error: CEO_ONLY };
  const parsed = staffActiveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: "Something went wrong. Reload the page and try again." };
  const { userId, active } = parsed.data;
  if (userId === me.id && !active)
    return { error: "You can't switch off your own account." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ active })
    .eq("id", userId)
    .select("id");
  if (error)
    return {
      error:
        error.code === "P0001"
          ? error.message
          : "That change couldn't be saved. Try again.",
    };
  if (!data?.length) return { error: "That person isn't on the team." };

  if (!(await setSignInBlocked(userId, !active))) {
    await supabase
      .from("profiles")
      .update({ active: !active })
      .eq("id", userId);
    return {
      error: "Sign-in couldn't be updated, so nothing was changed. Try again.",
    };
  }

  revalidatePath("/admin/team");
  return {
    ok: active
      ? "Reactivated. They can sign in again."
      : "Deactivated. They can no longer sign in.",
  };
}

export async function resendInviteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return { error: CEO_ONLY };
  const parsed = staffUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: "Something went wrong. Reload the page and try again." };
  const result = await resendStaffInvite(parsed.data.userId);
  return result.ok ? { ok: result.message } : { error: result.error };
}
