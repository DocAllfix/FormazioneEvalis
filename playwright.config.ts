import { defineConfig, devices } from "@playwright/test";

// E2E contro il dev server già in esecuzione su :3000 (non lo avviamo qui per
// evitare di corrompere la cache .next con build concorrenti).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "on",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
