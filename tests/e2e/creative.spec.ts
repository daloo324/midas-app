import { unzipSync } from "fflate";
import { expect, test, type Page } from "@playwright/test";
import {
  admin,
  clearLoginAttempts,
  signInClient,
  signInStaff,
  STAFF,
  uniqueEmail,
} from "./helpers";

// The Design Studio (04-creative.md acceptance criteria and the Phase 3 review checklist).

const PASSWORD = "phase3-test-password";
const made: string[] = [];
let savedMax: number | null = null;

// Tiny real files for each kind of slot.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVQI12P8z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==",
  "base64",
);
const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#0E2A36"/></svg>',
);
const PDF = Buffer.from("%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const FONT = Buffer.from("wOF2fake-font-bytes");

async function staffId(email: string) {
  const { data } = await admin()
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();
  return data!.id as string;
}

async function makeClient(
  status: "onboarding" | "active" = "onboarding",
  kitApproved = false,
) {
  const { data, error } = await admin()
    .from("clients")
    .insert({
      name: `Studio Test ${Date.now().toString(36)}`,
      status,
      account_exec_id: await staffId(STAFF.ae1),
      platforms: ["facebook", "instagram"],
    })
    .select("id, name")
    .single();
  if (error) throw error;
  made.push(data.id);
  if (kitApproved)
    await admin()
      .from("brand_kits")
      .update({ status: "approved" })
      .eq("client_id", data.id);
  return data as { id: string; name: string };
}

async function makeLogin(clientId: string) {
  const db = admin();
  const email = uniqueEmail("p3.client");
  const { data: user, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const { data } = await db
    .from("client_users")
    .insert({
      user_id: user.user.id,
      client_id: clientId,
      full_name: "Studio Contact",
      email,
    })
    .select("login_id")
    .single();
  await clearLoginAttempts(data!.login_id);
  return data!.login_id as string;
}

/** An active client with a started, approved month, via the account exec's pages. */
async function clientWithApprovedMonth(page: Page) {
  const c = await makeClient("active", true);
  const now = new Date();
  const ym = now
    .toLocaleDateString("en-CA", { timeZone: "Africa/Gaborone" })
    .slice(0, 7);
  await signInStaff(page, STAFF.ae1);
  await page.goto(`/accounts/clients/${c.id}/calendar?month=${ym}`);
  await page.getByRole("button", { name: /^Start / }).click();
  await expect(page.getByRole("cell", { name: "P01" })).toBeVisible();
  const { data: items } = await admin()
    .from("content_items")
    .select("id, slot_code")
    .eq("client_id", c.id);
  for (const i of items ?? [])
    await admin()
      .from("content_items")
      .update({ topic: `Topic ${i.slot_code}` })
      .eq("id", i.id);
  await admin()
    .from("content_months")
    .update({ plan_status: "approved" })
    .eq("client_id", c.id);
  await page.getByRole("button", { name: "Sign out" }).click();
  return { client: c, month: ym, items: items! };
}

async function upload(
  page: Page,
  label: string,
  name: string,
  buffer: Buffer,
  mimeType: string,
) {
  await page
    .getByLabel(label, { exact: true })
    .setInputFiles({ name, mimeType, buffer });
}

test.beforeAll(async () => {
  const { data } = await admin()
    .from("settings")
    .select("max_active_clients")
    .eq("id", 1)
    .single();
  savedMax = data!.max_active_clients;
  await admin()
    .from("settings")
    .update({ max_active_clients: 1000 })
    .eq("id", 1);
});

test.afterAll(async () => {
  if (made.length)
    await admin()
      .from("clients")
      .update({
        status: "ended",
        end_date: new Date().toISOString().slice(0, 10),
      })
      .in("id", made);
  if (savedMax !== null)
    await admin()
      .from("settings")
      .update({ max_active_clients: savedMax })
      .eq("id", 1);
});

test("a designer builds a brand kit; slots refuse the wrong file type; the zip has every file", async ({
  page,
  request,
}) => {
  const c = await makeClient();
  await signInStaff(page, STAFF.designer);
  await page.goto(`/creative/clients/${c.id}/kit`);
  await expect(
    page.getByRole("heading", { name: "Brand kit", exact: true }),
  ).toBeVisible();

  // Wrong type: a PNG into the SVG logo slot.
  await upload(
    page,
    "Logo Full colour · SVG: upload",
    "logo.png",
    PNG,
    "image/png",
  );
  await expect(page.locator(".toast.err")).toContainText(
    "That slot takes SVG files only.",
  );

  for (const [variant, label] of [
    ["full", "Full colour"],
    ["black", "Black"],
    ["white", "White"],
  ] as const) {
    await upload(
      page,
      `Logo ${label} · SVG: upload`,
      `logo-${variant}.svg`,
      SVG,
      "image/svg+xml",
    );
    await expect(
      page
        .locator(`[data-slot="logo_${variant}_svg"]`)
        .getByText(`logo-${variant}.svg`),
    ).toBeVisible();
  }
  await upload(
    page,
    "Logo Full colour · PNG: upload",
    "logo.png",
    PNG,
    "image/png",
  );
  await expect(
    page.locator('[data-slot="logo_full_png"]').getByText("logo.png"),
  ).toBeVisible();
  // The icon grid has the same labels, so use the icon slot directly.
  await page.locator('[data-slot="icon_full_pdf"] input').setInputFiles({
    name: "icon.pdf",
    mimeType: "application/pdf",
    buffer: PDF,
  });
  await expect(
    page.locator('[data-slot="icon_full_pdf"]').getByText("icon.pdf"),
  ).toBeVisible();
  await upload(
    page,
    "Heading font Bold · 700: upload",
    "Heading-Bold.woff2",
    FONT,
    "font/woff2",
  );
  await expect(
    page
      .locator('[data-slot="font_heading_700"]')
      .getByText("Heading-Bold.woff2"),
  ).toBeVisible();
  await page.locator('[data-slot="guide_pdf"] input').setInputFiles({
    name: "guide.pdf",
    mimeType: "application/pdf",
    buffer: PDF,
  });
  await expect(
    page.locator('[data-slot="guide_pdf"]').getByText("guide.pdf"),
  ).toBeVisible();
  await page.getByLabel("Add patterns and extras").setInputFiles([
    { name: "pattern.png", mimeType: "image/png", buffer: PNG },
    { name: "pattern.png", mimeType: "image/png", buffer: PNG },
  ]);
  await expect(page.getByText("2 files added.")).toBeVisible();

  // Replacing a file removes the old one from storage.
  const { data: before } = await admin()
    .from("brand_kit_files")
    .select("storage_path")
    .eq("client_id", c.id)
    .eq("slot", "logo_full_png")
    .single();
  await page
    .locator('[data-slot="logo_full_png"] input')
    .setInputFiles({ name: "logo-v2.png", mimeType: "image/png", buffer: PNG });
  await expect(
    page.locator('[data-slot="logo_full_png"]').getByText("logo-v2.png"),
  ).toBeVisible();
  const { data: gone } = await admin()
    .storage.from("brand-kits")
    .download(before!.storage_path);
  expect(gone).toBeNull();

  // Colours and fonts.
  await page
    .getByLabel("Start from a pairing")
    .selectOption({ label: "Fraunces + Figtree" });
  await expect
    .poll(
      async () =>
        (
          await admin()
            .from("brand_kits")
            .select("heading_font, body_font")
            .eq("client_id", c.id)
            .single()
        ).data,
    )
    .toEqual({ heading_font: "Fraunces", body_font: "Figtree" });
  await page.getByLabel("Primary colour").fill("#123456");
  await expect
    .poll(
      async () =>
        (
          (
            await admin()
              .from("brand_kits")
              .select("colors")
              .eq("client_id", c.id)
              .single()
          ).data?.colors as Record<string, string>
        )?.primary,
    )
    .toBe("#123456");

  // The zip: every file in the right folder with the right name.
  const res = await request.get(`/creative/clients/${c.id}/kit/download`, {
    headers: {
      cookie: (await page.context().cookies())
        .map((k) => `${k.name}=${k.value}`)
        .join("; "),
    },
  });
  expect(res.status()).toBe(200);
  expect(res.headers()["content-disposition"]).toContain("-Brand-Kit.zip");
  const names = Object.keys(unzipSync(new Uint8Array(await res.body()))).sort();
  const safe = c.name.replace(/[^A-Za-z0-9]+/g, "-");
  expect(names).toEqual(
    [
      "Brand-Guide/" + safe + "_Brand-Guide.pdf",
      "Colours-and-fonts.txt",
      "Fonts/Heading-Bold-Heading-Bold.woff2",
      "Icon/" + safe + "_Icon_Full-colour.pdf",
      "Logo/" + safe + "_Logo_Black.svg",
      "Logo/" + safe + "_Logo_Full-colour.png",
      "Logo/" + safe + "_Logo_Full-colour.svg",
      "Logo/" + safe + "_Logo_White.svg",
      "Patterns-and-extras/pattern-2.png",
      "Patterns-and-extras/pattern.png",
    ].sort(),
  );
});

test("only the creative director sends the kit to the client; the client signs it off and the files appear", async ({
  page,
  browser,
}) => {
  const c = await makeClient();
  const loginId = await makeLogin(c.id);
  const files = [
    ["logo_full_png", "logo.png", PNG],
    ["font_body_400", "body.woff2", FONT],
  ] as const;
  for (const [slot, name, buf] of files) {
    const path = `${c.id}/${slot}/${name}`;
    await admin().storage.from("brand-kits").upload(path, buf);
    await admin().from("brand_kit_files").insert({
      client_id: c.id,
      slot,
      storage_path: path,
      file_name: name,
      size_bytes: buf.length,
    });
  }

  await signInStaff(page, STAFF.designer);
  await page.goto(`/creative/clients/${c.id}/kit`);
  await page.getByRole("button", { name: "Start design" }).click();
  await page.getByRole("button", { name: "Send for internal review" }).click();
  await expect(
    page.getByText("Internal review", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send to client" }),
  ).toHaveCount(0);

  const client = await browser.newPage();
  await signInClient(client, loginId, PASSWORD);
  await client.goto("/portal/assets");
  await expect(
    client.getByText("Your brand kit is being designed."),
  ).toBeVisible();

  const cd = await browser.newPage();
  await signInStaff(cd, STAFF.cd);
  await cd.goto(`/creative/clients/${c.id}/kit`);
  await cd.getByRole("button", { name: "Send to client" }).click();
  await expect(cd.getByText("Sent to the client for sign-off.")).toBeVisible();

  // The board is still locked.
  await cd.goto(`/creative/clients/${c.id}/board`);
  await expect(
    cd.getByRole("heading", {
      name: "Content creation opens after brand kit sign-off",
    }),
  ).toBeVisible();

  await client.goto("/portal/approvals");
  await expect(
    client.getByRole("heading", { name: "Your brand kit" }),
  ).toBeVisible();
  await expect(
    client.getByRole("img", { name: "Logo, full colour" }),
  ).toBeVisible();
  await client.getByRole("button", { name: "Approve" }).click();
  await expect(
    client.getByText(
      "Signed off. Your brand assets are in the Brand assets tab now.",
    ),
  ).toBeVisible();
  await client.goto("/portal/assets");
  await expect(
    client.getByRole("heading", { name: "Brand assets" }),
  ).toBeVisible();
  await expect(client.getByRole("link", { name: "Regular" })).toBeVisible();
  const zip = await client.request.get("/portal/assets/download");
  expect(zip.status()).toBe(200);

  const { data: kit } = await admin()
    .from("brand_kits")
    .select("status, signed_off_by")
    .eq("client_id", c.id)
    .single();
  expect(kit).toEqual({ status: "approved", signed_off_by: "Studio Contact" });
});

test("the weekly board: greyed until the calendar is approved, suggestions fill only empty fields, one timer at a time", async ({
  page,
  browser,
}) => {
  const { client: c, month, items } = await clientWithApprovedMonth(page);

  // A month whose calendar isn't approved is read-only.
  await admin()
    .from("content_months")
    .update({ plan_status: "sent" })
    .eq("client_id", c.id);
  await signInStaff(page, STAFF.designer);
  await page.goto(`/creative/clients/${c.id}/board?month=${month}`);
  await expect(page.getByText("Waiting for client approval.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start" })).toHaveCount(0);
  await admin()
    .from("content_months")
    .update({ plan_status: "approved" })
    .eq("client_id", c.id);

  // Pick a week with items, and write our own caption on one of them.
  const p01 = items.find((i) => i.slot_code === "P01")!;
  await admin()
    .from("content_items")
    .update({ caption: "Our own caption" })
    .eq("id", p01.id);
  // Find the week that holds P01.
  for (let w = 0; w < 6; w++) {
    await page.goto(`/creative/clients/${c.id}/board?month=${month}&week=${w}`);
    if (await page.locator(`[id="${p01.id}"]`).count()) break;
  }
  const card = page.locator(`[id="${p01.id}"]`);
  await expect(card).toBeVisible();

  await page
    .getByRole("button", { name: /Suggest visuals & copy for this week/ })
    .click();
  await expect(
    page.getByText(/Suggested \d+ fields?\. Edit before use\./),
  ).toBeVisible();
  const { data: after } = await admin()
    .from("content_items")
    .select("caption, visual, suggested_fields")
    .eq("id", p01.id)
    .single();
  expect(after!.caption).toBe("Our own caption");
  expect(after!.visual).toContain("Stand-in visual");
  expect(after!.suggested_fields).not.toContain("caption");
  await page.reload();
  await expect(
    card.getByText("Suggested by Claude, edit before use").first(),
  ).toBeVisible();

  // Timers: start one here, another in a second tab; only one runs.
  await card.getByRole("button", { name: "Start", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Timing" }),
  ).toBeVisible();
  const { data: started } = await admin()
    .from("content_items")
    .select("status")
    .eq("id", p01.id)
    .single();
  expect(started!.status).toBe("in_design");
  const other = await page.context().newPage();
  await other.goto(`/creative/clients/${c.id}/kit`);
  await other.getByRole("button", { name: "Start", exact: true }).click();
  await expect(
    other.getByRole("status").filter({ hasText: "Brand kit" }),
  ).toBeVisible();
  const me = await staffId(STAFF.designer);
  const { data: running } = await admin()
    .from("time_entries")
    .select("id, is_brand_kit")
    .eq("user_id", me)
    .is("ended_at", null);
  expect(running).toHaveLength(1);
  expect(running![0].is_brand_kit).toBe(true);
  await other.getByRole("button", { name: "Stop" }).first().click();

  // A designer can't send to the client; the creative director can.
  await page.reload();
  await card.getByRole("button", { name: "Send for internal review" }).click();
  await expect(
    card.getByText("Internal review", { exact: true }),
  ).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Send to client" }),
  ).toHaveCount(0);
  const cd = await browser.newPage();
  await signInStaff(cd, STAFF.cd);
  await cd.goto("/creative/review");
  await cd
    .getByRole("row", { name: new RegExp(c.name) })
    .getByRole("link", { name: "Open" })
    .click();
  await cd
    .locator(`[id="${p01.id}"]`)
    .getByRole("button", { name: "Send to client" })
    .click();
  await expect(cd.getByText("Sent to the client's portal.")).toBeVisible();
});

test("designers see every client but no money pages", async ({ page }) => {
  await signInStaff(page, STAFF.designer);
  await page.goto("/creative");
  for (const name of [
    "Sample Coffee Co",
    "Demo Fitness Studio",
    "Example Auto Parts",
  ]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
  for (const path of ["/admin/invoices", "/admin/quotes", "/admin/sales"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "You don't have access to this area" }),
    ).toBeVisible();
  }
});
