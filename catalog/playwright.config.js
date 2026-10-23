import { defineConfig } from "@playwright/test";
import { base } from "./base.mjs";

const baseURL = `http://127.0.0.1:4322${base}/`;

export default defineConfig({
  testDir: "./tests",
  use: { baseURL },
  webServer: {
    command: "pnpm exec astro preview --ignore-lock --host 127.0.0.1 --port 4322",
    url: baseURL,
    reuseExistingServer: false,
  },
});
