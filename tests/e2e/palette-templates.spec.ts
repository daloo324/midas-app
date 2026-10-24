import { expect, test } from "@playwright/test";
import { admin, signInStaff, STAFF } from "./helpers";

// Palette templates in the palette builder: the creative director adds and
// removes them; designers use them but can't change them.

const name = `E2e palette ${Date.now().toString(36)}`;

test.afterAll(async () => {
  await admin().from("palette_templates").delete().eq("name", name);
});

test("the creative director adds a template and removes it; designers only use them", async ({
  page,
  browser,
}) => {
  await signInStaff(page, STAFF.cd);
  await page.goto("/creative/resources/palette");
  await page.getByLabel("Primary colour").fill("#5a2e1e");
  await page.getByLabel("Accent colour").fill("#2e7d4f");
  await page.getByLabel("Save these colours as a template").fill(name);
  await page.getByRole("button", { name: "Add template" }).click();
  await expect(page.locator(".toast")).toContainText(
    `${name} added to the templates.`,
  );
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row.getByText("Not used")).toBeVisible();
  const { data } = await admin()
    .from("palette_templates")
    .select("primary_color, accent_color")
    .eq("name", name)
    .single();
  expect(data).toEqual({ primary_color: "#5A2E1E", accent_color: "#2E7D4F" });

  // The same name twice is refused.
  await page.getByLabel("Save these colours as a template").fill(name);
  await page.getByRole("button", { name: "Add template" }).click();
  await expect(page.locator(".toast.err")).toContainText(
    `There's already a template called ${name}.`,
  );

  // Designers can start from it but see no way to change the list.
  const designer = await browser.newPage();
  await signInStaff(designer, STAFF.designer);
  await designer.goto("/creative/resources/palette");
  await designer.getByRole("button", { name }).click();
  await expect(designer.getByLabel("Primary colour")).toHaveValue("#5a2e1e");
  await expect(
    designer.getByRole("button", { name: "Add template" }),
  ).toHaveCount(0);
  await expect(designer.getByRole("button", { name: /^Remove/ })).toHaveCount(
    0,
  );
  await designer.close();

  await row.getByRole("button", { name: `Remove ${name}` }).click();
  await expect(page.locator(".toast").last()).toContainText(`${name} removed.`);
  await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(
    0,
  );
});
