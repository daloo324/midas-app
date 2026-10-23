import { defineConfig, devices } from "@playwright/test";

// Demo mode end-to-end tests: no Supabase needed. `npm run test:e2e:demo`
const PORT = 3200;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e-demo",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"]],
  use: { baseURL: BASE_URL, trace: "retain-on-failure" },
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
      DEMO_MODE: "1",
      NEXT_PUBLIC_APP_URL: BASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      RESEND_API_KEY: "",
      EMAIL_OUTBOX_DIR: "",
    },
  },
});
