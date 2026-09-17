import { resolve } from "node:path";

// The host owns runtime dependencies, including the single Stimulus instance.
// esbuild resolves aliases from absWorkingDir, so identity aliases select the
// host package while preserving its exports map (including browser conditions).
export function pathogenBuildOptions({ pathogenRoot, hostRoot, production = false }) {
  return {
    absWorkingDir: hostRoot,
    bundle: true,
    platform: "browser",
    format: "esm",
    target: "es2022",
    minify: production,
    sourcemap: !production,
    splitting: false,
    define: {
      "import.meta.env.DEV": JSON.stringify(!production),
      "process.env.NODE_ENV": JSON.stringify(production ? "production" : "development"),
    },
    alias: {
      pathogen_view_components: resolve(pathogenRoot, "app/assets/javascripts/pathogen_view_components"),
      "@hotwired/stimulus": "@hotwired/stimulus",
      "@hotwired/turbo-rails": "@hotwired/turbo-rails",
      "@floating-ui/dom": "@floating-ui/dom",
      uuid: "uuid",
    },
  };
}
