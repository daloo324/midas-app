import { expect, test } from "@playwright/test";
import { STAFF, signInStaff } from "./helpers";

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
    for (const path of ["/admin", "/admin/team", "/admin/clients"]) {
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
