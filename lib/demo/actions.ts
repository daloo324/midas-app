"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { homeFor } from "@/lib/auth/routes";
import { demoUserById, startDemoSession } from "./auth";
import { isDemoMode } from "./mode";

/** "Sign in as…" buttons on the sign-in pages, demo mode only. */
export async function signInAsDemoUser(formData: FormData) {
  if (!isDemoMode()) redirect("/login");
  const parsed = z
    .object({ userId: z.uuid() })
    .safeParse(Object.fromEntries(formData));
  const user = parsed.success ? demoUserById(parsed.data.userId) : null;
  if (!user) redirect("/login");
  await startDemoSession(user.id);
  redirect(homeFor(user.role));
}
