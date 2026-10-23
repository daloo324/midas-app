import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email/send";
import {
  clientWelcomeEmail,
  passwordResetEmail,
  staffInviteEmail,
} from "@/lib/email/templates";
import { setPasswordLink } from "./links";
import { ROLE_LABELS, type StaffRole } from "./routes";

// Auth admin tasks. Each uses the service role (CLAUDE.md rule 3), so callers
// must have checked the person's rights before calling.

const FOREVER = "876000h"; // about 100 years: Supabase's way to block sign-in

export type AdminResult =
  { ok: true; message: string } | { ok: false; error: string };

function emailInUse(
  error: { code?: string; message?: string; status?: number } | null,
): boolean {
  if (!error) return false;
  return (
    error.code === "email_exists" ||
    error.status === 422 ||
    /already been registered/i.test(error.message ?? "")
  );
}

export async function inviteStaff(input: {
  fullName: string;
  email: string;
  role: StaffRole;
}): Promise<AdminResult> {
  const service = createServiceClient();
  const { data, error } = await service.auth.admin.generateLink({
    type: "invite",
    email: input.email,
    options: { data: { full_name: input.fullName } },
  });
  if (emailInUse(error)) {
    return {
      ok: false,
      error: "That email already has a login. Use a different email address.",
    };
  }
  if (error || !data.user) {
    return {
      ok: false,
      error: "The invite couldn't be created. Try again in a minute.",
    };
  }

  const { error: profileError } = await service.from("profiles").insert({
    id: data.user.id,
    full_name: input.fullName,
    email: input.email,
    role: input.role,
  });
  if (profileError) {
    await service.auth.admin.deleteUser(data.user.id);
    return {
      ok: false,
      error: "The invite couldn't be saved. Try again in a minute.",
    };
  }

  try {
    await sendEmail(
      staffInviteEmail({
        to: input.email,
        name: input.fullName,
        roleLabel: ROLE_LABELS[input.role],
        link: setPasswordLink(data.properties.hashed_token, "invite", "staff"),
      }),
    );
  } catch {
    return {
      ok: false,
      error: `${input.fullName} was added, but the invite email didn't send. Use "Resend invite" to try again.`,
    };
  }
  return { ok: true, message: `Invite sent to ${input.email}.` };
}

/** Sends a fresh "set your password" link to a staff member who hasn't signed in yet. */
export async function resendStaffInvite(userId: string): Promise<AdminResult> {
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return { ok: false, error: "That person isn't on the team." };

  const { data, error } = await service.auth.admin.generateLink({
    type: "recovery",
    email: profile.email,
  });
  if (error)
    return {
      ok: false,
      error: "A new link couldn't be created. Try again in a minute.",
    };

  try {
    await sendEmail(
      staffInviteEmail({
        to: profile.email,
        name: profile.full_name,
        roleLabel: ROLE_LABELS[profile.role],
        link: setPasswordLink(
          data.properties.hashed_token,
          "recovery",
          "staff",
        ),
      }),
    );
  } catch {
    return {
      ok: false,
      error: "The invite email didn't send. Try again in a minute.",
    };
  }
  return { ok: true, message: `New invite sent to ${profile.email}.` };
}

/** Blocks or unblocks sign-in for a user. The caller updates the profile or login row. */
export async function setSignInBlocked(
  userId: string,
  blocked: boolean,
): Promise<boolean> {
  const service = createServiceClient();
  const { error } = await service.auth.admin.updateUserById(userId, {
    ban_duration: blocked ? FOREVER : "none",
  });
  return !error;
}

/** True if the user has never signed in (so their invite is still pending). */
export async function pendingInviteIds(
  userIds: string[],
): Promise<Set<string>> {
  const pending = new Set<string>();
  if (userIds.length === 0) return pending;
  const service = createServiceClient();
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await service.auth.admin.getUserById(id);
      if (data.user && !data.user.last_sign_in_at) pending.add(id);
    }),
  );
  return pending;
}

export async function createClientLogin(input: {
  clientId: string;
  clientName: string;
  accountExecName: string | null;
  fullName: string;
  email: string;
}): Promise<AdminResult & { loginId?: string }> {
  const service = createServiceClient();
  const { data, error } = await service.auth.admin.generateLink({
    type: "invite",
    email: input.email,
    options: { data: { full_name: input.fullName } },
  });
  if (emailInUse(error)) {
    return {
      ok: false,
      error: "That email already has a login. Use a different email address.",
    };
  }
  if (error || !data.user) {
    return {
      ok: false,
      error: "The login couldn't be created. Try again in a minute.",
    };
  }

  const { data: row, error: rowError } = await service
    .from("client_users")
    .insert({
      user_id: data.user.id,
      client_id: input.clientId,
      full_name: input.fullName,
      email: input.email,
    })
    .select("login_id")
    .single();
  if (rowError || !row) {
    await service.auth.admin.deleteUser(data.user.id);
    return {
      ok: false,
      error: "The login couldn't be saved. Try again in a minute.",
    };
  }

  try {
    await sendEmail(
      clientWelcomeEmail({
        to: input.email,
        name: input.fullName,
        clientName: input.clientName,
        loginId: row.login_id,
        accountExecName: input.accountExecName,
        link: setPasswordLink(data.properties.hashed_token, "invite", "client"),
      }),
    );
  } catch {
    return {
      ok: false,
      loginId: row.login_id,
      error: `Login ${row.login_id} was created, but the welcome email didn't send. The client can use "Forgot password" on the portal sign-in page with that ID.`,
    };
  }
  return {
    ok: true,
    loginId: row.login_id,
    message: `Login ${row.login_id} created. Welcome email sent to ${input.email}.`,
  };
}

/** Staff password reset. Sends only when the email belongs to active staff; never says which. */
export async function sendStaffReset(email: string): Promise<void> {
  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("full_name, email, active")
    .eq("email", email)
    .maybeSingle();
  if (!profile || !profile.active) return;

  const { data, error } = await service.auth.admin.generateLink({
    type: "recovery",
    email: profile.email,
  });
  if (error) return;
  await sendEmail(
    passwordResetEmail({
      to: profile.email,
      name: profile.full_name,
      link: setPasswordLink(data.properties.hashed_token, "recovery", "staff"),
    }),
  ).catch(() => undefined);
}

/** Client password reset by login ID. Sends only for an active login; never says which. */
export async function sendClientReset(loginId: string): Promise<void> {
  const service = createServiceClient();
  const { data: login } = await service
    .from("client_users")
    .select("full_name, email, login_id, active")
    .eq("login_id", loginId)
    .maybeSingle();
  if (!login || !login.active) return;

  const { data, error } = await service.auth.admin.generateLink({
    type: "recovery",
    email: login.email,
  });
  if (error) return;
  await sendEmail(
    passwordResetEmail({
      to: login.email,
      name: login.full_name,
      loginId: login.login_id,
      link: setPasswordLink(data.properties.hashed_token, "recovery", "client"),
    }),
  ).catch(() => undefined);
}

/** The email behind an active client login, for the client-ID sign-in. */
export async function emailForLoginId(loginId: string): Promise<string | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("client_users")
    .select("email, active")
    .eq("login_id", loginId)
    .maybeSingle();
  return data && data.active ? data.email : null;
}

export async function isLoginLocked(loginId: string): Promise<boolean> {
  const service = createServiceClient();
  const { data, error } = await service.rpc("client_login_locked", {
    p_login_id: loginId,
  });
  // If the check itself fails, treat the ID as locked rather than allow unlimited tries.
  return error ? true : Boolean(data);
}

export async function recordLoginAttempt(
  loginId: string,
  succeeded: boolean,
  ip: string | null,
): Promise<void> {
  const service = createServiceClient();
  await service
    .from("login_attempts")
    .insert({ login_id: loginId, succeeded, ip });
}

/**
 * Sends a client login's welcome email again, with a fresh link to set their
 * password. The caller must have checked they may manage this client's logins.
 */
export async function resendClientWelcome(
  clientUserId: string,
): Promise<AdminResult> {
  const service = createServiceClient();
  const { data: login } = await service
    .from("client_users")
    .select(
      "full_name, email, login_id, active, client:clients(name, account_exec:profiles!clients_account_exec_id_fkey(full_name))",
    )
    .eq("id", clientUserId)
    .maybeSingle();
  if (!login) return { ok: false, error: "That login doesn't exist." };
  if (!login.active)
    return {
      ok: false,
      error: "Switch the login back on before sending the welcome email.",
    };

  const { data, error } = await service.auth.admin.generateLink({
    type: "recovery",
    email: login.email,
  });
  if (error)
    return {
      ok: false,
      error: "The email couldn't be prepared. Try again in a minute.",
    };
  try {
    await sendEmail(
      clientWelcomeEmail({
        to: login.email,
        name: login.full_name,
        clientName: login.client?.name ?? "",
        loginId: login.login_id,
        accountExecName: login.client?.account_exec?.full_name ?? null,
        link: setPasswordLink(
          data.properties.hashed_token,
          "recovery",
          "client",
        ),
      }),
    );
  } catch {
    return {
      ok: false,
      error: "The welcome email didn't send. Try again in a minute.",
    };
  }
  return { ok: true, message: `Welcome email sent again to ${login.email}.` };
}
