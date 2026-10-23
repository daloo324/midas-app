import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

export const SAMPLE_PASSWORD = "midas-local-2026";

export const STAFF = {
  ceo: "ceo@example.com",
  ae1: "ae.one@example.com",
  ae2: "ae.two@example.com",
  cd: "creative.director@example.com",
  designer: "designer@example.com",
} as const;

export const CLIENT_LOGIN_ID = "MM-SCC-1001";
export const CLIENT_EMAIL = "client.coffee@example.com";

const OUTBOX = path.resolve("test-results/outbox");

/** Service-role client for test setup and clean-up only. */
export function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function clearLoginAttempts(loginId: string) {
  await admin().from("login_attempts").delete().eq("login_id", loginId);
}

export function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@example.com`;
}

export async function signInStaff(
  page: Page,
  email: string,
  password = SAMPLE_PASSWORD,
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function signInClient(
  page: Page,
  loginId: string,
  password = SAMPLE_PASSWORD,
) {
  await page.goto("/portal/login");
  await page.getByLabel("Client ID").fill(loginId);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

type OutboxEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  sentAt: string;
};

async function emailsTo(to: string): Promise<OutboxEmail[]> {
  let files: string[] = [];
  try {
    files = await readdir(OUTBOX);
  } catch {
    return [];
  }
  const emails = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(
        async (f) =>
          JSON.parse(
            await readFile(path.join(OUTBOX, f), "utf8"),
          ) as OutboxEmail,
      ),
  );
  return emails
    .filter((e) => e.to === to)
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

/** Waits for the newest email to an address, sent after `since`. */
export async function waitForEmail(
  to: string,
  since: Date,
  timeoutMs = 15_000,
): Promise<OutboxEmail> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const latest = (await emailsTo(to))
      .filter((e) => new Date(e.sentAt) >= since)
      .at(-1);
    if (latest) return latest;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No email to ${to} arrived`);
}

export async function countEmailsTo(to: string, since: Date) {
  return (await emailsTo(to)).filter((e) => new Date(e.sentAt) >= since).length;
}

export function linkIn(email: OutboxEmail): string {
  const match = email.text.match(/https?:\/\/\S+\/set-password\?\S+/);
  if (!match) throw new Error("No set-password link in email");
  return match[0];
}

export async function setNewPassword(
  page: Page,
  link: string,
  password: string,
) {
  await page.goto(link);
  await page.getByLabel("New password").fill(password);
  await page.getByLabel("Type it again").fill(password);
  await page.getByRole("button", { name: "Save password and sign in" }).click();
}

export async function expectNoAccess(page: Page) {
  await expect(
    page.getByRole("heading", { name: "You don't have access to this area" }),
  ).toBeVisible();
}
