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

export type Workload = {
  id: string;
  name: string;
  role: StaffRole;
  clients: number;
  /** Account execs: calendars and campaign briefs still to send. */
  toSend: number;
  /** Designers: items in design and in revisions, and hours this month. */
  inDesign: number;
  inRevisions: number;
  hoursThisMonth: number;
};

/** Who is carrying what this month (06-admin.md "Workload"). */
export async function listWorkload(month: string): Promise<Workload[]> {
  const supabase = await createClient();
  const [
    { data: staff },
    { data: clients },
    { data: months },
    { data: campaigns },
    { data: items },
    { data: time },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("active", true)
      .in("role", ["account_exec", "designer", "creative_director"])
      .order("full_name"),
    supabase
      .from("clients")
      .select("id, account_exec_id, status")
      .in("status", ["onboarding", "active", "paused"]),
    supabase
      .from("content_months")
      .select("client_id, plan_status, month")
      .gte("month", month),
    supabase
      .from("campaigns")
      .select("client_id, status")
      .eq("status", "draft"),
    supabase
      .from("content_items")
      .select("assigned_designer_id, status")
      .in("status", ["in_design", "changes_requested"]),
    supabase
      .from("time_entries")
      .select("user_id, minutes, started_at")
      .gte("started_at", `${month}T00:00:00+02:00`)
      .not("minutes", "is", null),
  ]);
  return (staff ?? []).map((p) => {
    const mine = (clients ?? [])
      .filter((c) => c.account_exec_id === p.id)
      .map((c) => c.id);
    const toSend =
      (months ?? []).filter(
        (m) => mine.includes(m.client_id) && m.plan_status === "draft",
      ).length +
      (campaigns ?? []).filter((c) => mine.includes(c.client_id)).length;
    const work = (items ?? []).filter((i) => i.assigned_designer_id === p.id);
    const minutes = (time ?? [])
      .filter((t) => t.user_id === p.id)
      .reduce((a, t) => a + (t.minutes ?? 0), 0);
    return {
      id: p.id,
      name: p.full_name,
      role: p.role,
      clients: mine.length,
      toSend,
      inDesign: work.filter((i) => i.status === "in_design").length,
      inRevisions: work.filter((i) => i.status === "changes_requested").length,
      hoursThisMonth: Math.round((minutes / 60) * 10) / 10,
    };
  });
}
