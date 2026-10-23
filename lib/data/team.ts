import "server-only";
import {
  inviteStaff,
  pendingInviteIds,
  resendStaffInvite,
  setSignInBlocked,
} from "@/lib/auth/admin";
import type { StaffRole } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";
import type { DataResult } from "./result";

// The team: CEO only. Callers check the role; the database applies the same rules again.

export type TeamMember = {
  id: string;
  full_name: string;
  email: string;
  role: StaffRole;
  active: boolean;
  pending: boolean;
  clients: number;
};

export async function listTeam(): Promise<TeamMember[]> {
  const supabase = await createClient();
  const [{ data: staff }, { data: clients }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, active")
      .order("active", { ascending: false })
      .order("full_name"),
    supabase.from("clients").select("account_exec_id, status"),
  ]);
  const people = staff ?? [];
  const pending = await pendingInviteIds(
    people.filter((p) => p.active).map((p) => p.id),
  );
  return people.map((p) => ({
    ...p,
    pending: pending.has(p.id),
    clients: (clients ?? []).filter(
      (c) => c.account_exec_id === p.id && c.status !== "ended",
    ).length,
  }));
}

export async function inviteStaffMember(input: {
  fullName: string;
  email: string;
  role: StaffRole;
}): Promise<DataResult> {
  const result = await inviteStaff(input);
  return result.ok ? { ok: result.message } : { error: result.error };
}

export async function resendInvite(userId: string): Promise<DataResult> {
  const result = await resendStaffInvite(userId);
  return result.ok ? { ok: result.message } : { error: result.error };
}

export async function changeStaffRole(
  userId: string,
  role: StaffRole,
): Promise<DataResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId)
    .select("id");
  if (error)
    return {
      error:
        error.code === "P0001"
          ? error.message
          : "The role couldn't be changed. Try again.",
    };
  if (!data?.length) return { error: "That person isn't on the team." };
  return { ok: "Role changed." };
}

export async function setStaffActive(
  userId: string,
  active: boolean,
): Promise<DataResult> {
  const message = active
    ? "Reactivated. They can sign in again."
    : "Deactivated. They can no longer sign in.";

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
  return { ok: message };
}
