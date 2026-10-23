"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./session";
import { CLIENT_LOGIN, STAFF_LOGIN } from "./routes";

export async function signOut() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(user?.kind === "client" ? CLIENT_LOGIN : STAFF_LOGIN);
}
