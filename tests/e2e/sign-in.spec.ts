import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import {
  CLIENT_EMAIL,
  CLIENT_LOGIN_ID,
  SAMPLE_PASSWORD,
  STAFF,
  admin,
  clearLoginAttempts,
  signInClient,
  signInStaff,
  formAlert,
} from "./helpers";

const CLIENT_NO_MATCH = "That client ID and password don't match.";
const STAFF_NO_MATCH = "That email and password don't match.";

test.beforeEach(async () => {
  await clearLoginAttempts(CLIENT_LOGIN_ID);
  await clearLoginAttempts("MM-ZZZ-9999");
});

test("public sign-up is switched off", async () => {
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
    },
  );
  const { data, error } = await anon.auth.signUp({
    email: "walk.in@example.com",
    password: "a-long-password-1",
  });
  expect(error).not.toBeNull();
  expect(data.user).toBeNull();
});

test("a client signs in with their client ID, typed in any case", async ({
  page,
}) => {
  await signInClient(page, ` ${CLIENT_LOGIN_ID.toLowerCase()} `);
  await expect(page).toHaveURL("/portal");
});

test("a wrong client ID and a wrong password show the identical message", async ({
  page,
}) => {
  await signInClient(page, "MM-ZZZ-9999");
  const unknownId = await formAlert(page).textContent();

  await signInClient(page, CLIENT_LOGIN_ID, "not-the-password");
  const wrongPassword = await formAlert(page).textContent();

  expect(unknownId?.trim()).toBe(CLIENT_NO_MATCH);
  expect(wrongPassword?.trim()).toBe(CLIENT_NO_MATCH);
  await expect(page).toHaveURL("/portal/login");
});

test("after five wrong passwords the sixth attempt is refused, even with the right password", async ({
  page,
}) => {
  for (let i = 0; i < 5; i++) {
    await signInClient(page, CLIENT_LOGIN_ID, `wrong-${i}`);
    await expect(formAlert(page)).toHaveText(CLIENT_NO_MATCH);
  }
  await signInClient(page, CLIENT_LOGIN_ID, SAMPLE_PASSWORD);
  await expect(formAlert(page)).toHaveText(CLIENT_NO_MATCH);
  await expect(page).toHaveURL("/portal/login");

  // Fifteen minutes later it works again.
  await admin()
    .from("login_attempts")
    .update({ created_at: new Date(Date.now() - 16 * 60_000).toISOString() })
    .eq("login_id", CLIENT_LOGIN_ID);
  await signInClient(page, CLIENT_LOGIN_ID, SAMPLE_PASSWORD);
  await expect(page).toHaveURL("/portal");
});

test("an unknown client ID is rate limited too", async ({ page }) => {
  for (let i = 0; i < 6; i++) {
    await signInClient(page, "MM-ZZZ-9999", "anything");
    await expect(formAlert(page)).toHaveText(CLIENT_NO_MATCH);
  }
  const { count } = await admin()
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("login_id", "MM-ZZZ-9999");
  expect(count).toBe(5);
});

test("staff sign in with email; a wrong password gives a plain message", async ({
  page,
}) => {
  await signInStaff(page, STAFF.ceo, "wrong-password");
  await expect(formAlert(page)).toHaveText(STAFF_NO_MATCH);
  await signInStaff(page, "nobody@example.com", "wrong-password");
  await expect(formAlert(page)).toHaveText(STAFF_NO_MATCH);
});

test("a client can't use the staff sign-in page", async ({ page }) => {
  await signInStaff(page, CLIENT_EMAIL, SAMPLE_PASSWORD);
  await expect(formAlert(page)).toHaveText(STAFF_NO_MATCH);
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/portal\/login/);
});
