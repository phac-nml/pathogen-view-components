import { build, context } from "esbuild";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { pathogenBuildOptions } from "./pathogen-esbuild-options.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const production = process.env.NODE_ENV === "production" || process.env.RAILS_ENV === "production";
const options = {
  ...pathogenBuildOptions({ pathogenRoot: root, hostRoot: root, production }),
  absWorkingDir: root,
  entryPoints: {
    application: "demo/app/javascript/application.js",
    lookbook_preview: "demo/app/javascript/lookbook_preview.js",
  },
  outdir: resolve(root, "demo/app/assets/builds"),
  logLevel: "info",
};

try {
  if (process.argv.includes("--watch")) {
    const watcher = await context(options);
    await watcher.watch();
    const stop = async () => {
      await watcher.dispose();
      process.exit(0);
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  } else {
    await build(options);
  }
} catch (error) {
  console.error("[build:js] Failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
