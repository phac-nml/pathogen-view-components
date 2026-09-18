import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { fileURLToPath } from "url";

const jsRoot = resolve(fileURLToPath(new URL("app/assets/javascripts/pathogen_view_components", import.meta.url)));
const demoJsRoot = resolve(fileURLToPath(new URL("demo/app/javascript", import.meta.url)));

// Per-file coverage ratchet: files reach 100% one at a time, get added to the
// allowlist below, and then fail CI if they ever regress.
const FULL_COVERAGE = { statements: 100, branches: 100, functions: 100, lines: 100 };
const RATCHET_ALLOWLIST = {
  "app/assets/javascripts/pathogen_view_components/data_grid_controller.js": FULL_COVERAGE,
  "app/assets/javascripts/pathogen_view_components/data_grid_controller/cell_index.js": FULL_COVERAGE,
  "app/assets/javascripts/pathogen_view_components/data_grid_controller/page_cache.js": FULL_COVERAGE,
  "app/assets/javascripts/pathogen_view_components/data_grid_controller/page_source.js": FULL_COVERAGE,
  "app/assets/javascripts/pathogen_view_components/data_grid_controller/paginated_virtual_rows.js": FULL_COVERAGE,
  "app/assets/javascripts/pathogen_view_components/data_grid_controller/pagination_mode.js": FULL_COVERAGE,
  "app/assets/javascripts/pathogen_view_components/data_grid_controller/virtual_columns.js": FULL_COVERAGE,
  "app/assets/javascripts/pathogen_view_components/data_grid_controller/virtual_viewport.js": FULL_COVERAGE,
  "app/assets/javascripts/pathogen_view_components/data_grid_controller/virtual_window.js": FULL_COVERAGE,
  "app/assets/javascripts/pathogen_view_components/data_grid_controller/virtualizer.js": FULL_COVERAGE,
  "app/assets/javascripts/pathogen_view_components/data_grid_controller/widget_mode.js": FULL_COVERAGE,
};

export default defineConfig({
  resolve: {
    alias: {
      application: resolve(demoJsRoot, "application.js"),
      "lookbook_mocks/tabs_lazy_load": resolve(demoJsRoot, "lookbook_mocks/tabs_lazy_load.js"),
      "pathogen_view_components/data_grid_controller/virtual_viewport": resolve(
        jsRoot,
        "data_grid_controller/virtual_viewport.js",
      ),
      "pathogen_view_components/data_grid_controller/cell_index": resolve(jsRoot, "data_grid_controller/cell_index.js"),
      "pathogen_view_components/data_grid_controller/navigation": resolve(jsRoot, "data_grid_controller/navigation.js"),
      "pathogen_view_components/data_grid_controller/scroll": resolve(jsRoot, "data_grid_controller/scroll.js"),
      "pathogen_view_components/data_grid_controller/widget_mode": resolve(
        jsRoot,
        "data_grid_controller/widget_mode.js",
      ),
      "pathogen_view_components/data_grid_controller/virtualizer": resolve(
        jsRoot,
        "data_grid_controller/virtualizer.js",
      ),
      "pathogen_view_components/data_grid_controller/page_cache": resolve(jsRoot, "data_grid_controller/page_cache.js"),
      "pathogen_view_components/data_grid_controller/page_source": resolve(
        jsRoot,
        "data_grid_controller/page_source.js",
      ),
      "pathogen_view_components/data_grid_controller/paginated_virtual_rows": resolve(
        jsRoot,
        "data_grid_controller/paginated_virtual_rows.js",
      ),
      "pathogen_view_components/data_grid_controller/pagination_mode": resolve(
        jsRoot,
        "data_grid_controller/pagination_mode.js",
      ),
      "pathogen_view_components/data_grid_controller/virtual_window": resolve(
        jsRoot,
        "data_grid_controller/virtual_window.js",
      ),
      "pathogen_view_components/data_grid_controller/virtual_columns": resolve(
        jsRoot,
        "data_grid_controller/virtual_columns.js",
      ),
      "pathogen_view_components/toolbar_controller/constants": resolve(jsRoot, "toolbar_controller/constants.js"),
      "pathogen_view_components/toolbar_controller/roving_focus": resolve(jsRoot, "toolbar_controller/roving_focus.js"),
      "pathogen_view_components/toolbar_controller/text_entry": resolve(jsRoot, "toolbar_controller/text_entry.js"),
      "pathogen_view_components/toolbar_controller/visibility": resolve(jsRoot, "toolbar_controller/visibility.js"),
      "pathogen_view_components/tabs_controller": resolve(jsRoot, "tabs_controller.js"),
      "pathogen_view_components/tooltip_controller": resolve(jsRoot, "tooltip_controller.js"),
      "pathogen_view_components/disclosure_controller": resolve(jsRoot, "disclosure_controller.js"),
      "pathogen_view_components/data_grid_controller": resolve(jsRoot, "data_grid_controller.js"),
      "pathogen_view_components/sidebar_controller": resolve(jsRoot, "sidebar_controller.js"),
      "pathogen_view_components/toolbar_controller": resolve(jsRoot, "toolbar_controller.js"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["test/javascript/**/*.{test,spec}.{js,ts}"],
    setupFiles: ["./test/javascript/setup.js"],
    passWithNoTests: true,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      all: true,
      include: [
        "app/assets/javascripts/pathogen_view_components/**/*.js",
        "app/assets/javascripts/pathogen_view_components.js",
      ],
      // "text" prints the per-file table with uncovered line numbers plus a
      // summary; "json-summary" feeds the CI PR comment and "lcov" feeds Codecov.
      reporter: ["text", "json-summary", "html", "lcov"],
      reportsDirectory: "coverage",
      // Allowlisted files are enforced at 100% on every run (including CI's
      // `pnpm test:coverage`). Opt into `pnpm test:coverage:strict` locally to
      // demand 100% across every included file, not just the allowlist.
      thresholds: {
        ...RATCHET_ALLOWLIST,
        ...(process.env.VITEST_STRICT_COVERAGE === "1" ? { ...FULL_COVERAGE, perFile: true } : {}),
      },
    },
  },
});
