import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { pathogenBuildOptions } from "../../scripts/pathogen-esbuild-options.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const { stdout: html } = await promisify(execFile)("bundle", ["exec", "ruby", "test/browser/render_fixture.rb"], {
  cwd: root,
  maxBuffer: 8 * 1024 * 1024,
});
const { stdout: autoOpenHtml } = await promisify(execFile)(
  "bundle",
  ["exec", "ruby", "test/browser/render_fixture.rb", "--auto-open"],
  { cwd: root, maxBuffer: 8 * 1024 * 1024 },
);
const javascript = await build({
  ...pathogenBuildOptions({ pathogenRoot: root, hostRoot: root, production: true }),
  entryPoints: ["test/browser/host.js"],
  write: false,
});
const stylesheet = await readFile(
  new URL("../../app/assets/stylesheets/pathogen_view_components.css", import.meta.url),
);
const assets = new Map([
  ["/", { type: "text/html; charset=utf-8", body: html }],
  ["/auto-open", { type: "text/html; charset=utf-8", body: autoOpenHtml }],
  ["/host.js", { type: "text/javascript; charset=utf-8", body: javascript.outputFiles[0].contents }],
  ["/pathogen.css", { type: "text/css; charset=utf-8", body: stylesheet }],
]);

const server = createServer((request, response) => {
  const asset = assets.get(new URL(request.url, "http://127.0.0.1").pathname);
  if (!asset) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": asset.type, "Cache-Control": "no-store" });
  response.end(asset.body);
});
server.listen(4174, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, () => server.close());
