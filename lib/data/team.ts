import "server-only";
import {
  inviteStaff,
  pendingInviteIds,
  resendStaffInvite,
  setSignInBlocked,
} from "@/lib/auth/admin";
import { appUrl } from "@/lib/auth/links";
import { ROLE_LABELS, type StaffRole } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { demoEmailNote, demoSend } from "@/lib/demo/email";
import { isDemoMode } from "@/lib/demo/mode";
import { emailTaken, store } from "@/lib/demo/store";
import { staffInviteEmail } from "@/lib/email/templates";
import { createClient } from "@/lib/supabase/server";
import type { DataResult } from "./result";

// The team: CEO only. Callers check the role; the database (or, in demo mode,
// this file) applies the same rules again.

export type TeamMember = {
  id: string;
  full_name: string;
  email: string;
  role: StaffRole;
  active: boolean;
  pending: boolean;
  clients: number;
};

const LAST_CEO = "There must be at least one active CEO.";

export async function listTeam(): Promise<TeamMember[]> {
  if (isDemoMode()) {
    const user = await getCurrentUser();
    if (user?.kind !== "staff") return [];
    const s = store();
    return [...s.staff]
      .sort(
        (a, b) =>
          Number(b.active) - Number(a.active) ||
          a.full_name.localeCompare(b.full_name),
      )
      .map((p) => ({
        ...p,
        clients: s.clients.filter(
          (c) => c.account_exec_id === p.id && c.status !== "ended",
        ).length,
      }));
  }

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
  if (isDemoMode()) {
    if (emailTaken(input.email))
      return {
        error: "That email already has a login. Use a different email address.",
      };
    store().staff.push({
      id: crypto.randomUUID(),
      full_name: input.fullName,
      email: input.email,
      role: input.role,
      active: true,
      pending: true,
    });
    const outcome = await demoSend(
      staffInviteEmail({
        to: input.email,
        name: input.fullName,
        roleLabel: ROLE_LABELS[input.role],
        link: `${appUrl()}/login`,
      }),
    );
    return {
      ok: `${input.fullName} was added. ${demoEmailNote(outcome, input.email)}`,
    };
  }
  const result = await inviteStaff(input);
  return result.ok ? { ok: result.message } : { error: result.error };
}

export async function resendInvite(userId: string): Promise<DataResult> {
  if (isDemoMode()) {
    const p = store().staff.find((x) => x.id === userId);
    if (!p) return { error: "That person isn't on the team." };
    const outcome = await demoSend(
      staffInviteEmail({
        to: p.email,
        name: p.full_name,
        roleLabel: ROLE_LABELS[p.role],
        link: `${appUrl()}/login`,
      }),
    );
    return { ok: demoEmailNote(outcome, p.email) };
  }
  const result = await resendStaffInvite(userId);
  return result.ok ? { ok: result.message } : { error: result.error };
}

function demoWouldRemoveLastCeo(
  userId: string,
  next: { role?: StaffRole; active?: boolean },
) {
  const s = store();
  const p = s.staff.find((x) => x.id === userId);
  if (!p || p.role !== "ceo" || !p.active) return false;
  const stillCeo = (next.role ?? p.role) === "ceo" && (next.active ?? p.active);
  return (
    !stillCeo &&
    !s.staff.some((x) => x.id !== userId && x.role === "ceo" && x.active)
  );
}

export async function changeStaffRole(
  userId: string,
  role: StaffRole,
): Promise<DataResult> {
  if (isDemoMode()) {
    const p = store().staff.find((x) => x.id === userId);
    if (!p) return { error: "That person isn't on the team." };
    if (demoWouldRemoveLastCeo(userId, { role })) return { error: LAST_CEO };
    p.role = role;
    return { ok: "Role changed." };
  }
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

  if (isDemoMode()) {
    const p = store().staff.find((x) => x.id === userId);
    if (!p) return { error: "That person isn't on the team." };
    if (demoWouldRemoveLastCeo(userId, { active })) return { error: LAST_CEO };
    p.active = active;
    return { ok: message };
  }

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
