import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { build } from "esbuild";

const directory = mkdtempSync(join(tmpdir(), "pathogen-browser-"));
process.on("exit", () => rmSync(directory, { recursive: true, force: true }));
process.on("SIGTERM", () => process.exit(0));
execFileSync("bundle", ["exec", "ruby", "test/browser/render.rb", join(directory, "index.html")], { stdio: "inherit" });
await build({
  entryPoints: ["test/browser/entry.js"],
  bundle: true,
  format: "iife",
  nodePaths: [resolve("app/assets/javascripts")],
  define: { "import.meta.env.DEV": "false" },
  outfile: join(directory, "fixture.js"),
});
const require = createRequire(import.meta.url);
const files = new Map([
  ["/", [join(directory, "index.html"), "text/html"]],
  ["/fixture.js", [join(directory, "fixture.js"), "text/javascript"]],
  ["/pathogen.css", ["app/assets/stylesheets/pathogen_view_components.css", "text/css"]],
  ["/axe.js", [require.resolve("axe-core/axe.min.js"), "text/javascript"]],
]);
createServer((request, response) => {
  const file = files.get(request.url);
  if (!file) return response.writeHead(404).end();
  response.writeHead(200, { "Content-Type": file[1], "Cache-Control": "no-store" });
  response.end(readFileSync(file[0]));
}).listen(4179, "127.0.0.1");
