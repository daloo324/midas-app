import { expect, test } from "@playwright/test";
import { signInStaff } from "./helpers";

// Runs on desktop and phone: nothing scrolls sideways, and dark mode follows the device.
for (const scheme of ["light", "dark"] as const) {
  test(`pages fit the screen in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const check = async (path: string) => {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);
    };
    await check("/login");
    await check("/portal/login");
    await signInStaff(page, "ceo@example.com");
    for (const path of [
      "/admin",
      "/admin/team",
      "/admin/clients",
      "/admin/clients/20000000-0000-4000-8000-000000000001",
      "/creative",
      "/accounts",
    ]) {
      await check(path);
    }
    const bg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(bg).toBe(
      scheme === "dark" ? "rgb(11, 26, 33)" : "rgb(242, 244, 245)",
    );
  });
}
