import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["test/javascript/**/*.{test,spec}.{js,ts}"],
    setupFiles: ["./test/javascript/setup.js"],
    passWithNoTests: true,
    clearMocks: true,
    restoreMocks: true,
  },
});
