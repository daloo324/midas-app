import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./config";
import type { Database } from "./database.types";

/**
 * The service-role client. It bypasses RLS, so it is only for the uses
 * CLAUDE.md rule 3 allows: the client-ID sign-in lookup and its rate limit,
 * Auth admin tasks (invites, deactivation, client logins, invite and reset
 * links), cron jobs and invoice numbering. Always check the caller's rights
 * with the user client before calling it.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createClient<Database>(supabaseUrl(), key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
