import { expect, type Locator, type Page } from "@playwright/test";

export const PASSWORD = "midas-demo-2026";
export const NO_ACCESS = "You don't have access to this area";

export async function signInStaff(
  page: Page,
  email: string,
  password = PASSWORD,
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await settled(page, "/login");
}

export async function signInClient(
  page: Page,
  loginId: string,
  password = PASSWORD,
) {
  await page.goto("/portal/login");
  await page.getByLabel("Client ID").fill(loginId);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await settled(page, "/portal/login");
}

export async function expectNoAccess(page: Page) {
  await expect(page.getByRole("heading", { name: NO_ACCESS })).toBeVisible();
}

/** The form's error message (not Next's hidden route announcer, which is also an alert). */
export function formAlert(page: Page): Locator {
  return page.locator(".err[role=alert], .notice.err[role=alert]");
}

/** Waits until a sign-in either leaves the sign-in page or shows an error. */
async function settled(page: Page, loginPath: string) {
  await Promise.race([
    page.waitForURL((url) => !url.pathname.startsWith(loginPath)),
    formAlert(page).first().waitFor(),
  ]);
}
