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
      "pathogen_view_components/toolbar_controller/constants": resolve(jsRoot, "toolbar_controller/constants.js"),
      "pathogen_view_components/toolbar_controller/menu_popup": resolve(jsRoot, "toolbar_controller/menu_popup.js"),
      "pathogen_view_components/toolbar_controller/roving_focus": resolve(jsRoot, "toolbar_controller/roving_focus.js"),
      "pathogen_view_components/toolbar_controller/text_entry": resolve(jsRoot, "toolbar_controller/text_entry.js"),
      "pathogen_view_components/toolbar_controller/visibility": resolve(jsRoot, "toolbar_controller/visibility.js"),
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
