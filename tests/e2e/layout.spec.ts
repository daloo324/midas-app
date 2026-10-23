import { expect, test } from "@playwright/test";
import { admin, STAFF, signInStaff } from "./helpers";

// Runs on desktop and phone: no sideways scrolling, and dark mode follows the device.

for (const scheme of ["light", "dark"] as const) {
  test(`pages fit the screen in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    for (const path of ["/login", "/portal/login"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);
    }
    await signInStaff(page, STAFF.ceo);
    // The Account Desk, with a started month for the sample active client.
    const { data: c } = await admin()
      .from("clients")
      .select("id")
      .eq("client_code", "MM-SCC-1001")
      .single();
    // Start this month through the page if it isn't started yet.
    const month = new Date()
      .toLocaleDateString("en-CA", { timeZone: "Africa/Gaborone" })
      .slice(0, 7);
    await page.goto(`/accounts/clients/${c!.id}/calendar?month=${month}`);
    const start = page.getByRole("button", { name: /^Start / });
    if (await start.isVisible()) {
      await start.click();
      await expect(page.getByRole("cell", { name: "P01" })).toBeVisible();
    }
    const desk = [
      `/accounts/clients/${c!.id}/profile`,
      `/accounts/clients/${c!.id}/onboarding`,
      "/accounts/notifications",
      ...["", "/calendar", "/campaign", "/kpis"].map(
        (tab) => `/accounts/clients/${c!.id}${tab}?month=${month}`,
      ),
    ];
    for (const path of [
      "/admin",
      "/admin/team",
      "/admin/clients",
      "/accounts",
      ...desk,
    ]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);
    }
    const bg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(bg).toBe(
      scheme === "dark" ? "rgb(11, 26, 33)" : "rgb(242, 244, 245)",
    );
  });
}
