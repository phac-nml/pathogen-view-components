import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "test/browser",
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  use: {
    browserName: "chromium",
    baseURL: "http://127.0.0.1:4179",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
  },
  webServer: {
    command: "node test/browser/server.mjs",
    url: "http://127.0.0.1:4179",
    reuseExistingServer: false,
    // Cover a cold Rails boot plus esbuild bundle before the fixture server binds.
    timeout: 120_000,
  },
});
