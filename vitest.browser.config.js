import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import unitConfig from "./vitest.config.js";

// Real-browser tests for behaviour jsdom cannot show: layout, the top layer,
// native <dialog> focus handling, media features, and rendered colour.
// Run with `pnpm test:browser` (needs `pnpm exec playwright install chromium` once).
export default defineConfig({
  resolve: unitConfig.resolve,
  test: {
    include: ["test/browser/**/*.test.js"],
    restoreMocks: true,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      viewport: { width: 1440, height: 900 },
      screenshotFailures: false,
    },
  },
});
