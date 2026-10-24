import { expect, test } from "@playwright/test";
import { admin, countEmailsTo, uniqueEmail, waitForEmail } from "./helpers";

// The scheduled jobs (07-integrations.md): protected by CRON_SECRET, and
// safe to run twice for the same day.

const AUTH = { authorization: "Bearer test-cron-secret" };
const made: string[] = [];
let savedTerms: number | null = null;

test.afterAll(async () => {
  if (made.length)
    await admin()
      .from("clients")
      .update({
        status: "ended",
        end_date: new Date().toISOString().slice(0, 10),
      })
      .in("id", made);
  if (savedTerms !== null)
    await admin()
      .from("settings")
      .update({ payment_terms_days: savedTerms })
      .eq("id", 1);
});

test("jobs refuse calls without the secret", async ({ request }) => {
  expect((await request.get("/api/cron/cleanup")).status()).toBe(401);
  expect(
    (
      await request.get("/api/cron/cleanup", {
        headers: { authorization: "Bearer wrong" },
      })
    ).status(),
  ).toBe(401);
  expect(
    (await request.get("/api/cron/nope", { headers: AUTH })).status(),
  ).toBe(404);
});

test("the retainer run never makes a second draft for the same month", async ({
  request,
}) => {
  const first = await request.get("/api/cron/retainer-invoices", {
    headers: AUTH,
  });
  expect(first.status()).toBe(200);
  const again = await (
    await request.get("/api/cron/retainer-invoices", { headers: AUTH })
  ).json();
  expect(again).toMatchObject({ ok: true, result: { drafts: 0 } });
});

test("a due-soon reminder goes once, and never to a client with reminders off", async ({
  request,
}) => {
  const db = admin();
  const { data: s } = await db
    .from("settings")
    .select("payment_terms_days")
    .eq("id", 1)
    .single();
  savedTerms = s!.payment_terms_days;
  await db
    .from("settings")
    .update({ payment_terms_days: 3, reminders_enabled: true })
    .eq("id", 1);

  const issue = async (remindersEnabled: boolean) => {
    const email = uniqueEmail("p5.remind");
    const { data: c } = await db
      .from("clients")
      .insert({
        name: `E2E Reminder ${Date.now()}`,
        status: "onboarding",
        contact_email: email,
        reminders_enabled: remindersEnabled,
      })
      .select("id")
      .single();
    made.push(c!.id);
    const { data: inv } = await db
      .from("invoices")
      .insert({ client_id: c!.id })
      .select("id")
      .single();
    await db
      .from("invoice_lines")
      .insert({ invoice_id: inv!.id, name: "Work", unit_price: 250 });
    const { data: number, error } = await db.rpc("issue_invoice", {
      p_invoice_id: inv!.id,
    });
    expect(error).toBeNull();
    return { email, number: number as string };
  };
  const on = await issue(true);
  const off = await issue(false);

  const since = new Date();
  const run = await (
    await request.get("/api/cron/invoice-reminders", { headers: AUTH })
  ).json();
  expect(run.ok).toBe(true);
  const mail = await waitForEmail(on.email, since);
  expect(mail.subject).toBe(
    `Invoice ${on.number} is due on ${mail.subject.split(" is due on ")[1]}`,
  );
  expect(mail.text).toContain("P250.00");

  await request.get("/api/cron/invoice-reminders", { headers: AUTH });
  expect(await countEmailsTo(on.email, since)).toBe(1);
  expect(await countEmailsTo(off.email, since)).toBe(0);
});

test("approval nudges and the weekly clean-up run", async ({ request }) => {
  const db = admin();
  await db.from("login_attempts").insert({
    login_id: "MM-OLD-0001",
    succeeded: false,
    created_at: new Date(Date.now() - 40 * 86_400_000).toISOString(),
  });
  const nudges = await (
    await request.get("/api/cron/approval-nudges", { headers: AUTH })
  ).json();
  expect(nudges.ok).toBe(true);
  const clean = await (
    await request.get("/api/cron/cleanup", { headers: AUTH })
  ).json();
  expect(clean.ok).toBe(true);
  const { data } = await db
    .from("login_attempts")
    .select("login_id")
    .eq("login_id", "MM-OLD-0001");
  expect(data).toEqual([]);
});
