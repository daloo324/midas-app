// Loads environment for one-off scripts. Default .env.local (your laptop);
// pass --env .env.hosted.local to act on the hosted Supabase project.
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

export function loadScriptEnv() {
  const i = process.argv.indexOf("--env");
  const file = i > -1 ? process.argv[i + 1] : ".env.local";
  const result = config({ path: file, quiet: true });
  if (result.error) throw new Error(`Couldn't read ${file}`);
  return file;
}

export function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing from the env file.`);
  return value;
}

export function serviceClient() {
  return createClient(
    need("NEXT_PUBLIC_SUPABASE_URL"),
    need("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
