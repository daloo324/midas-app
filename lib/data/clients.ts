import "server-only";
import { createClientLogin, setSignInBlocked } from "@/lib/auth/admin";
import { todayInGaborone } from "@/lib/format";
import type { ClientStatus } from "@/lib/format/status";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { DataResult } from "./result";

// Clients, the service catalogue and client logins. Every read runs as the
// signed-in user, so RLS decides what comes back.

export type ClientListRow = {
  id: string;
  name: string;
  client_code: string;
  status: ClientStatus;
  monthly_fee: number | null;
  start_date: string | null;
  account_exec_name: string | null;
  service_name: string | null;
};

export type ClientDetail = Pick<
  Tables<"clients">,
  | "id"
  | "name"
  | "client_code"
  | "industry"
  | "status"
  | "account_exec_id"
  | "service_id"
  | "monthly_fee"
  | "start_date"
  | "end_date"
  | "contact_name"
  | "contact_role"
  | "contact_email"
  | "contact_phone"
  | "decision_maker"
  | "platforms"
  | "notes"
  | "created_at"
>;

export type ClientLoginRow = {
  id: string;
  full_name: string;
  email: string;
  login_id: string;
  is_primary: boolean;
  active: boolean;
};

export type AccountExec = { id: string; full_name: string; active: boolean };
export type Service = {
  id: string;
  name: string;
  price: number;
  active: boolean;
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listClients(filter: {
  status: ClientStatus | null;
  ae: string | null;
}): Promise<ClientListRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select(
      "id, name, client_code, status, monthly_fee, start_date, account_exec:profiles!clients_account_exec_id_fkey(full_name), service:services(name)",
    )
    .order("name");
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.ae) query = query.eq("account_exec_id", filter.ae);
  const { data } = await query;
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    client_code: c.client_code,
    status: c.status,
    monthly_fee: c.monthly_fee,
    start_date: c.start_date,
    account_exec_name: c.account_exec?.full_name ?? null,
    service_name: c.service?.name ?? null,
  }));
}

export async function getClient(id: string): Promise<ClientDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select(
      "id, name, client_code, industry, status, account_exec_id, service_id, monthly_fee, start_date, end_date, contact_name, contact_role, contact_email, contact_phone, decision_maker, platforms, notes, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function listClientLogins(
  clientId: string,
): Promise<ClientLoginRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_users")
    .select("id, full_name, email, login_id, is_primary, active")
    .eq("client_id", clientId)
    .order("created_at");
  return data ?? [];
}

export async function listAccountExecs(): Promise<AccountExec[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, active")
    .eq("role", "account_exec")
    .order("full_name");
  return data ?? [];
}

export async function listServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("id, name, price, active")
    .order("sort")
    .order("name");
  return data ?? [];
}

export async function activeClientCapacity(): Promise<{
  active: number;
  max: number;
}> {
  const supabase = await createClient();
  const [{ count }, { data: settings }] = await Promise.all([
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("settings")
      .select("max_active_clients")
      .eq("id", 1)
      .maybeSingle(),
  ]);
  return { active: count ?? 0, max: settings?.max_active_clients ?? 10 };
}

// ---------------------------------------------------------------------------
// Changes (callers have checked the role; access is checked again here)
// ---------------------------------------------------------------------------

export type NewClientInput = {
  name: string;
  industry: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  accountExecId: string;
  serviceId: string;
};

async function accountExecIsActive(id: string) {
  return (await listAccountExecs()).some((e) => e.id === id && e.active);
}

async function activeService(id: string) {
  return (await listServices()).find((s) => s.id === id && s.active) ?? null;
}

export async function createClientRecord(
  input: NewClientInput,
): Promise<DataResult> {
  if (!(await accountExecIsActive(input.accountExecId))) {
    return { fieldErrors: { accountExecId: "Choose an active account exec." } };
  }
  const service = await activeService(input.serviceId);
  if (!service)
    return { fieldErrors: { serviceId: "Choose an active service." } };

  const record = {
    name: input.name,
    industry: input.industry,
    contact_name: input.contactName,
    contact_email: input.contactEmail,
    contact_phone: input.contactPhone,
    account_exec_id: input.accountExecId,
    service_id: service.id,
    monthly_fee: service.price, // copied, so later price changes don't alter it
    status: "onboarding" as const,
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert(record)
    .select("id")
    .single();
  if (error || !data)
    return { error: "The client couldn't be created. Try again." };
  return { id: data.id };
}

export type ClientProfileInput = {
  clientId: string;
  name: string;
  industry: string | null;
  contactName: string | null;
  contactRole: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  decisionMaker: string | null;
  platforms: string[];
  notes: string | null;
};

export async function updateClientProfile(
  input: ClientProfileInput,
): Promise<DataResult> {
  const fields = {
    name: input.name,
    industry: input.industry,
    contact_name: input.contactName,
    contact_role: input.contactRole,
    contact_email: input.contactEmail,
    contact_phone: input.contactPhone,
    decision_maker: input.decisionMaker,
    platforms: input.platforms,
    notes: input.notes,
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update(fields)
    .eq("id", input.clientId)
    .select("id");
  if (error || !data?.length)
    return { error: "The changes couldn't be saved. Try again." };
  return { ok: "Saved." };
}

export type ClientAccountInput = {
  clientId: string;
  status: ClientStatus;
  accountExecId: string;
  serviceId: string;
  startDate: string | null;
  endDate: string | null;
};

export async function updateClientAccount(
  input: ClientAccountInput,
): Promise<DataResult> {
  const current = await getClient(input.clientId);
  if (!current) return { error: "That client doesn't exist." };

  if (
    !(await accountExecIsActive(input.accountExecId)) &&
    input.accountExecId !== current.account_exec_id
  ) {
    // Keeping a deactivated account exec already assigned is allowed; choosing one newly is not.
    return { fieldErrors: { accountExecId: "Choose an active account exec." } };
  }

  let monthlyFee = current.monthly_fee;
  if (input.serviceId !== current.service_id) {
    const service = await activeService(input.serviceId);
    if (!service)
      return { fieldErrors: { serviceId: "Choose an active service." } };
    monthlyFee = service.price; // copied at the moment the service is assigned
  }

  const today = todayInGaborone();
  const startDate =
    input.startDate ??
    (input.status === "active" ? (current.start_date ?? today) : null);
  const endDate =
    input.endDate ??
    (input.status === "ended" ? (current.end_date ?? today) : null);
  if (startDate && endDate && endDate < startDate) {
    return {
      fieldErrors: { endDate: "The end date can't be before the start date." },
    };
  }

  const fields = {
    status: input.status,
    account_exec_id: input.accountExecId,
    service_id: input.serviceId,
    monthly_fee: monthlyFee,
    start_date: startDate,
    end_date: endDate,
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update(fields)
    .eq("id", input.clientId);
  if (error) {
    if (error.code === "P0001")
      return { fieldErrors: { status: error.message } };
    return { error: "The changes couldn't be saved. Try again." };
  }
  return { ok: "Saved." };
}

const LOGIN_NOT_ALLOWED =
  "Only the CEO or this client's account exec can manage client logins.";

/** CEO or the client's own account exec. */
export async function createLoginForClient(input: {
  clientId: string;
  fullName: string;
  email: string;
}): Promise<DataResult> {
  // The RLS read is what proves an account exec is assigned to the client.
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("clients")
    .select(
      "id, name, account_exec:profiles!clients_account_exec_id_fkey(full_name)",
    )
    .eq("id", input.clientId)
    .maybeSingle();
  if (!c) return { error: LOGIN_NOT_ALLOWED };

  const result = await createClientLogin({
    clientId: c.id,
    clientName: c.name,
    accountExecName: c.account_exec?.full_name ?? null,
    fullName: input.fullName,
    email: input.email,
  });
  return result.ok ? { ok: result.message } : { error: result.error };
}

/** Returns the client id on success, so the caller can refresh the page. */
export async function setClientLoginActive(
  clientUserId: string,
  active: boolean,
): Promise<DataResult> {
  const message = active
    ? "Login switched back on."
    : "Login switched off. They can no longer sign in.";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_users")
    .update({ active })
    .eq("id", clientUserId)
    .select("user_id, client_id");
  if (error || !data?.length) return { error: LOGIN_NOT_ALLOWED };
  const [row] = data;
  if (!(await setSignInBlocked(row.user_id, !active))) {
    await supabase
      .from("client_users")
      .update({ active: !active })
      .eq("id", clientUserId);
    return {
      error: "Sign-in couldn't be updated, so nothing was changed. Try again.",
    };
  }
  return { ok: message, id: row.client_id };
}
