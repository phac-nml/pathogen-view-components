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

const WCAG_AA_RUN_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa", "best-practice"];

// ViewComponent fragment checks run against partial markup, so rules that
// require document-level structure (like a page <h1>) are excluded by default.
const EXCLUDED_RULES = ["page-has-heading-one"];

const results = await new Promise((resolve, reject) => {
  window.axe.run(
    document,
    {
      runOnly: {
        type: "tag",
        values: WCAG_AA_RUN_TAGS,
      },
      rules: Object.fromEntries(EXCLUDED_RULES.map((ruleId) => [ruleId, { enabled: false }])),
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
