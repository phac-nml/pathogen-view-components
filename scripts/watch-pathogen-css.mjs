import chokidar from "chokidar";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const args = new Set(process.argv.slice(2));
const once = args.has("--once");
const root = process.cwd();
const buildScript = resolve(root, "scripts/build-pathogen-tailwind.mjs");
const watchGlobs = [
  resolve(root, "app/assets/stylesheets/pathogen.tailwind.css"),
  resolve(root, "app/assets/stylesheets/pvc_datagrid_layer.css"),
  resolve(root, "app/components"),
  resolve(root, "app/assets/javascripts"),
];

function runBuild() {
  return new Promise((resolveBuild, rejectBuild) => {
    const child = spawn(process.execPath, [buildScript], {
      cwd: root,
      stdio: "inherit",
    });
    child.on("error", rejectBuild);
    child.on("exit", (code) => {
      if (code === 0) resolveBuild();
      else rejectBuild(new Error(`build exited with code ${code}`));
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

  const watcher = chokidar.watch(watchGlobs, { ignoreInitial: true });
  const onFsEvent = (event, filePath) => {
    void triggerBuild(`File ${event}: ${filePath}`);
  };
  watcher.on("add", (p) => onFsEvent("added", p));
  watcher.on("change", (p) => onFsEvent("changed", p));
  watcher.on("unlink", (p) => onFsEvent("removed", p));

  await triggerBuild("Initial build");

  process.on("SIGINT", async () => {
    await watcher.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("[build:css:watch] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
