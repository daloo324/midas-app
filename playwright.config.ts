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
  webServer: {
    command: `next dev --port ${PORT}`,
    url: `${BASE_URL}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      EMAIL_OUTBOX_DIR: OUTBOX,
      NEXT_PUBLIC_APP_URL: BASE_URL,
    },
  },
});
