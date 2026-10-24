import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { admin, SAMPLE_PASSWORD, signInStaff, STAFF } from "./helpers";

// The shared font library on Fonts & pairings: the creative director adds a
// downloaded font and a pairing; designers see and use them but can't change them.

// A real WOFF2 file (Geist, OFL licence) so the browser can load it.
const WOFF2 = readFileSync(
  join(
    process.cwd(),
    "node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
  ),
);
const family = `E2e Font ${Date.now().toString(36)}`;

test.afterAll(async () => {
  const db = admin();
  await db.from("library_pairings").delete().eq("heading_family", family);
  const { data } = await db
    .from("library_fonts")
    .delete()
    .eq("family", family)
    .select("storage_path");
  if (data?.length)
    await db.storage.from("fonts").remove(data.map((f) => f.storage_path));
});

test("the creative director adds a font and a pairing; designers use them", async ({
  page,
  browser,
}) => {
  await signInStaff(page, STAFF.cd);
  await page.goto("/creative/resources/fonts");
  await page.getByLabel(/^Font file/).setInputFiles({
    name: "MidasTest-BoldItalic.woff2",
    mimeType: "font/woff2",
    buffer: WOFF2,
  });
  // The name, weight and style are read from the file name.
  await expect(page.getByLabel("Font name")).toHaveValue("Midas Test");
  await expect(page.getByLabel("Weight")).toHaveValue("700");
  await expect(page.getByLabel("Italic")).toBeChecked();
  await page.getByLabel("Font name").fill(family);
  await page.getByLabel(/^Licence or source/).fill("OFL, from Google Fonts");
  await page.getByRole("button", { name: "Add to library" }).click();
  await expect(page.locator(".toast")).toContainText(
    `${family} added to the library.`,
  );
  const row = page.getByRole("row", { name: new RegExp(family) });
  await expect(row).toContainText("Bold italic");
  await expect(row).toContainText("OFL, from Google Fonts");
  // The browser really loads the uploaded file.
  await page.waitForFunction(
    (f) => document.fonts.check(`italic 700 18px "${f}"`, "I"),
    family,
  );

  await page.getByLabel("Heading font").selectOption(family);
  await page.getByLabel("Body font").selectOption("Lora");
  await page.getByLabel("Lettering style").selectOption("Handwritten");
  await page.getByLabel(/^Good for/).fill("E2e brands");
  await page.getByRole("button", { name: "Add pairing" }).click();
  await expect(page.locator(".toast")).toContainText(`${family} + Lora added.`);

  await page.goto("/creative/resources/fonts?style=Handwritten");
  const card = page.locator(".fcard", { hasText: "E2e brands" });
  await expect(card.locator(".pill", { hasText: "Library" })).toBeVisible();

  // A family can't go while a pairing uses it.
  await page.goto("/creative/resources/fonts");
  await page
    .getByRole("button", { name: `Remove ${family} Bold italic` })
    .click();
  await expect(page.locator(".toast.err")).toContainText(
    `Remove the pairings that use ${family} first.`,
  );

  // Designers see the library and can use the pairing, but not change it.
  const designer = await browser.newPage();
  await signInStaff(designer, STAFF.designer);
  await designer.goto("/creative/resources/fonts");
  const dcard = designer.locator(".fcard", { hasText: "E2e brands" });
  await expect(
    dcard.getByRole("button", { name: "Use for client" }),
  ).toBeVisible();
  await expect(dcard.getByRole("button", { name: /^Remove/ })).toHaveCount(0);
  await expect(
    designer.getByRole("heading", { name: "Add a font" }),
  ).toHaveCount(0);
  await expect(
    designer.getByRole("row", { name: new RegExp(family) }),
  ).toBeVisible();
  await designer.close();

  // The creative director removes the pairing, then the font and its file.
  await page.getByRole("button", { name: `Remove ${family} + Lora` }).click();
  await expect(page.locator(".toast").last()).toContainText("Pairing removed.");
  await page
    .getByRole("button", { name: `Remove ${family} Bold italic` })
    .click();
  await expect(page.locator(".toast").last()).toContainText(
    "Removed from the library.",
  );
  await expect(page.getByRole("row", { name: new RegExp(family) })).toHaveCount(
    0,
  );
  const { data: rows } = await admin()
    .from("library_fonts")
    .select("id")
    .eq("family", family);
  expect(rows).toEqual([]);
});

test("a designer can't add to the library through the API either", async () => {
  const as = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { error: signIn } = await as.auth.signInWithPassword({
    email: STAFF.designer,
    password: SAMPLE_PASSWORD,
  });
  expect(signIn).toBeNull();
  const upload = await as.storage
    .from("fonts")
    .upload(`${crypto.randomUUID()}/x.woff2`, WOFF2);
  expect(upload.error).not.toBeNull();
  const insert = await as
    .from("library_pairings")
    .insert({
      heading_family: "Lora",
      body_family: "Anton",
      style: "Classic serif",
    });
  expect(insert.error).not.toBeNull();
});
