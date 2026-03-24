import { bundle } from "lightningcss";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const root = process.cwd();
const inputPath = resolve(root, "app/assets/stylesheets/pathogen/index.css");
const outputPath = resolve(root, "app/assets/stylesheets/pathogen_view_components.css");
const outputHeader = `/* GENERATED FILE: built from app/assets/stylesheets/pathogen/index.css.\n * Internal source files under app/assets/stylesheets/pathogen/ are implementation detail.\n * Run pnpm run build:css after editing source files.\n */\n\n`;

async function main() {
  let source;
  try {
    source = await readFile(inputPath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      console.error("[build:css] Missing source entrypoint:", inputPath);
      console.error("[build:css] Run plan 03-02 to create the Pathogen CSS source tree.");
      process.exit(1);
    }
    throw error;
  }

  const result = bundle({
    filename: inputPath,
    code: source,
    minify: false,
    sourceMap: false,
    drafts: {
      nesting: true,
    },
  });

  if (checkOnly) {
    if (!result.code || result.code.length === 0) {
      throw new Error("[build:css:check] Lightning CSS returned empty output.");
    }
    console.log("[build:css:check] Tooling invocation succeeded.");
    return;
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, outputHeader + result.code.toString());
  console.log("[build:css] Wrote", outputPath);
}

main().catch((error) => {
  console.error("[build:css] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
