import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const root = process.cwd();
const inputPath = resolve(root, "app/assets/stylesheets/pathogen.tailwind.css");
const outputPath = resolve(root, "app/assets/stylesheets/pathogen_view_components.css");
const outputHeader = `/* GENERATED FILE: built from app/assets/stylesheets/pathogen.tailwind.css via Tailwind CSS.\n * Run pnpm run build:css after changing components or pathogen.tailwind.css.\n */\n\n`;

function runTailwindBuild() {
  return new Promise((resolveBuild, rejectBuild) => {
    const child = spawn(
      "pnpm",
      ["exec", "tailwindcss", "-i", inputPath, "-o", outputPath],
      {
        cwd: root,
        stdio: "inherit",
        env: { ...process.env },
      },
    );
    child.on("error", rejectBuild);
    child.on("exit", (code) => {
      if (code === 0) resolveBuild();
      else rejectBuild(new Error(`tailwindcss exited with code ${code}`));
    });
  });
}

async function main() {
  let previous = null;
  if (checkOnly) {
    try {
      previous = await readFile(outputPath, "utf8");
    } catch (error) {
      if (error && error.code === "ENOENT") {
        console.error("[build:css:check] Output file missing:", outputPath);
        console.error("[build:css:check] Run `pnpm run build:css` to generate it.");
        process.exit(1);
      }
      throw error;
    }
  }

  await runTailwindBuild();

  let css = await readFile(outputPath, "utf8");
  if (!css.startsWith("/* GENERATED FILE:")) {
    css = outputHeader + css;
    await writeFile(outputPath, css);
  }

  if (checkOnly) {
    if (previous !== css) {
      console.error("[build:css:check] Output file is stale.");
      console.error("[build:css:check] Run `pnpm run build:css` and commit the result.");
      process.exit(1);
    }
    console.log("[build:css:check] Output file is up to date.");
    return;
  }

  console.log("[build:css] Wrote", outputPath);
}

main().catch((error) => {
  console.error("[build:css] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
