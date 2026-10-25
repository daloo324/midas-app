import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import {
  admin,
  clearLoginAttempts,
  SAMPLE_PASSWORD,
  signInClient,
  signInStaff,
  STAFF,
  uniqueEmail,
  waitForEmail,
} from "./helpers";

// Phase 5 money flow (06-admin.md acceptance criteria and the review
// checklist): service → lead → quote → won client → invoice → payments →
// credit note, the portal at each step, and the locks.

const stamp = Date.now().toString(36);
const SERVICE = `E2E Retainer ${stamp}`;
const COMPANY = `E2E Lead ${stamp}`;
const LEAD_EMAIL = uniqueEmail("p5.lead");
const CLIENT_PASSWORD = "phase5-client-password";
const made = { clients: [] as string[] };

function asUser(email: string) {
  const c = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  return c.auth
    .signInWithPassword({ email, password: SAMPLE_PASSWORD })
    .then(({ error }) => {
      if (error) throw error;
      return c;
    });
}

async function toast(page: Page, text: string | RegExp) {
  await expect(page.locator(".toast").last()).toContainText(text);
}

/** A form's own result line under it. */
async function said(page: Page, text: string | RegExp) {
  await expect(
    page
      .locator(".notice[role=status], .notice[role=alert]")
      .filter({ hasText: text }),
  ).toBeVisible();
}

test.afterAll(async () => {
  if (made.clients.length)
    await admin()
      .from("clients")
      .update({
        status: "ended",
        end_date: new Date().toISOString().slice(0, 10),
      })
      .in("id", made.clients);
});

test("a lead becomes a client through a quote, then pays an invoice in two parts", async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  await signInStaff(page, STAFF.ceo);

  // 1. A service in the catalogue.
  await page.goto("/admin/services");
  const add = page.locator("section", { hasText: "Add a service" });
  await add.getByLabel("Name").fill(SERVICE);
  await add.getByLabel("Unit").selectOption("monthly");
  await add.getByLabel("Price (P)").fill("3,000");
  await add.getByLabel("Monthly retainer").check();
  await add
    .getByLabel(/Retainer inclusions/)
    .fill("20 static posts\n4 stories");
  await add.getByRole("button", { name: "Add service" }).click();
  await expect(add.getByRole("status")).toContainText(`${SERVICE} added.`);

  // 2. A lead.
  await page.goto("/admin/sales");
  const form = page.locator("#new-lead");
  await form.getByLabel("Company").fill(COMPANY);
  await form.getByLabel("Contact name").fill("Neo Test");
  await form.getByLabel("Email").fill(LEAD_EMAIL);
  await form.getByLabel("Estimated value (P)").fill("36000");
  await form.getByRole("button", { name: "Add lead" }).click();
  await expect(page.getByRole("heading", { name: COMPANY })).toBeVisible();

  // 3. A quote from the catalogue, sent with its PDF.
  await page.getByRole("link", { name: "New quote" }).click();
  await page.getByRole("button", { name: "Start the quote" }).click();
  await expect(
    page.getByRole("heading", { name: "Draft quote" }),
  ).toBeVisible();
  const picker = page.getByLabel("Service to add");
  await picker.selectOption(
    (await picker
      .locator("option", { hasText: SERVICE })
      .getAttribute("value"))!,
  );
  await page.getByRole("button", { name: "Add service" }).click();
  await expect(page.locator(".doc-totals .grand")).toContainText("P36,000.00");
  await page.getByRole("button", { name: "Save draft" }).click();
  await toast(page, "Quote saved.");
  const since = new Date();
  await page.getByRole("button", { name: "Send to client" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "sent to" }),
  ).toBeVisible();
  const quoteNumber = (await page
    .getByRole("heading", { level: 1 })
    .textContent())!.replace("Quote ", "");
  expect(quoteNumber).toMatch(/^MM-Q-\d{4}-\d{4}$/);
  const quoteMail = await waitForEmail(LEAD_EMAIL, since);
  expect(quoteMail.subject).toBe(`Quote ${quoteNumber} from Midas Media`);
  expect(quoteMail.attachments).toEqual([
    expect.objectContaining({ filename: `${quoteNumber}.pdf`, pdf: true }),
  ]);
  const { data: lead } = await admin()
    .from("leads")
    .select("id, stage")
    .eq("company", COMPANY)
    .single();
  expect(lead!.stage).toBe("quote_sent");

  // A sent quote can't be edited.
  await expect(page.getByRole("button", { name: "Save draft" })).toHaveCount(0);
  await page.getByRole("button", { name: "Mark accepted" }).click();
  await toast(page, "Marked accepted.");

  // 4. Won → the client, with the quote's service and fee.
  await page.goto("/admin/sales");
  await page.getByLabel(`Stage for ${COMPANY}`).selectOption("won");
  await expect(
    page.getByRole("heading", { name: "Create the client" }),
  ).toBeVisible();
  const win = page.locator("#win");
  await win.getByLabel("Account exec").selectOption({ index: 1 });
  await expect(win.getByLabel("Service and fee")).toContainText(
    "from the accepted quote",
  );
  await page.getByRole("button", { name: "Create the client" }).click();
  await expect(page.getByRole("heading", { name: COMPANY })).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  const clientId = page.url().split("/").pop()!;
  made.clients.push(clientId);
  const { data: client } = await admin()
    .from("clients")
    .select(
      "status, monthly_fee, contact_email, contact_name, service:services(name)",
    )
    .eq("id", clientId)
    .single();
  expect(client).toMatchObject({
    status: "onboarding",
    monthly_fee: 3000,
    contact_email: LEAD_EMAIL,
    contact_name: "Neo Test",
    service: { name: SERVICE },
  });

  // 5. Accepted quote → draft invoice → issued, emailed with its PDF.
  await page.goto(`/admin/quotes/${quoteNumber}`);
  await page.getByRole("button", { name: "Create invoice" }).click();
  await expect(
    page.getByRole("heading", { name: "Draft invoice" }),
  ).toBeVisible();
  const since2 = new Date();
  await page.getByRole("button", { name: "Issue invoice" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "issued and emailed" }),
  ).toBeVisible();
  const invoiceNumber = (await page
    .getByRole("heading", { level: 1 })
    .textContent())!.replace("Invoice ", "");
  expect(invoiceNumber).toMatch(/^MM-INV-\d{4}-\d{4}$/);
  const invoiceMail = await waitForEmail(LEAD_EMAIL, since2);
  expect(invoiceMail.subject).toBe(`Invoice ${invoiceNumber} from Midas Media`);
  expect(invoiceMail.attachments?.[0]).toMatchObject({
    filename: `${invoiceNumber}.pdf`,
    pdf: true,
  });
  const pdf = await page.request.get(`/api/documents/invoice/${invoiceNumber}`);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  // The client sees it in their portal.
  const loginEmail = uniqueEmail("p5.client");
  const { data: u } = await admin().auth.admin.createUser({
    email: loginEmail,
    password: CLIENT_PASSWORD,
    email_confirm: true,
  });
  const { data: login } = await admin()
    .from("client_users")
    .insert({
      user_id: u.user!.id,
      client_id: clientId,
      full_name: "Neo Test",
      email: loginEmail,
    })
    .select("login_id")
    .single();
  await clearLoginAttempts(login!.login_id);
  const portal = await browser.newPage();
  await signInClient(portal, login!.login_id, CLIENT_PASSWORD);
  await portal.goto("/portal/invoices");
  const row = portal.getByRole("row", { name: new RegExp(invoiceNumber) });
  await expect(row).toContainText("P36,000.00");
  await expect(row.locator(".pill")).toHaveText("Due");
  await expect(
    portal.locator(".panel", { hasText: "Balance due" }).locator(".big"),
  ).toHaveText("P36,000.00");
  // …and can't download the quote (CEO only).
  expect(
    (await portal.request.get(`/api/documents/quote/${quoteNumber}`)).status(),
  ).toBe(404);

  // 6. A part payment, then the rest.
  const pay = async (amount: string) => {
    await page.getByLabel("Amount (P)").first().fill(amount);
    await page.getByRole("button", { name: "Record payment" }).click();
  };
  await pay("10000");
  await said(page, "Payment of P10,000.00 recorded.");
  await portal.reload();
  await expect(row.locator(".pill")).toHaveText("Part paid · P26,000.00 due");
  await pay("30000");
  await said(page, /more than the balance/);
  await pay("26000");
  // Paid in full: the status says so and the payment form goes away.
  await expect(page.locator(".head .pill")).toHaveText("Paid");
  await expect(page.getByRole("button", { name: "Record payment" })).toHaveCount(0);
  await portal.reload();
  await expect(row.locator(".pill")).toContainText("Paid");
  await expect(
    portal.locator(".panel", { hasText: "Balance due" }).locator(".big"),
  ).toHaveText("P0.00");
  await portal.goto(`/portal/invoices?view=${invoiceNumber}`);
  await expect(portal.locator(".inv")).toContainText("Paid");
  await expect(portal.locator(".inv")).not.toContainText("VAT");

  // 7. Issued invoices can't be edited or deleted, even through the API.
  const ceo = await asUser(STAFF.ceo);
  const { data: inv } = await admin()
    .from("invoices")
    .select("id")
    .eq("number", invoiceNumber)
    .single();
  const edit = await ceo
    .from("invoices")
    .update({ notes: "changed" })
    .eq("id", inv!.id);
  expect(edit.error?.message).toContain("Issued invoices can't be changed");
  const del = await ceo.from("invoices").delete().eq("id", inv!.id);
  expect(del.error?.message).toContain("can't be deleted");

  // 8. A once-off invoice corrected with a credit note.
  await page.goto("/admin/invoices");
  await page.getByLabel("New invoice for").selectOption({ label: COMPANY });
  await page.getByRole("button", { name: "Start invoice" }).click();
  await page.getByRole("button", { name: "Add a free-text line" }).click();
  await page.getByLabel("Line 1 name").fill("Extra design work");
  await page.getByLabel("Line 1 unit price").fill("500");
  await page.getByRole("button", { name: "Save draft" }).click();
  await toast(page, "Draft saved.");
  await page.getByRole("button", { name: "Issue invoice" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "issued" }),
  ).toBeVisible();
  await page.getByLabel(/Amount \(P\), up to/).fill("500");
  await page.getByLabel("Reason").fill("Included in the retainer after all");
  await page.getByRole("button", { name: "Issue credit note" }).click();
  await expect(page.locator(".head .pill")).toHaveText("Credited");
  const cn = page.locator("a", { hasText: /^MM-CN-/ }).first();
  const cnPdf = await page.request.get((await cn.getAttribute("href"))!);
  expect((await cnPdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  await portal.close();
});

test("two invoices issued at the same moment get consecutive numbers", async () => {
  const db = admin();
  const { data: c } = await db
    .from("clients")
    .insert({ name: `E2E Numbering ${stamp}`, status: "onboarding" })
    .select("id")
    .single();
  made.clients.push(c!.id);
  const ids: string[] = [];
  for (let i = 0; i < 2; i++) {
    const { data: inv } = await db
      .from("invoices")
      .insert({ client_id: c!.id })
      .select("id")
      .single();
    await db
      .from("invoice_lines")
      .insert({ invoice_id: inv!.id, name: "Work", unit_price: 100 });
    ids.push(inv!.id);
  }
  const ceo = await asUser(STAFF.ceo);
  const results = await Promise.all(
    ids.map((id) => ceo.rpc("issue_invoice", { p_invoice_id: id })),
  );
  const numbers = results.map((r) => {
    expect(r.error).toBeNull();
    return Number((r.data as string).split("-").pop());
  });
  expect(Math.abs(numbers[0] - numbers[1])).toBe(1);
});

test("nobody but the CEO reads leads, quotes, services or settings", async ({
  page,
}) => {
  for (const email of [STAFF.ae1, STAFF.designer, STAFF.cd]) {
    const as = await asUser(email);
    for (const table of [
      "leads",
      "quotes",
      "quote_lines",
      "services",
      "settings",
    ] as const) {
      const { data } = await as.from(table).select("*").limit(1);
      expect(data ?? [], `${email} reads ${table}`).toEqual([]);
    }
  }
  await signInStaff(page, STAFF.ae1);
  for (const path of [
    "/admin/sales",
    "/admin/quotes",
    "/admin/invoices",
    "/admin/services",
    "/admin/settings",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "You don't have access to this area" }),
    ).toBeVisible();
  }
});
