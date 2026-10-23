import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the local Supabase stack (`supabase start`)
// and a dev server on port 3100. Emails go to an outbox folder, not Resend.
loadEnv({ path: ".env.local", quiet: true });

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
export const OUTBOX = path.resolve("test-results/outbox");

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "phone",
      use: { ...devices["Pixel 7"] },
      testMatch: /layout\.spec\.ts/,
    },
  ],
  // A production build by default: it compiles once, so pages load quickly
  // and the Mac doesn't run out of memory. PW_DEV=1 uses the dev server.
  webServer: {
    command: process.env.PW_DEV
      ? `next dev --port ${PORT}`
      : `next build && next start --port ${PORT}`,
    url: `${BASE_URL}/login`,
    reuseExistingServer: false,
    timeout: 600_000,
    env: {
      EMAIL_OUTBOX_DIR: OUTBOX,
      // A fixed reply instead of calling Claude (lib/creative/suggest.ts).
      SUGGESTIONS_STAND_IN: "1",
      NEXT_PUBLIC_APP_URL: BASE_URL,
    },
  },
});
