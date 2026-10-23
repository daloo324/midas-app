import { expect, test } from "@playwright/test";
import {
  expectNoAccess,
  signInClient,
  signInStaff,
  formAlert,
} from "./helpers";

// The Phase 1 review checklist, in demo mode (dummy logins, sample data).

test("every page says it's demo data", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("note")).toContainText("Demo mode");
  await expect(page.getByText("Demo logins")).toBeVisible();
});

const roles = [
  { email: "ceo@example.com", home: "/admin", refused: ["/portal"] },
  {
    email: "ae.one@example.com",
    home: "/accounts",
    refused: ["/admin", "/creative", "/portal"],
  },
  {
    email: "creative.director@example.com",
    home: "/creative",
    refused: ["/admin", "/accounts", "/portal"],
  },
  {
    email: "designer@example.com",
    home: "/creative",
    refused: ["/admin", "/accounts", "/portal"],
  },
];

for (const r of roles) {
  test(`${r.email} lands on ${r.home} and is refused other areas`, async ({
    page,
  }) => {
    await signInStaff(page, r.email);
    await expect(page).toHaveURL(r.home);
    for (const path of r.refused) {
      await page.goto(path);
      await expectNoAccess(page);
    }
  });
}

test("one-click demo sign-in works", async ({ page }) => {
  await page.goto("/login");
  await page
    .locator("form", { hasText: "Sample Creative Director" })
    .getByRole("button", { name: "Sign in as this person" })
    .click();
  await expect(page).toHaveURL("/creative");
  await expect(page.getByText("Sample Creative Director")).toBeVisible();
});

test("the client signs in by client ID; wrong ID and wrong password look identical", async ({
  page,
}) => {
  await signInClient(page, "MM-ZZZ-0001");
  const unknownId = (await formAlert(page).textContent())?.trim();
  await signInClient(page, "MM-EAP-1003", "wrong-password");
  const wrongPassword = (await formAlert(page).textContent())?.trim();
  expect(unknownId).toBe("That client ID and password don't match.");
  expect(wrongPassword).toBe(unknownId);

  await signInClient(page, " mm-scc-1001 ");
  await expect(page).toHaveURL("/portal");
  await expect(page.getByText("Sample Coffee Co")).toBeVisible();
  for (const path of ["/admin", "/accounts", "/creative"]) {
    await page.goto(path);
    await expectNoAccess(page);
  }
});

test("five wrong passwords lock the client ID, even for the right password", async ({
  page,
}) => {
  for (let i = 0; i < 5; i++)
    await signInClient(page, "MM-DFS-1002", `wrong-${i}`);
  await signInClient(page, "MM-DFS-1002");
  await expect(formAlert(page)).toHaveText(
    "That client ID and password don't match.",
  );
});

test("signed-out visitors go to the right sign-in page; sign-out works", async ({
  page,
}) => {
  await page.goto("/admin/team");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fteam/);
  await page.goto("/portal/account");
  await expect(page).toHaveURL(/\/portal\/login\?next=/);

  await signInStaff(page, "ceo@example.com");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("the CEO invites, changes a role and deactivates staff", async ({
  page,
  browser,
}) => {
  await signInStaff(page, "ceo@example.com");
  await page.goto("/admin/team");
  const invite = page.locator("form", {
    has: page.getByRole("button", { name: "Send invite" }),
  });
  await invite.getByLabel("Name").fill("Demo New Designer");
  await invite.getByLabel("Email").fill("new.designer@example.com");
  await invite.getByLabel("Role").selectOption("designer");
  await invite.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText("Demo New Designer was added.")).toBeVisible();
  const row = page.getByRole("row", { name: /Demo New Designer/ });
  await expect(row.getByText("Invite pending")).toBeVisible();

  await row.getByLabel("Role").selectOption("creative_director");
  await row.getByRole("button", { name: "Change role" }).click();
  await expect(row.getByText("Role changed.")).toBeVisible();

  // The designer is switched off and can no longer sign in.
  const designer = page.getByRole("row", { name: /Sample Designer/ });
  await designer.getByRole("button", { name: "Deactivate" }).click();
  await expect(
    designer.getByText("Deactivated", { exact: true }),
  ).toBeVisible();
  const other = await browser.newPage();
  await signInStaff(other, "designer@example.com");
  await expect(formAlert(other)).toHaveText(
    "That email and password don't match.",
  );
  await designer.getByRole("button", { name: "Reactivate" }).click();
  await expect(designer.getByText("Active", { exact: true })).toBeVisible();
});

test("the CEO creates a client and a client login with its own ID", async ({
  page,
  browser,
}) => {
  await signInStaff(page, "ceo@example.com");
  await page.goto("/admin/clients/new");
  await page.getByLabel("Business name").fill("Kgosi Coffee");
  await page
    .getByLabel("Account exec")
    .selectOption({ label: "Sample Account Exec Two" });
  await page.getByRole("button", { name: "Create client" }).click();
  await expect(
    page.getByRole("heading", { name: "Kgosi Coffee" }),
  ).toBeVisible();
  const code = (await page.getByText(/^MM-KGC-\d{4}$/).textContent())!.trim();

  await page.getByLabel("Contact name").last().fill("Kgosi Owner");
  await page.getByLabel("Contact email").last().fill("kgosi.owner@example.com");
  await page
    .getByRole("button", { name: "Create login and send welcome email" })
    .click();
  await expect(page.getByText(`Login ${code} created.`)).toBeVisible();

  const client = await browser.newPage();
  await signInClient(client, code);
  await expect(client).toHaveURL("/portal");
  await expect(client.getByText("Kgosi Coffee")).toBeVisible();
});

test("activating past the client limit is refused with the reason", async ({
  page,
}) => {
  await signInStaff(page, "ceo@example.com");
  // Fill the limit: the sample data has 2 active clients of 10.
  for (let i = 0; i < 8; i++) {
    await page.goto("/admin/clients/new");
    await page.getByLabel("Business name").fill(`Filler Client ${i}`);
    await page
      .getByLabel("Account exec")
      .selectOption({ label: "Sample Account Exec One" });
    await page.getByRole("button", { name: "Create client" }).click();
    await expect(
      page.getByRole("heading", { name: `Filler Client ${i}` }),
    ).toBeVisible();
    await page.getByLabel("Status").selectOption("active");
    await page.getByRole("button", { name: "Save account" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
  }
  await page.goto("/admin/clients");
  await expect(page.getByText("10 of 10 active")).toBeVisible();
  await page.goto("/admin/clients?status=onboarding");
  await page.getByRole("link", { name: "Demo Fitness Studio" }).click();
  await expect(
    page.getByRole("heading", { name: "Demo Fitness Studio" }),
  ).toBeVisible();
  await page.getByLabel("Status").selectOption("active");
  await page.getByRole("button", { name: "Save account" }).click();
  await expect(
    page.getByText(/You already have 10 active clients, which is the limit/),
  ).toBeVisible();
});
