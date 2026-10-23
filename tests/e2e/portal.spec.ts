import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import {
  admin,
  clearLoginAttempts,
  formAlert,
  signInClient,
  signInStaff,
  STAFF,
  uniqueEmail,
} from "./helpers";

// The client portal (05-portal.md acceptance criteria), with two clients.

const PASSWORD = "phase4-test-password";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVQI12P8z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==",
  "base64",
);
const made: string[] = [];
let savedMax: number | null = null;

type Setup = {
  id: string;
  name: string;
  email: string;
  loginId: string;
  items: Record<string, string>;
  month: string;
};

const month = new Date()
  .toLocaleDateString("en-CA", { timeZone: "Africa/Gaborone" })
  .slice(0, 7);

async function staffId(email: string) {
  const { data } = await admin()
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();
  return data!.id as string;
}

/** An active client with a login, an approved month, and P01-P03 sent to them with previews. */
async function makeClient(page: Page, label: string): Promise<Setup> {
  const db = admin();
  const { data: c, error } = await db
    .from("clients")
    .insert({
      name: `Portal ${label} ${Date.now().toString(36)}`,
      status: "active",
      account_exec_id: await staffId(STAFF.ae1),
      platforms: ["facebook", "instagram"],
      main_goal: "visibility",
      baseline: { reach: 1000, followers: 100 },
    })
    .select("id, name")
    .single();
  if (error) throw error;
  made.push(c.id);
  await db
    .from("brand_kits")
    .update({ status: "approved" })
    .eq("client_id", c.id);

  await signInStaff(page, STAFF.ae1);
  await page.goto(`/accounts/clients/${c.id}/calendar?month=${month}`);
  await page.getByRole("button", { name: /^Start / }).click();
  await expect(page.getByRole("cell", { name: "P01" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();

  const { data: rows } = await db
    .from("content_items")
    .select("id, slot_code")
    .eq("client_id", c.id);
  const items = Object.fromEntries(rows!.map((r) => [r.slot_code, r.id]));
  for (const r of rows!)
    await db
      .from("content_items")
      .update({ topic: `${label} topic ${r.slot_code}` })
      .eq("id", r.id);
  await db
    .from("content_months")
    .update({ plan_status: "approved" })
    .eq("client_id", c.id);
  for (const slot of ["P01", "P02", "P03"]) {
    const path = `${c.id}/${month}/${slot}/preview.png`;
    await db.storage
      .from("content")
      .upload(path, PNG, { contentType: "image/png", upsert: true });
    await db
      .from("content_items")
      .update({
        status: "client_review",
        shown_to_client_at: new Date().toISOString(),
        preview_path: path,
        caption: `${label} caption ${slot}`,
      })
      .eq("id", items[slot]);
    await db
      .from("status_events")
      .insert({
        client_id: c.id,
        entity_type: "content_item",
        entity_id: items[slot],
        from_status: "internal_review",
        to_status: "client_review",
        actor_kind: "staff",
      });
  }

  const email = uniqueEmail(`p4.${label.toLowerCase()}`);
  const { data: user } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  const { data: login } = await db
    .from("client_users")
    .insert({
      user_id: user.user!.id,
      client_id: c.id,
      full_name: `${label} Contact`,
      email,
    })
    .select("login_id")
    .single();
  await clearLoginAttempts(login!.login_id);
  return { ...c, email, loginId: login!.login_id, items, month };
}

let X: Setup;
let Y: Setup;

test.beforeAll(async ({ browser }) => {
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
  const page = await browser.newPage();
  X = await makeClient(page, "Xena");
  Y = await makeClient(page, "Yaro");
  await page.close();
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

test("a client can't reach another client's data by changing a link", async ({
  page,
}) => {
  await signInClient(page, X.loginId, PASSWORD);
  await page.goto("/portal/content?month=" + month);
  await expect(page.getByText("Xena topic P01")).toBeVisible();
  await expect(page.getByText(/Yaro topic/)).toHaveCount(0);
  const res = await page.goto(`/portal/content/${Y.items.P01}`);
  expect(res?.status()).toBe(404);
  await page.goto(`/portal/preview/${Y.id}`);
  await expect(
    page.getByRole("heading", { name: "You don't have access to this area" }),
  ).toBeVisible();
});

test("a client can't reach another client's data through the API either", async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const as = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await as.auth.signInWithPassword({
    email: X.email,
    password: PASSWORD,
  });
  expect(error).toBeNull();
  const checks = await Promise.all([
    as.from("portal_items").select("id").eq("client_id", Y.id),
    as.from("portal_client").select("id").eq("id", Y.id),
    as.from("portal_calendar").select("id").eq("client_id", Y.id),
    as.from("portal_months").select("id").eq("client_id", Y.id),
    as.from("portal_kpis").select("month").eq("client_id", Y.id),
    as.from("content_items").select("id").eq("client_id", Y.id),
    as.from("clients").select("id").eq("id", Y.id),
    as.from("brand_kit_files").select("id").eq("client_id", Y.id),
    as.from("comments").select("id").eq("client_id", Y.id),
  ]);
  for (const r of checks) expect(r.data ?? []).toEqual([]);
  const { data: file } = await as.storage
    .from("content")
    .download(`${Y.id}/${month}/P01/preview.png`);
  expect(file).toBeNull();
  // Approving another client's item is refused.
  const { error: moveError } = await as.rpc("set_content_status", {
    p_item_id: Y.items.P01,
    p_new_status: "approved",
  });
  expect(moveError).not.toBeNull();
});

test("drafts never appear, not even in counts", async ({ page }) => {
  await signInClient(page, X.loginId, PASSWORD);
  await page.goto(`/portal/content?month=${month}`);
  await expect(page.locator(".post")).toHaveCount(3);
  await page.goto(`/portal/content?month=${month}&filter=post`);
  await expect(page.locator(".post")).toHaveCount(3);
  await page.goto(`/portal/approvals`);
  await expect(page.getByText("3 waiting")).toBeVisible();
  await page.goto("/portal");
  await expect(
    page.getByRole("heading", { name: "3 items waiting for your approval" }),
  ).toBeVisible();
  await expect(page.locator(".legend")).not.toContainText("In design");
});

test("approve one, request changes on another; both land in /accounts and /creative; undo works", async ({
  page,
  browser,
}) => {
  await signInClient(page, X.loginId, PASSWORD);
  await page.goto("/portal/approvals");
  const p01 = page.locator(`[id="${X.items.P01}"]`);
  await p01.getByRole("button", { name: "Approve" }).click();
  await expect(
    p01.getByText("Approved. Midas has been notified."),
  ).toBeVisible();

  const p02 = page.locator(`[id="${X.items.P02}"]`);
  await p02.getByRole("button", { name: "Request changes" }).click();
  await p02.getByRole("button", { name: "Send to Midas" }).click();
  await expect(
    formAlert(page).filter({ hasText: "Tell us what should change first." }),
  ).toBeVisible();
  await p02
    .getByLabel("What should change?")
    .fill("Use the morning photo instead");
  await p02.getByRole("button", { name: "Send to Midas" }).click();
  await expect(
    p02.getByText("Sent. Midas replies within 48 hours."),
  ).toBeVisible();

  // Undo P03's approval straight away.
  const p03 = page.locator(`[id="${X.items.P03}"]`);
  await p03.getByRole("button", { name: "Approve" }).click();
  await p03.getByRole("button", { name: "Undo" }).click();
  await expect(p03.getByRole("button", { name: "Approve" })).toBeVisible();

  const { data } = await admin()
    .from("content_items")
    .select("slot_code, status, revision_rounds")
    .in("id", [X.items.P01, X.items.P02, X.items.P03])
    .order("slot_code");
  expect(data).toEqual([
    { slot_code: "P01", status: "approved", revision_rounds: 0 },
    { slot_code: "P02", status: "changes_requested", revision_rounds: 1 },
    { slot_code: "P03", status: "client_review", revision_rounds: 0 },
  ]);
  const { data: events } = await admin()
    .from("status_events")
    .select("to_status, actor_kind, actor_id")
    .eq("entity_id", X.items.P01)
    .eq("to_status", "approved");
  expect(events![0].actor_kind).toBe("client");

  const ae = await browser.newPage();
  await signInStaff(ae, STAFF.ae1);
  await ae.goto("/accounts/notifications");
  await expect(ae.getByText(`${X.name} approved P01`)).toBeVisible();
  await expect(
    ae.getByText(`${X.name} asked for changes to P02`),
  ).toBeVisible();

  const designer = await browser.newPage();
  await signInStaff(designer, STAFF.designer);
  for (let w = 0; w < 6; w++) {
    await designer.goto(
      `/creative/clients/${X.id}/board?month=${month}&week=${w}`,
    );
    if (await designer.locator(`[id="${X.items.P02}"]`).count()) break;
  }
  await expect(
    designer.locator(`[id="${X.items.P02}"] .feedback`),
  ).toContainText("Use the morning photo instead");
});

test("the CEO previews a client's portal, read-only", async ({ page }) => {
  await signInStaff(page, STAFF.ceo);
  await page.goto(`/admin/clients/${Y.id}`);
  await page.getByRole("link", { name: "Preview their portal" }).click();
  await expect(page.getByRole("note")).toContainText(`Viewing as ${Y.name}`);
  await page.getByRole("link", { name: /Approvals/ }).click();
  await expect(page.getByText("Yaro caption P01")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
  await expect(
    page
      .getByText("Preview only: the client approves or asks for changes here.")
      .first(),
  ).toBeVisible();
  await page.goto(`/portal/preview/${Y.id}/account`);
  await expect(
    page.getByRole("button", { name: "Change password" }),
  ).toHaveCount(0);
});

test("every portal page fits a 375 px phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signInClient(page, Y.loginId, PASSWORD);
  for (const path of [
    "/portal",
    "/portal/approvals",
    `/portal/content?month=${month}`,
    `/portal/content/${Y.items.P01}`,
    "/portal/campaigns",
    "/portal/reports",
    "/portal/invoices",
    "/portal/assets",
    "/portal/account",
    "/portal/account/brief",
  ]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);
  }
});
