import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, sep } from "node:path";
import { build } from "esbuild";
import { JSDOM, VirtualConsole } from "jsdom";
import { pathogenBuildOptions } from "./pathogen-esbuild-options.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

// Bundle the fixture host against the extracted gem, mirroring a real esbuild host.
async function bundlePackagedHost(packagedRoot) {
  return build({
    ...pathogenBuildOptions({ pathogenRoot: packagedRoot, hostRoot: root, production: true }),
    entryPoints: ["test/javascript/fixtures/packaged_host.js"],
    write: false,
    metafile: true,
    logLevel: "silent",
  });
}

// The bundle must be self-contained, share one Stimulus, and consume the extracted gem.
function assertResolvedBundle(result, javascriptRoot) {
  assert.equal(result.warnings.length, 0, JSON.stringify(result.warnings));
  const imports = Object.values(result.metafile.outputs).flatMap((output) => output.imports);
  assert.deepEqual(imports, [], "The host bundle must resolve every runtime import");
  const inputs = Object.keys(result.metafile.inputs).map((input) => resolve(root, input));
  const stimulusInputs = inputs.filter((input) => input.endsWith("/dist/stimulus.js"));
  assert.equal(stimulusInputs.length, 1, "The host and gem must share one Stimulus implementation");
  const gemInputs = inputs.filter((input) => input.includes("/app/assets/javascripts/"));
  assert.ok(gemInputs.length > 0, "The bundle must include gem JavaScript");
  assert.ok(
    gemInputs.every((input) => input.startsWith(javascriptRoot + sep)),
    "The bundle must consume the extracted gem, not the working tree",
  );
}

// Derive the expected Stimulus identifiers from the shipped controller filenames.
async function shippedControllerIdentifiers(javascriptRoot) {
  return (await readdir(resolve(javascriptRoot, "pathogen_view_components")))
    .filter((name) => name.endsWith("_controller.js"))
    .map((name) => `pathogen--${name.replace(/_controller\.js$/, "").replaceAll("_", "-")}`)
    .sort();
}

// Run the bundle in jsdom and drive a disclosure toggle to prove it works end to end.
async function verifyBundledHost(bundleSource, shippedControllers) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error));
  virtualConsole.on("error", (...messages) => errors.push(new Error(messages.join(" "))));
  const markup = await readFile(resolve(root, "test/javascript/fixtures/packaged_host.html"), "utf8");
  const dom = new JSDOM(markup, {
    url: "http://localhost/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole,
  });
  try {
    dom.window.eval(bundleSource);
    const { application, Controller, registrations, controllerExports } = dom.window.pathogenHost;
    application.handleError = (error) => errors.push(error);
    const settle = () => new Promise((done) => dom.window.setTimeout(done, 0));
    await settle();
    await settle();
    assert.deepEqual(Array.from(registrations).sort(), shippedControllers);
    for (const exportedController of Object.values(controllerExports)) {
      assert.ok(exportedController.prototype instanceof Controller, "Named controllers must use host Stimulus");
    }
    assert.ok(dom.window.Turbo, "The host must provide Turbo");
    const element = dom.window.document.querySelector("[data-controller]");
    const controller = application.getControllerForElementAndIdentifier(element, "pathogen--disclosure");
    assert.ok(controller instanceof Controller, "The controller must use the host's Stimulus class");
    const button = element.querySelector("button");
    const panel = element.querySelector("[data-pathogen--disclosure-target='panel']");
    assert.equal(button.getAttribute("aria-expanded"), "false");
    assert.ok(panel.hidden);
    button.focus();
    button.click();
    await settle();
    assert.equal(button.getAttribute("aria-expanded"), "true");
    assert.equal(panel.hidden, false);
    assert.equal(dom.window.document.activeElement, button);
    button.click();
    await settle();
    assert.equal(button.getAttribute("aria-expanded"), "false");
    assert.ok(panel.hidden);
    application.stop();
    assert.deepEqual(errors, [], "The bundled host must run without runtime errors");
  } finally {
    dom.window.close();
  }
}

const packagedRoot = process.argv[2];
assert.ok(packagedRoot, "Pass the extracted gem directory");
const javascriptRoot = resolve(packagedRoot, "app/assets/javascripts");

const result = await bundlePackagedHost(packagedRoot);
assertResolvedBundle(result, javascriptRoot);
const shippedControllers = await shippedControllerIdentifiers(javascriptRoot);
await verifyBundledHost(result.outputFiles[0].text, shippedControllers);

console.log(
  `Packaged JavaScript verified: ${shippedControllers.length} controllers, working disclosure, shared Stimulus, no unresolved imports.`,
);
