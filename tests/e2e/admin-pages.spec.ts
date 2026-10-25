import { expect, test } from "@playwright/test";
import { admin, signInStaff, STAFF } from "./helpers";

// The CEO's other pages: overview numbers match their lists, the retainer
// review, VAT, settings and marketing.

let saved: Record<string, unknown> | null = null;
const made: string[] = [];

test.beforeAll(async () => {
  const { data } = await admin()
    .from("settings")
    .select(
      "vat_registered, vat_rate, vat_number, payment_terms_days, company_name, max_active_clients",
    )
    .eq("id", 1)
    .single();
  saved = data;
});

test.afterAll(async () => {
  if (saved) await admin().from("settings").update(saved).eq("id", 1);
  if (made.length)
    await admin()
      .from("clients")
      .update({
        status: "ended",
        end_date: new Date().toISOString().slice(0, 10),
      })
      .in("id", made);
});

const money = (s: string | null) => Number((s ?? "").replace(/[^\d.-]/g, ""));

test("the overview's numbers match the lists behind them", async ({ page }) => {
  await signInStaff(page, STAFF.ceo);
  await page.goto("/admin");
  const tile = (name: string) =>
    page.locator(".stat .tile-link", { hasText: name });
  const owedText = await tile("Collected this month")
    .locator("span")
    .nth(1)
    .textContent();
  const owed = money(owedText!.split("·")[0]);
  const pipeline = money(
    await tile("Pipeline value").locator("b").textContent(),
  );
  const clients = (await tile("Clients").locator("b").textContent())!
    .split("/")
    .map((x) => Number(x.trim()));

  await page.goto("/admin/invoices");
  expect(
    money(
      await page
        .locator(".stat > div", { hasText: "Owed to Midas" })
        .locator("b")
        .textContent(),
    ),
  ).toBe(owed);

  const db = admin();
  const { data: leads } = await db
    .from("leads")
    .select("estimated_value")
    .in("stage", ["new", "contacted", "quote_sent"]);
  expect(pipeline).toBeCloseTo(
    (leads ?? []).reduce((a, l) => a + Number(l.estimated_value ?? 0), 0),
    2,
  );
  const { count: active } = await db
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");
  expect(clients[0]).toBe(active);
  await page.goto("/admin/clients?status=active");
  await expect(page.locator(".tbl tbody tr")).toHaveCount(active ?? 0);
});

test("retainer drafts are reviewed and issued together", async ({ page }) => {
  const db = admin();
  await db.from("settings").update({ max_active_clients: 1000 }).eq("id", 1);
  const { data: s } = await db
    .from("services")
    .select("id")
    .eq("name", "Brand Launch")
    .single();
  const { data: c } = await db
    .from("clients")
    .insert({
      name: `E2E Retainer client ${Date.now()}`,
      status: "active",
      service_id: s!.id,
      monthly_fee: 3250,
    })
    .select("id, name")
    .single();
  made.push(c!.id);
  await signInStaff(page, STAFF.ceo);
  await page.goto("/admin/invoices/drafts");
  await page
    .getByRole("button", { name: "Make this month's retainer drafts" })
    .click();
  await expect(page.locator(".toast").last()).toContainText(
    /retainer draft|already has/,
    { timeout: 15_000 },
  );
  await page.reload();
  const row = page.getByRole("row", { name: new RegExp(c!.name) });
  await expect(row).toContainText("Brand Launch ·");
  await expect(row).toContainText("P3,250.00");
  await page.getByLabel("Choose all").uncheck();
  await row.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Issue 1 invoice" }).click();
  // Issuing makes and stores the PDF, which can take a few seconds.
  await expect(page.locator(".toast").last()).toContainText(
    /Issued 1 invoice|no contact email/,
    { timeout: 30_000 },
  );
  const { data: inv } = await db
    .from("invoices")
    .select("status, number, title")
    .eq("client_id", c!.id)
    .single();
  expect(inv).toMatchObject({ status: "issued", title: "Invoice" });

  // Running the month again makes nothing new for this client.
  await page
    .getByRole("button", { name: "Make this month's retainer drafts" })
    .click();
  await expect(page.locator(".toast").last()).toBeVisible();
  const { count } = await db
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("client_id", c!.id);
  expect(count).toBe(1);
});

test("switching VAT on changes new documents only", async ({ page }) => {
  const db = admin();
  const { data: c } = await db
    .from("clients")
    .insert({ name: `E2E VAT ${Date.now()}`, status: "onboarding" })
    .select("id")
    .single();
  made.push(c!.id);
  const mk = async () => {
    const { data: inv } = await db
      .from("invoices")
      .insert({ client_id: c!.id })
      .select("id")
      .single();
    await db
      .from("invoice_lines")
      .insert({ invoice_id: inv!.id, name: "Work", unit_price: 1000 });
    return inv!.id;
  };
  const before = await mk();
  await db.rpc("issue_invoice", { p_invoice_id: before });

  await signInStaff(page, STAFF.ceo);
  await page.goto("/admin/settings");
  const vat = page.locator("section", { hasText: "VAT-registered" });
  await vat.getByLabel("Midas is VAT-registered").check();
  await expect(vat.locator(".notice.warn")).toContainText(
    'titled "Tax invoice"',
  );
  await vat.getByRole("button", { name: "Save VAT settings" }).click();
  await expect(vat.getByRole("alert")).toContainText("Enter the VAT number");
  await vat.getByLabel("VAT number").fill("P0123456789");
  await vat.getByRole("button", { name: "Save VAT settings" }).click();
  await expect(vat.getByRole("status")).toContainText("VAT is on");

  const after = await mk();
  await db.rpc("issue_invoice", { p_invoice_id: after });
  const { data } = await db
    .from("invoices")
    .select("id, title, vat_amount, total")
    .in("id", [before, after]);
  const byId = Object.fromEntries((data ?? []).map((r) => [r.id, r]));
  expect(byId[before]).toMatchObject({
    title: "Invoice",
    vat_amount: 0,
    total: 1000,
  });
  expect(byId[after]).toMatchObject({
    title: "Tax invoice",
    vat_amount: 140,
    total: 1140,
  });
  await db.from("settings").update({ vat_registered: false }).eq("id", 1);
});

test("settings and marketing figures save", async ({ page }) => {
  await signInStaff(page, STAFF.ceo);
  await page.goto("/admin/settings");
  const bank = page.locator("section", { hasText: "Bank details" });
  await bank.getByLabel("Bank").fill("First National Bank Botswana");
  await bank.getByLabel("Account number").fill("62000000000");
  await bank.getByRole("button", { name: "Save bank details" }).click();
  await expect(bank.getByRole("status")).toContainText("Bank details saved");
  const { data: s } = await admin()
    .from("settings")
    .select("bank_details")
    .eq("id", 1)
    .single();
  expect(s!.bank_details).toMatchObject({
    bank: "First National Bank Botswana",
    account_number: "62000000000",
  });

  await page.goto("/admin/marketing?month=2026-09");
  await page
    .locator("fieldset", { hasText: "Instagram" })
    .getByLabel("Accounts reached")
    .fill("8,000");
  await page
    .locator("fieldset", { hasText: "Instagram" })
    .getByLabel("Interactions")
    .fill("400");
  await page.getByLabel(/Top pages/).fill("/ 820\n/services 310");
  await page.getByRole("button", { name: "Save figures" }).click();
  await expect(page.getByRole("status")).toContainText("Figures saved.");
  await page.reload();
  const row = page.getByRole("row", { name: /September 2026/ });
  await expect(row).toContainText("8,000");
  await expect(row).toContainText("5.0%");
  await page.getByLabel(/Top pages/).fill("not a page line");
  await page.getByRole("button", { name: "Save figures" }).click();
  await expect(page.getByText(/Write each top page as/)).toBeVisible();
});
