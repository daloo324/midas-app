import { expect, test, type Page } from "@playwright/test";
import {
  admin,
  clearLoginAttempts,
  signInClient,
  signInStaff,
  STAFF,
  uniqueEmail,
} from "./helpers";

// The Account Desk and the client's approvals (03-accounts.md acceptance criteria).

const PASSWORD = "phase2-test-password";
const made: string[] = [];
let savedMax: number | null = null;

function nextMonth(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return d.toISOString().slice(0, 7);
}
const label = (ym: string) =>
  new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${ym}-01T00:00:00Z`));

async function staffId(email: string) {
  const { data } = await admin()
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();
  return data!.id as string;
}

async function makeClient(
  opts: {
    ae?: string;
    status?: "active" | "onboarding";
    kitApproved?: boolean;
  } = {},
) {
  const db = admin();
  const { data, error } = await db
    .from("clients")
    .insert({
      name: `Phase Two ${Date.now().toString(36)}`,
      status: opts.status ?? "active",
      account_exec_id: await staffId(opts.ae ?? STAFF.ae1),
      platforms: ["facebook", "instagram"],
      main_goal: "engagement",
    })
    .select("id, name, client_code")
    .single();
  if (error) throw error;
  made.push(data.id);
  if (opts.kitApproved)
    await db
      .from("brand_kits")
      .update({ status: "approved" })
      .eq("client_id", data.id);
  return data as { id: string; name: string; client_code: string };
}

async function makeLogin(clientId: string) {
  const db = admin();
  const email = uniqueEmail("p2.client");
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
      full_name: "Phase Two Contact",
      email,
    })
    .select("login_id")
    .single();
  await clearLoginAttempts(data!.login_id);
  return data!.login_id as string;
}

async function startMonth(page: Page, clientId: string, ym: string) {
  await page.goto(`/accounts/clients/${clientId}/calendar?month=${ym}`);
  await page.getByRole("button", { name: `Start ${label(ym)}` }).click();
  await expect(page.getByRole("cell", { name: "P01" })).toBeVisible();
}

async function fillTopics(clientId: string) {
  const db = admin();
  const { data: items } = await db
    .from("content_items")
    .select("id, slot_code")
    .eq("client_id", clientId);
  for (const i of items ?? [])
    await db
      .from("content_items")
      .update({ topic: `Topic for ${i.slot_code}` })
      .eq("id", i.id);
}

test.beforeAll(async () => {
  // Room for the test clients, whatever else is active.
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
  const db = admin();
  if (made.length)
    await db
      .from("clients")
      .update({
        status: "ended",
        end_date: new Date().toISOString().slice(0, 10),
      })
      .in("id", made);
  if (savedMax !== null)
    await db
      .from("settings")
      .update({ max_active_clients: savedMax })
      .eq("id", 1);
});

test("an account exec sees only their own clients, including by direct link", async ({
  page,
}) => {
  const other = await makeClient({ ae: STAFF.ae2 });
  await signInStaff(page, STAFF.ae1);
  await expect(page).toHaveURL("/accounts");
  await expect(
    page.getByRole("heading", { name: "Sample Coffee Co" }),
  ).toBeVisible();
  await expect(page.getByText(other.name)).toHaveCount(0);
  for (const tab of [
    "",
    "/calendar",
    "/campaign",
    "/kpis",
    "/profile",
    "/onboarding",
  ]) {
    const res = await page.goto(`/accounts/clients/${other.id}${tab}`);
    expect(
      res?.status(),
      `${tab || "/"} for another account exec's client`,
    ).toBe(404);
  }
});

test("starting a month makes 26 items; the client approves the calendar in the portal", async ({
  page,
  browser,
}) => {
  const c = await makeClient();
  const loginId = await makeLogin(c.id);
  const ym = nextMonth();
  await signInStaff(page, STAFF.ae1);
  await startMonth(page, c.id, ym);

  const { data: items } = await admin()
    .from("content_items")
    .select("format, pillar, scheduled_date")
    .eq("client_id", c.id);
  expect(items).toHaveLength(26);
  expect(items!.every((i) => i.scheduled_date!.startsWith(ym))).toBe(true);
  const posts = items!.filter((i) => i.format === "post");
  const count = (p: string) => posts.filter((i) => i.pillar === p).length;
  expect([
    count("showcase"),
    count("educate"),
    count("proof"),
    count("behind_the_scenes"),
    count("engage"),
  ]).toEqual([6, 5, 3, 3, 3]);

  // A topic typed in the table saves when you leave the field.
  await fillTopics(c.id);
  await page.reload();
  const topic = page.getByLabel("P01 topic");
  await topic.fill("Opening week special");
  await topic.blur();
  await expect
    .poll(
      async () =>
        (
          await admin()
            .from("content_items")
            .select("topic")
            .eq("client_id", c.id)
            .eq("slot_code", "P01")
            .single()
        ).data?.topic,
    )
    .toBe("Opening week special");

  await page
    .getByRole("button", { name: "Send to client for approval" })
    .click();
  await expect(
    page.getByText("Sent to the client for approval."),
  ).toBeVisible();

  const client = await browser.newPage();
  await signInClient(client, loginId, PASSWORD);
  await client.goto("/portal/approvals");
  await expect(
    client.getByRole("heading", { name: `${label(ym)} content calendar` }),
  ).toBeVisible();
  await expect(
    client.getByRole("cell", { name: "Opening week special" }),
  ).toBeVisible();
  await client.getByRole("button", { name: "Request changes" }).click();
  await client.getByRole("button", { name: "Send to Midas" }).click();
  await expect(
    client.getByText("Tell us what should change first."),
  ).toBeVisible();
  await client.getByRole("button", { name: "Cancel" }).click();
  await client.getByRole("button", { name: "Approve" }).click();
  await expect(
    client.getByText("Approved. Midas has been notified."),
  ).toBeVisible();

  await page.goto(`/accounts/clients/${c.id}?month=${ym}`);
  const step = page.locator(".checks li", {
    hasText: "Client approved the calendar",
  });
  await expect(step.locator(".tick.on")).toBeVisible();
  await page.goto("/accounts/notifications");
  await expect(
    page.getByRole("link", {
      name: `${c.name} approved the ${label(ym)} calendar`,
    }),
  ).toBeVisible();
});

test("a campaign creates A01–A03 and goes draft, sent, approved, live, complete", async ({
  page,
  browser,
}) => {
  const c = await makeClient();
  const loginId = await makeLogin(c.id);
  const ym = nextMonth();
  await signInStaff(page, STAFF.ae1);
  await startMonth(page, c.id, ym);

  await page.goto(`/accounts/clients/${c.id}/campaign?month=${ym}`);
  await page
    .getByRole("button", { name: "Create this month's campaign" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Campaign ad set brief" }),
  ).toBeVisible();
  await page.goto(`/accounts/clients/${c.id}/calendar?month=${ym}`);
  for (const slot of ["A01", "A02", "A03"])
    await expect(
      page.getByRole("cell", { name: slot, exact: true }),
    ).toBeVisible();

  await page.goto(`/accounts/clients/${c.id}/campaign?month=${ym}`);
  await page.getByRole("button", { name: "Send to client" }).click();
  await expect(page.locator(".toast.err")).toContainText(
    "Fill in the goal, offer, start date and end date",
  );

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Africa/Gaborone",
  });
  await page.getByLabel("Goal").selectOption("Messages / WhatsApp chats");
  const offer = page.getByLabel("Offer");
  await offer.fill("Free pastry with any large drink");
  await offer.blur();
  await page.getByLabel("Start date").fill(today);
  await page.getByLabel("Start date").blur();
  await page.getByLabel("End date").fill(`${ym}-20`);
  await page.getByLabel("End date").blur();
  await expect
    .poll(
      async () =>
        (
          await admin()
            .from("campaigns")
            .select("end_date")
            .eq("client_id", c.id)
            .single()
        ).data?.end_date,
    )
    .toBe(`${ym}-20`);
  await page.getByRole("button", { name: "Send to client" }).click();
  await expect(page.getByText("Sent to the client.")).toBeVisible();

  const client = await browser.newPage();
  await signInClient(client, loginId, PASSWORD);
  await client.goto("/portal/approvals");
  await expect(
    client.getByText("Free pastry with any large drink"),
  ).toBeVisible();
  await expect(
    client.getByText("you pay this to Meta").or(client.getByText("—")).first(),
  ).toBeVisible();
  await client.getByRole("button", { name: "Approve" }).click();
  await expect(
    client.getByText("Approved. Midas has been notified."),
  ).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Mark live" }).click();
  const live = page.getByRole("button", { name: "It's live" });
  await expect(live).toBeDisabled();
  for (const check of [
    "The offer is real and in stock",
    "Someone answers messages within the agreed time",
    "The landing link works",
  ]) {
    await page.getByLabel(check).check();
  }
  await live.click();
  await expect(page.getByText("The campaign is live.")).toBeVisible();

  await page.getByRole("button", { name: "Mark complete" }).click();
  await expect(page.locator(".toast.err")).toContainText(
    "Write the results summary",
  );
  await page.getByLabel("Results summary").fill("48 chats at P9.50 each.");
  await page.getByLabel("Results summary").blur();
  await expect
    .poll(
      async () =>
        (
          await admin()
            .from("campaigns")
            .select("results")
            .eq("client_id", c.id)
            .single()
        ).data?.results,
    )
    .toBe("48 chats at P9.50 each.");
  await page.getByRole("button", { name: "Mark complete" }).click();
  await expect(page.getByText("Campaign complete.")).toBeVisible();

  const { data: events } = await admin()
    .from("status_events")
    .select("to_status")
    .eq("entity_type", "campaign")
    .eq("client_id", c.id);
  expect(events!.map((e) => e.to_status).sort()).toEqual(
    ["approved", "complete", "draft", "live", "sent"].sort(),
  );
});

test("publishing the review locks the KPIs and shows the review in the portal", async ({
  page,
  browser,
}) => {
  const c = await makeClient();
  const loginId = await makeLogin(c.id);
  const ym = nextMonth();
  await signInStaff(page, STAFF.ae1);
  await startMonth(page, c.id, ym);

  await page.goto(`/accounts/clients/${c.id}/kpis?month=${ym}`);
  await page.getByLabel("Accounts reached").fill("2000");
  await page.getByLabel("Accounts reached").blur();
  await page
    .getByLabel("Interactions (likes, comments, shares, saves)")
    .fill("100");
  await page.getByLabel("Interactions (likes, comments, shares, saves)").blur();
  await expect
    .poll(
      async () =>
        (
          await admin()
            .from("kpi_months")
            .select("metrics")
            .eq("client_id", c.id)
            .maybeSingle()
        ).data?.metrics,
    )
    .toEqual({ reach: 2000, interactions: 100 });
  await page.reload();
  await expect(
    page.locator(".krow", { hasText: "Engagement rate" }).locator(".auto"),
  ).toHaveText("5.0%");

  await page.getByRole("button", { name: "Publish review" }).click();
  await expect(page.locator(".toast.err")).toContainText("Fill in what worked");
  for (const [field, text] of [
    ["What's working", "Reels reached the most people."],
    ["What to adjust", "Post earlier in the day."],
    ["Next month's focus", "Weekend offer"],
  ] as const) {
    await page.getByLabel(field).fill(text);
    await page.getByLabel(field).blur();
  }
  await expect
    .poll(
      async () =>
        (
          (
            await admin()
              .from("content_months")
              .select("review")
              .eq("client_id", c.id)
              .single()
          ).data?.review as Record<string, string>
        )?.focus,
    )
    .toBe("Weekend offer");
  await page.getByRole("button", { name: "Publish review" }).click();
  await expect(
    page.getByText(/Published\. The client can see it/),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Accounts reached")).toBeDisabled();
  await expect(page.getByText(/KPIs locked/)).toBeVisible();

  const client = await browser.newPage();
  await signInClient(client, loginId, PASSWORD);
  await client.goto("/portal/reports");
  await expect(
    client.getByRole("heading", { name: `What we learned in ${label(ym)}` }),
  ).toBeVisible();
  await expect(
    client.getByText("Reels reached the most people."),
  ).toBeVisible();

  // Only the CEO unpublishes.
  await expect(
    page.getByRole("button", { name: "Unpublish review" }),
  ).toHaveCount(0);
  const ceo = await browser.newPage();
  await signInStaff(ceo, STAFF.ceo);
  await ceo.goto(`/accounts/clients/${c.id}/kpis?month=${ym}`);
  await ceo.getByRole("button", { name: "Unpublish review" }).click();
  await expect(ceo.getByText("Unpublished.")).toBeVisible();
  await ceo.reload();
  await expect(ceo.getByLabel("Accounts reached")).toBeEnabled();
});

test("the account exec activates a client once the kit is approved, within the client limit", async ({
  page,
}) => {
  const waiting = await makeClient({ status: "onboarding" });
  await signInStaff(page, STAFF.ae1);
  await page.goto(`/accounts/clients/${waiting.id}/onboarding`);
  await expect(
    page.getByRole("button", { name: "Make the client active" }),
  ).toBeDisabled();

  await admin()
    .from("brand_kits")
    .update({ status: "approved" })
    .eq("client_id", waiting.id);
  const { count } = await admin()
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");
  await admin()
    .from("settings")
    .update({ max_active_clients: count! })
    .eq("id", 1);
  await page.reload();
  await page.getByRole("button", { name: "Make the client active" }).click();
  await expect(page.locator(".toast.err")).toContainText(
    `You already have ${count} active clients, which is the limit`,
  );

  await admin()
    .from("settings")
    .update({ max_active_clients: 1000 })
    .eq("id", 1);
  await page.getByRole("button", { name: "Make the client active" }).click();
  await expect(
    page.getByText("Active. You can start planning months now."),
  ).toBeVisible();
  const { data } = await admin()
    .from("clients")
    .select("status")
    .eq("id", waiting.id)
    .single();
  expect(data!.status).toBe("active");
});

test("the account exec makes a questionnaire link and sees the brief arrive", async ({
  page,
  browser,
}) => {
  const c = await makeClient({ status: "onboarding" });
  await signInStaff(page, STAFF.ae1);
  await page.goto(`/accounts/clients/${c.id}/onboarding`);
  await page.getByRole("button", { name: "Create questionnaire link" }).click();
  const link = await page.getByLabel("Questionnaire link").inputValue();
  expect(link).toMatch(/\/start\/[A-Za-z0-9_-]{32}$/);

  const visitor = await browser.newPage();
  await visitor.goto(link);
  await visitor.getByLabel(/Your name/).fill("Brief Sender");
  await visitor.getByRole("button", { name: /Review & send/ }).click();
  await visitor.getByRole("button", { name: "Send to Midas Media" }).click();
  await expect(
    visitor.getByRole("heading", { name: "Thank you. We have your answers." }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByText("Brief Sender")).toBeVisible();
  await page.goto("/accounts/notifications");
  await expect(
    page.getByText(`${c.name} sent their brand questionnaire.`),
  ).toBeVisible();
});
