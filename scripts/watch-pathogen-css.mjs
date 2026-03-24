import chokidar from "chokidar";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const args = new Set(process.argv.slice(2));
const once = args.has("--once");
const root = process.cwd();
const buildScript = resolve(root, "scripts/build-pathogen-css.mjs");
const watchGlob = resolve(root, "app/assets/stylesheets/pathogen/**/*.css");

function runBuild() {
  return new Promise((resolveBuild, rejectBuild) => {
    const child = spawn(process.execPath, [buildScript], {
      cwd: root,
      stdio: "inherit",
    });

    child.on("error", rejectBuild);
    child.on("exit", (code) => {
      if (code === 0) {
        resolveBuild();
      } else {
        rejectBuild(new Error(`build exited with code ${code}`));
      }
    });
  });
}

async function main() {
  if (once) {
    await runBuild();
    return;
  }

  let running = false;
  let queued = false;

  const triggerBuild = async (reason) => {
    if (running) {
      queued = true;
      return;
    }

    running = true;
    console.log(`[build:css:watch] ${reason}`);

    try {
      await runBuild();
    } catch (error) {
      console.error("[build:css:watch] Build failed:", error instanceof Error ? error.message : error);
    } finally {
      running = false;
      if (queued) {
        queued = false;
        void triggerBuild("Rebuilding queued changes");
      }
    }
  };

  const watcher = chokidar.watch(watchGlob, {
    ignoreInitial: false,
  });

  watcher.on("add", () => void triggerBuild("File added"));
  watcher.on("change", () => void triggerBuild("File changed"));
  watcher.on("unlink", () => void triggerBuild("File removed"));

  process.on("SIGINT", async () => {
    await watcher.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("[build:css:watch] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
