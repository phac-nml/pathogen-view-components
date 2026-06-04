import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { format, resolveConfig } from "prettier";

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const root = process.cwd();
const inputPath = resolve(root, "app/assets/stylesheets/pathogen.tailwind.css");
const outputPath = resolve(root, "app/assets/stylesheets/pathogen_view_components.css");
const outputHeader = `/* GENERATED FILE: built from app/assets/stylesheets/pathogen.tailwind.css via Tailwind CSS.\n * Run pnpm run build:css after changing components or pathogen.tailwind.css.\n */\n\n`;

function runTailwindBuild(targetPath = outputPath) {
  return new Promise((resolveBuild, rejectBuild) => {
    const child = spawn("pnpm", ["exec", "tailwindcss", "-i", inputPath, "-o", targetPath], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env },
    });
    child.on("error", rejectBuild);
    child.on("exit", (code) => {
      if (code === 0) resolveBuild();
      else rejectBuild(new Error(`tailwindcss exited with code ${code}`));
    });
  });
}

async function formatOutput(css) {
  const prettierConfig = await resolveConfig(outputPath);
  return format(css, { ...prettierConfig, filepath: outputPath });
}

async function main() {
  let previous = null;
  let buildOutputPath = outputPath;
  let tempDir = null;

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

    tempDir = await mkdtemp(resolve(tmpdir(), "pathogen-css-check-"));
    buildOutputPath = resolve(tempDir, "pathogen_view_components.css");
  }

  try {
    await runTailwindBuild(buildOutputPath);

    let css = await readFile(buildOutputPath, "utf8");
    if (!css.startsWith("/* GENERATED FILE:")) {
      css = outputHeader + css;
    }
    css = await formatOutput(css);

    if (checkOnly) {
      if (previous !== css) {
        console.error("[build:css:check] Output file is stale.");
        console.error("[build:css:check] Run `pnpm run build:css` and commit the result.");
        process.exitCode = 1;
        return;
      }
      console.log("[build:css:check] Output file is up to date.");
      return;
    }

    await writeFile(outputPath, css);
    console.log("[build:css] Wrote", outputPath);
  } finally {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("[build:css] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
