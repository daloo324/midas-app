import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { admin, STAFF } from "./helpers";

// /start/[token]: the brand discovery questionnaire (03-accounts.md, 02-data-model.md).

// A 2x2 red PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVQI12P8z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==",
  "base64",
);

function token() {
  return randomBytes(24).toString("base64url");
}

async function clientWithLink(opts: { expired?: boolean } = {}) {
  const db = admin();
  const { data: ae } = await db
    .from("profiles")
    .select("id")
    .eq("email", STAFF.ae1)
    .single();
  const { data: client, error } = await db
    .from("clients")
    .insert({
      name: `Questionnaire Test ${Date.now()}`,
      status: "onboarding",
      account_exec_id: ae!.id,
    })
    .select("id, name")
    .single();
  if (error) throw error;
  const t = token();
  await db.from("questionnaire_invites").insert({
    client_id: client.id,
    token: t,
    expires_at: opts.expired
      ? new Date(Date.now() - 1000).toISOString()
      : undefined,
  });
  return { client, token: t };
}

test("a client fills in the questionnaire on a phone, with images, and it lands on their brief", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { client, token: t } = await clientWithLink();

  await page.goto(`/start/${t}`);
  await expect(
    page.getByRole("heading", { name: /Tell us who you are/ }),
  ).toBeVisible();
  await expect(page.getByLabel(/Business name/)).toHaveValue(client.name);

  // The first section needs a name before moving on.
  await page.getByRole("button", { name: "Next section →" }).click();
  await expect(
    page.getByText("Please fill this in.").filter({ visible: true }),
  ).toBeVisible();
  await page.getByLabel(/Your name/).fill("Thabo Test");
  await page.getByRole("button", { name: "3+ years" }).click();
  await page.getByRole("button", { name: "Next section →" }).click();

  await expect(
    page.getByRole("heading", { name: "Your customers" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "25–34" }).click();
  await page.getByRole("button", { name: "Next section →" }).click();
  await page.getByRole("button", { name: "Next section →" }).click();

  await expect(page.getByRole("heading", { name: "Your logo" })).toBeVisible();
  await page.getByRole("button", { name: /Wordmark/ }).click();
  await page
    .getByLabel("Logos you like")
    .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await page.getByLabel("Note for image 1").fill("Clean and bold");

  // The draft survives a reload on this device.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your logo" })).toBeVisible();
  await expect(page.getByLabel("Note for image 1")).toHaveValue(
    "Clean and bold",
  );

  await page.getByRole("button", { name: /Review & send/ }).click();
  await expect(page.getByText("Thabo Test")).toBeVisible();
  await page.getByRole("button", { name: "Send to Midas Media" }).click();
  await expect(
    page.getByRole("heading", { name: "Thank you. We have your answers." }),
  ).toBeVisible();

  const { data: brief } = await admin()
    .from("brand_briefs")
    .select("answers, uploads, submitted_at")
    .eq("client_id", client.id)
    .single();
  expect(brief!.submitted_at).not.toBeNull();
  expect(brief!.answers).toContainEqual({
    section: "Your business",
    question: "Your name",
    answer: "Thabo Test",
  });
  const uploads = brief!.uploads as {
    path: string;
    note: string;
    question: string;
  }[];
  expect(uploads).toHaveLength(1);
  expect(uploads[0]).toMatchObject({
    note: "Clean and bold",
    question: "Logos you like",
  });
  const { data: file } = await admin()
    .storage.from("briefs")
    .download(uploads[0].path);
  expect(file?.size).toBeGreaterThan(0);

  // The link works once.
  await page.goto(`/start/${t}`);
  await expect(
    page.getByRole("heading", { name: "Thanks, we have your answers" }),
  ).toBeVisible();
});

test("an expired link and an unknown link show a friendly message", async ({
  page,
}) => {
  const { token: t } = await clientWithLink({ expired: true });
  await page.goto(`/start/${t}`);
  await expect(
    page.getByRole("heading", { name: "This link has expired" }),
  ).toBeVisible();
  await page.goto(`/start/${token()}`);
  await expect(
    page.getByRole("heading", { name: "We couldn't find this questionnaire" }),
  ).toBeVisible();
  await page.goto("/start/short");
  await expect(
    page.getByRole("heading", { name: "We couldn't find this questionnaire" }),
  ).toBeVisible();
});

test("a link can't upload once it has been used", async ({ page }) => {
  const { client, token: t } = await clientWithLink();
  await admin()
    .from("questionnaire_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("token", t);
  await page.goto("/login");
  const result = await page.evaluate(
    async ({ url, key, path }) => {
      const res = await fetch(`${url}/storage/v1/object/briefs/${path}`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "image/png",
        },
        body: new Uint8Array([137, 80, 78, 71]),
      });
      return res.status;
    },
    {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      path: `${client.id}/questionnaire/${t}/late.png`,
    },
  );
  expect(result).toBeGreaterThanOrEqual(400);
});
