import { expect, test } from "@playwright/test";
import {
  STAFF,
  admin,
  clearLoginAttempts,
  countEmailsTo,
  expectNoAccess,
  linkIn,
  setNewPassword,
  signInClient,
  signInStaff,
  uniqueEmail,
  waitForEmail,
} from "./helpers";

test("the CEO creates a client and a client login; the welcome email carries the login ID", async ({
  page,
  browser,
}) => {
  const name = `Test Bakery ${Date.now()}`;
  await signInStaff(page, STAFF.ceo);
  await page.goto("/admin/clients/new");
  await page.getByLabel("Business name").fill(name);
  await page
    .getByLabel("Account exec")
    .selectOption({ label: "Sample Account Exec Two" });
  await page.getByRole("button", { name: "Create client" }).click();

  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(
    page.getByText("Onboarding", { exact: true }).first(),
  ).toBeVisible();
  // "Test Bakery 123": two words, digits dropped -> TE + B.
  const code = (await page
    .getByText(/^MM-[A-Z]{3}-\d{4}$/)
    .first()
    .textContent())!.trim();
  expect(code).toMatch(/^MM-TEB-\d{4}$/);

  const email = uniqueEmail("bakery.owner");
  const since = new Date();
  await page.getByLabel("Contact name").last().fill("Bakery Owner");
  await page.getByLabel("Contact email").last().fill(email);
  await page
    .getByRole("button", { name: "Create login and send welcome email" })
    .click();
  await expect(
    page.getByText(`Login ${code} created. Welcome email sent to ${email}.`),
  ).toBeVisible();

  const mail = await waitForEmail(email, since);
  expect(mail.subject).toBe("Your Midas Media client portal");
  expect(mail.text).toContain(`Your client ID: ${code}`);
  expect(mail.text).not.toMatch(/password:\s*\S/i);

  const client = await browser.newPage();
  await setNewPassword(client, linkIn(mail), "bakery-pass-123");
  await expect(client).toHaveURL("/portal");
  await client.getByRole("button", { name: "Sign out" }).click();
  await clearLoginAttempts(code);
  await signInClient(client, code, "bakery-pass-123");
  await expect(client).toHaveURL("/portal");

  // A second login for the same client gets the -2 suffix.
  const second = uniqueEmail("bakery.manager");
  await page.getByLabel("Contact name").last().fill("Bakery Manager");
  await page.getByLabel("Contact email").last().fill(second);
  await page
    .getByRole("button", { name: "Create login and send welcome email" })
    .click();
  await expect(
    page.getByText(`Login ${code}-2 created.`, { exact: false }),
  ).toBeVisible();
});

test("client password reset by login ID never says whether the ID exists", async ({
  page,
}) => {
  // A throwaway client login, so the sample password stays the same.
  const service = admin();
  const { data: c } = await service
    .from("clients")
    .insert({ name: "Reset Test Shop" })
    .select("id, client_code")
    .single();
  const email = uniqueEmail("reset.client");
  const { data: u } = await service.auth.admin.createUser({
    email,
    password: "old-password-123",
    email_confirm: true,
  });
  await service.from("client_users").insert({
    user_id: u.user!.id,
    client_id: c!.id,
    full_name: "Reset Client",
    email,
  });

  const since = new Date();
  for (const id of [c!.client_code, "MM-ZZZ-0001"]) {
    await page.goto("/portal/login/forgot");
    await page.getByLabel("Client ID").fill(id);
    await page.getByRole("button", { name: "Email me a reset link" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "If that ID exists, we've emailed a reset link.",
    );
  }

  const mail = await waitForEmail(email, since);
  expect(mail.text).toContain(c!.client_code);
  await setNewPassword(page, linkIn(mail), "new-password-456");
  await expect(page).toHaveURL("/portal");
  expect(await countEmailsTo("nobody@example.com", since)).toBe(0);
});

test("activating past the client limit is refused with the reason", async ({
  page,
}) => {
  const service = admin();
  const { count } = await service
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");
  await service
    .from("settings")
    .update({ max_active_clients: count ?? 0 })
    .eq("id", 1);
  try {
    await signInStaff(page, STAFF.ceo);
    await page.goto("/admin/clients?status=onboarding");
    await page.getByRole("link", { name: "Demo Fitness Studio" }).click();
    await expect(
      page.getByRole("heading", { name: "Demo Fitness Studio" }),
    ).toBeVisible();
    await page.getByLabel("Status").selectOption("active");
    await page.getByRole("button", { name: "Save account" }).click();
    await expect(page.getByText(/which is the limit/)).toBeVisible();
  } finally {
    await service
      .from("settings")
      .update({ max_active_clients: 10 })
      .eq("id", 1);
  }
});

test("account execs can't open the CEO's client pages", async ({ page }) => {
  await signInStaff(page, STAFF.ae1);
  await page.goto("/admin/clients");
  await expectNoAccess(page);
});
