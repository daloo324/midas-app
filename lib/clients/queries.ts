import "server-only";
import { createClient } from "@/lib/supabase/server";

// Reads run as the signed-in user, so RLS decides what comes back.

export async function listAccountExecs() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, active")
    .eq("role", "account_exec")
    .order("full_name");
  return data ?? [];
}

export async function listServices() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("id, name, price, unit, active")
    .order("sort")
    .order("name");
  return data ?? [];
}

export async function activeClientCapacity() {
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
