import { expect, test } from "@playwright/test";
import {
  STAFF,
  admin,
  countEmailsTo,
  expectNoAccess,
  linkIn,
  setNewPassword,
  signInStaff,
  uniqueEmail,
  waitForEmail,
  formAlert,
} from "./helpers";

test("the CEO invites a designer, who sets a password and lands in the Design Studio", async ({
  page,
  browser,
}) => {
  const email = uniqueEmail("new.designer");
  const name = `New Test Designer ${Date.now().toString(36)}`;
  await signInStaff(page, STAFF.ceo);
  await page.goto("/admin/team");

  const since = new Date();
  const invite = page.locator("form", {
    has: page.getByRole("button", { name: "Send invite", exact: true }),
  });
  await invite.getByLabel("Name").fill(name);
  await invite.getByLabel("Email").fill(email);
  await invite.getByLabel("Role").selectOption("designer");
  await invite
    .getByRole("button", { name: "Send invite", exact: true })
    .click();
  await expect(page.getByText(`Invite sent to ${email}.`)).toBeVisible();
  await expect(
    page
      .getByRole("row", { name: new RegExp(name) })
      .getByText("Invite pending"),
  ).toBeVisible();

  const mail = await waitForEmail(email, since);
  expect(mail.subject).toBe("You're invited to the Midas Media app");

  const newcomer = await browser.newPage();
  await setNewPassword(newcomer, linkIn(mail), "designer-pass-123");
  await expect(newcomer).toHaveURL("/creative");
  await newcomer.goto("/admin");
  await expectNoAccess(newcomer);

  // The link only works once.
  const again = await browser.newPage();
  await setNewPassword(again, linkIn(mail), "another-pass-123");
  await expect(formAlert(again)).toContainText("expired or was already used");

  // The CEO deactivates them: they can't sign in any more.
  await page.reload();
  const row = page.getByRole("row", { name: new RegExp(name) });
  await row.getByRole("button", { name: "Deactivate" }).click();
  await expect(row.getByText("Deactivated", { exact: true })).toBeVisible();
  const after = await browser.newPage();
  await signInStaff(after, email, "designer-pass-123");
  await expect(formAlert(after)).toHaveText(
    "That email and password don't match.",
  );
});

test("inviting an email that already has a login is refused", async ({
  page,
}) => {
  await signInStaff(page, STAFF.ceo);
  await page.goto("/admin/team");
  const invite = page.locator("form", {
    has: page.getByRole("button", { name: "Send invite", exact: true }),
  });
  await invite.getByLabel("Name").fill("Duplicate");
  await invite.getByLabel("Email").fill(STAFF.designer);
  await invite.getByLabel("Role").selectOption("designer");
  await invite
    .getByRole("button", { name: "Send invite", exact: true })
    .click();
  await expect(formAlert(page)).toHaveText(
    "That email already has a login. Use a different email address.",
  );
});

test("the CEO can't switch off their own account", async ({ page }) => {
  await signInStaff(page, STAFF.ceo);
  await page.goto("/admin/team");
  await expect(
    page.getByRole("row", { name: /Sample CEO/ }).getByText("This is you"),
  ).toBeVisible();
});

test("staff password reset never says whether the email exists", async ({
  page,
}) => {
  // A throwaway staff member, so the sample passwords stay the same.
  const email = uniqueEmail("reset.staff");
  const { data } = await admin().auth.admin.createUser({
    email,
    password: "old-password-123",
    email_confirm: true,
  });
  await admin().from("profiles").insert({
    id: data.user!.id,
    full_name: "Reset Tester",
    email,
    role: "designer",
  });

  const since = new Date();
  for (const address of [email, "nobody.here@example.com"]) {
    await page.goto("/login/forgot");
    await page.getByLabel("Email").fill(address);
    await page.getByRole("button", { name: "Email me a reset link" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "If that email has an account, we've emailed a reset link.",
    );
  }

  const mail = await waitForEmail(email, since);
  expect(await countEmailsTo("nobody.here@example.com", since)).toBe(0);
  await setNewPassword(page, linkIn(mail), "new-password-456");
  await expect(page).toHaveURL("/creative");

  await page.getByRole("button", { name: "Sign out" }).click();
  await signInStaff(page, email, "new-password-456");
  await expect(page).toHaveURL("/creative");
});

test("a set-password page without a valid link offers a new one", async ({
  page,
}) => {
  await page.goto("/set-password");
  await expect(
    page.getByRole("link", { name: "Get a new link" }),
  ).toBeVisible();
});
