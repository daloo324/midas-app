import { expect, test } from "@playwright/test";
import {
  CLIENT_LOGIN_ID,
  STAFF,
  clearLoginAttempts,
  expectNoAccess,
  signInClient,
  signInStaff,
} from "./helpers";

// Each role lands on its home area and is refused the others (01-auth-and-roles.md).

const cases = [
  {
    who: "CEO",
    email: STAFF.ceo,
    home: "/admin",
    allowed: ["/admin/team", "/accounts", "/creative"],
    refused: ["/portal"],
  },
  {
    who: "account exec",
    email: STAFF.ae1,
    home: "/accounts",
    allowed: [],
    refused: ["/admin", "/admin/clients", "/creative", "/portal"],
  },
  {
    who: "creative director",
    email: STAFF.cd,
    home: "/creative",
    allowed: ["/creative/review"],
    refused: ["/admin", "/accounts", "/portal"],
  },
  {
    who: "designer",
    email: STAFF.designer,
    home: "/creative",
    allowed: [],
    refused: ["/admin", "/admin/team", "/accounts", "/portal"],
  },
];

for (const c of cases) {
  test(`${c.who} lands on ${c.home} and is refused other areas`, async ({
    page,
  }) => {
    await signInStaff(page, c.email);
    await expect(page).toHaveURL(c.home);
    for (const path of c.allowed) {
      await page.goto(path);
      await expect(page).toHaveURL(path);
    }
    for (const path of c.refused) {
      await page.goto(path);
      await expectNoAccess(page);
    }
  });
}

test("a client lands on /portal and is refused every staff area", async ({
  page,
}) => {
  await clearLoginAttempts(CLIENT_LOGIN_ID);
  await signInClient(page, CLIENT_LOGIN_ID);
  await expect(page).toHaveURL("/portal");
  await expect(page.getByText(`Sample Coffee Co`)).toBeVisible();
  for (const path of ["/admin", "/accounts", "/creative"]) {
    await page.goto(path);
    await expectNoAccess(page);
  }
});

test("signed-out visitors are sent to the right sign-in page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL("/login");
  await page.goto("/admin/team");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fteam$/);
  await page.goto("/creative");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.goto("/portal/invoices");
  await expect(page).toHaveURL(/\/portal\/login\?next=%2Fportal%2Finvoices$/);
});

test("after sign-in, people return to the page they asked for", async ({
  page,
}) => {
  await page.goto("/admin/clients");
  await page.getByLabel("Email").fill(STAFF.ceo);
  await page.getByLabel("Password").fill("midas-local-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/admin/clients");
});

test("signing out ends the session", async ({ page }) => {
  await signInStaff(page, STAFF.cd);
  await expect(page).toHaveURL("/creative");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");
  await page.goto("/creative");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("planned pages say which phase they arrive in", async ({ page }) => {
  await signInStaff(page, STAFF.ceo);
  await page.goto("/admin/invoices");
  await expect(
    page.getByRole("heading", { name: "Coming in Phase 5" }),
  ).toBeVisible();
  await page.goto("/accounts");
  await expect(
    page.getByRole("heading", { name: "Coming in Phase 2" }),
  ).toBeVisible();
  await page.goto("/creative");
  await expect(
    page.getByRole("heading", { name: "Coming in Phase 3" }),
  ).toBeVisible();
});
