import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { pathogenBuildOptions } from "../scripts/pathogen-esbuild-options.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const assets = new URL("./public/examples/", import.meta.url);
mkdirSync(assets, { recursive: true });

execFileSync("ruby", ["bin/bundle", "exec", "ruby", "catalog/render.rb"], {
  cwd: root,
  stdio: "inherit",
});
copyFileSync(
  new URL("../app/assets/stylesheets/pathogen_view_components.css", import.meta.url),
  new URL("pathogen.css", assets),
);
await build({
  ...pathogenBuildOptions({ pathogenRoot: root, hostRoot: root, production: true }),
  entryPoints: ["demo/app/javascript/application.js"],
  outfile: fileURLToPath(new URL("application.js", assets)),
});
