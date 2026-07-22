import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { fileURLToPath } from "url";

const jsRoot = resolve(fileURLToPath(new URL("app/assets/javascripts/pathogen_view_components", import.meta.url)));

export default defineConfig({
  resolve: {
    alias: {
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
  },
});
