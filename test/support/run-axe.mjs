#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import axe from "axe-core";
import { JSDOM } from "jsdom";

const htmlPath = process.argv[2];

if (!htmlPath) {
  console.error("Usage: node test/support/run-axe.mjs <html-file>");
  process.exit(1);
}

const fragment = fs.readFileSync(htmlPath, "utf8");
const dom = new JSDOM(
  `<!DOCTYPE html><html lang="en"><head><title>Accessibility check</title></head><body>${fragment}</body></html>`,
  { url: "http://localhost/", runScripts: "outside-only" },
);

const { window } = dom;
const { document } = window;

globalThis.window = window;
globalThis.document = document;
globalThis.Node = window.Node;
globalThis.Element = window.Element;
globalThis.HTMLElement = window.HTMLElement;

window.eval(axe.source);

const results = await new Promise((resolve, reject) => {
  window.axe.run(
    document,
    {
      runOnly: {
        type: "rule",
        values: [
          "button-name",
          "link-name",
          "aria-command-name",
          "aria-allowed-attr",
          "aria-allowed-role",
          "aria-valid-attr",
          "aria-valid-attr-value",
          "duplicate-id",
          "nested-interactive",
        ],
      },
    },
    (error, axeResults) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(axeResults);
    },
  );
});

console.log(JSON.stringify(results.violations));
