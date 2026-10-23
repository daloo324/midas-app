import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { demoSessionUserId, demoUserById } from "@/lib/demo/auth";
import { isDemoMode } from "@/lib/demo/mode";
import { createClient } from "@/lib/supabase/server";
import {
  CLIENT_LOGIN,
  STAFF_LOGIN,
  canEnter,
  type Area,
  type StaffRole,
} from "./routes";

export type StaffUser = {
  kind: "staff";
  id: string;
  role: StaffRole;
  name: string;
  email: string;
};

export type ClientUser = {
  kind: "client";
  id: string;
  role: "client";
  name: string;
  email: string;
  loginId: string;
  clientId: string;
  clientName: string;
};

export type CurrentUser = StaffUser | ClientUser;

/**
 * Who is signed in, or null. Deactivated staff and client logins count as
 * signed out. Cached for the length of one request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (isDemoMode()) return demoUserById(await demoSessionUserId());

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, active")
    .eq("id", userId)
    .maybeSingle();
  if (profile) {
    if (!profile.active) return null;
    return {
      kind: "staff",
      id: profile.id,
      role: profile.role,
      name: profile.full_name,
      email: profile.email,
    };
  }

  const { data: login } = await supabase
    .from("client_users")
    .select("user_id, full_name, email, login_id, client_id, active")
    .eq("user_id", userId)
    .maybeSingle();
  if (!login || !login.active) return null;

  const { data: client } = await supabase
    .from("portal_client")
    .select("name")
    .eq("id", login.client_id)
    .maybeSingle();

  return {
    kind: "client",
    id: login.user_id,
    role: "client",
    name: login.full_name,
    email: login.email,
    loginId: login.login_id,
    clientId: login.client_id,
    clientName: client?.name ?? "",
  };
});

/**
 * Guards an area layout: signed-out people go to the right sign-in page,
 * people with the wrong role go to the "no access" page.
 */
export async function requireArea(area: Area): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(area === "portal" ? CLIENT_LOGIN : STAFF_LOGIN);
  if (!canEnter(area, user.role)) redirect("/no-access");
  return user;
}

/** For server actions: the signed-in staff member with one of these roles, or null. */
export async function staffWithRole(
  roles: readonly StaffRole[],
): Promise<StaffUser | null> {
  const user = await getCurrentUser();
  if (!user || user.kind !== "staff" || !roles.includes(user.role)) return null;
  return user;
}
