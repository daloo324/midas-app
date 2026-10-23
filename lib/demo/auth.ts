import "server-only";
import { cookies } from "next/headers";
import type { CurrentUser } from "@/lib/auth/session";
import { DEMO_COOKIE, DEMO_PASSWORD } from "./mode";
import { store } from "./store";

// Dummy logins for demo mode. The cookie only names a sample account; the
// data behind it is fake, so there is nothing real to protect.

export function demoUserById(id: string | undefined): CurrentUser | null {
  if (!id) return null;
  const s = store();
  const staff = s.staff.find((p) => p.id === id);
  if (staff) {
    return staff.active
      ? {
          kind: "staff",
          id: staff.id,
          role: staff.role,
          name: staff.full_name,
          email: staff.email,
        }
      : null;
  }
  const login = s.logins.find((l) => l.user_id === id);
  if (!login || !login.active) return null;
  return {
    kind: "client",
    id: login.user_id,
    role: "client",
    name: login.full_name,
    email: login.email,
    loginId: login.login_id,
    clientId: login.client_id,
    clientName: s.clients.find((c) => c.id === login.client_id)?.name ?? "",
  };
}

export async function demoSessionUserId(): Promise<string | undefined> {
  return (await cookies()).get(DEMO_COOKIE)?.value;
}

export async function startDemoSession(userId: string) {
  (await cookies()).set(DEMO_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function endDemoSession() {
  (await cookies()).delete(DEMO_COOKIE);
}

/** Staff sign-in: active sample staff with the demo password. */
export function checkDemoStaff(email: string, password: string): string | null {
  const p = store().staff.find((x) => x.email === email);
  return p && p.active && password === DEMO_PASSWORD ? p.id : null;
}

// The same lockout as public.client_login_locked(): some failure in the last
// 15 minutes was at least the fifth within 15 minutes, since the last success.
const MIN = 60_000;

export function demoLoginLocked(loginId: string, now = Date.now()): boolean {
  const all = store().attempts.get(loginId) ?? [];
  const lastOk = Math.max(
    -Infinity,
    ...all.filter((a) => a.ok).map((a) => a.at),
  );
  const failures = all
    .filter((a) => !a.ok && a.at > lastOk && a.at > now - 30 * MIN)
    .map((a) => a.at);
  return failures.some(
    (f) =>
      f > now - 15 * MIN &&
      failures.filter((g) => g > f - 15 * MIN && g <= f).length >= 5,
  );
}

function record(loginId: string, ok: boolean) {
  const s = store();
  s.attempts.set(loginId, [
    ...(s.attempts.get(loginId) ?? []),
    { at: Date.now(), ok },
  ]);
}

/** Client sign-in by login ID. Returns the user id, or null for any failure. */
export function checkDemoClient(
  loginId: string,
  password: string,
): string | null {
  if (demoLoginLocked(loginId)) return null;
  const login = store().logins.find((l) => l.login_id === loginId);
  if (!login || !login.active || password !== DEMO_PASSWORD) {
    record(loginId, false);
    return null;
  }
  record(loginId, true);
  return login.user_id;
}
