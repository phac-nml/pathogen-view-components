import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: { baseURL: "http://127.0.0.1:4322/pathogen-view-components/" },
  webServer: {
    command: "pnpm exec astro preview --ignore-lock --host 127.0.0.1 --port 4322",
    url: "http://127.0.0.1:4322/pathogen-view-components/",
    reuseExistingServer: false,
  },
});
