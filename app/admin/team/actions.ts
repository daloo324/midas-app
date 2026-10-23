"use server";

import { revalidatePath } from "next/cache";
import { fieldErrorsFrom, type ActionState } from "@/lib/auth/action-state";
import { staffWithRole } from "@/lib/auth/session";
import {
  changeStaffRole,
  inviteStaffMember,
  resendInvite,
  setStaffActive,
} from "@/lib/data/team";
import {
  staffActiveSchema,
  staffInviteSchema,
  staffRoleSchema,
  staffUserSchema,
} from "@/lib/validation/auth";

const CEO_ONLY = "Only the CEO can change the team.";
const RELOAD = "Something went wrong. Reload the page and try again.";

export async function inviteStaffAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return { error: CEO_ONLY };
  const parsed = staffInviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const result = await inviteStaffMember(parsed.data);
  revalidatePath("/admin/team");
  return result;
}

export async function changeRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return { error: CEO_ONLY };
  const parsed = staffRoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Choose a role." };
  const result = await changeStaffRole(parsed.data.userId, parsed.data.role);
  revalidatePath("/admin/team");
  return result;
}

export async function setStaffActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await staffWithRole(["ceo"]);
  if (!me) return { error: CEO_ONLY };
  const parsed = staffActiveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: RELOAD };
  const { userId, active } = parsed.data;
  if (userId === me.id && !active)
    return { error: "You can't switch off your own account." };
  const result = await setStaffActive(userId, active);
  revalidatePath("/admin/team");
  return result;
}

export async function resendInviteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return { error: CEO_ONLY };
  const parsed = staffUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: RELOAD };
  return resendInvite(parsed.data.userId);
}
