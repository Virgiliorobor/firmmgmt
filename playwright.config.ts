import { defineConfig, devices } from "@playwright/test";

const port = 3010;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx tsx scripts/e2e-server.ts",
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      ...process.env,
      PORT: String(port),
      APP_BASE_URL: baseURL,
      AUTH_PROVIDER: "totp-local",
      FIRM_TIMEZONE: "America/New_York",
      FIRM_LOCALE: "en-US",
      SESSION_SECRET: "e2e-session-secret-at-least-32-chars",
      FIELD_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      PGLITE_PATH: ".data/e2e",
      DATABASE_URL: "",
      SEED_ON_START: "true",
      DEMO_MANAGING_PARTNER_EMAIL: "partner@example.local",
      DEMO_MANAGING_PARTNER_PASSWORD: "local-demo-pass",
      DEMO_MANAGING_PARTNER_TOTP_SECRET: "JBSWY3DPEHPK3PXP",
      DEMO_ADMINISTRATIVE_MANAGER_EMAIL: "admin.manager@example.local",
      DEMO_ADMINISTRATIVE_MANAGER_PASSWORD: "local-demo-pass",
      DEMO_ADMINISTRATIVE_MANAGER_TOTP_SECRET: "JBSWY3DPEHPK3PXP",
      DEMO_LAWYER_EMAIL: "lawyer@example.local",
      DEMO_LAWYER_PASSWORD: "local-demo-pass",
      DEMO_LAWYER_TOTP_SECRET: "JBSWY3DPEHPK3PXP",
      DEMO_INTEGRATION_OPERATOR_EMAIL: "operator@example.local",
      DEMO_INTEGRATION_OPERATOR_PASSWORD: "local-demo-pass",
      DEMO_INTEGRATION_OPERATOR_TOTP_SECRET: "JBSWY3DPEHPK3PXP",
      DEDICATED_INTAKE_ADDRESS: "intake@example.local",
      RATE_LIMIT_MAX_PER_MINUTE: "50",
      NODE_ENV: "development",
    },
  },
});
