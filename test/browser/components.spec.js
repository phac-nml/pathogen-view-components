import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#mixed-container")).toHaveAttribute("data-controller-connected", "true");
});

test("mixed panels retain their association through keyboard, URL, and reconnect", async ({ page }) => {
  const history = page.getByRole("tab", { name: "History" });
  const overview = page.getByRole("tab", { name: "Overview" });
  await expect(history).toHaveAttribute("aria-controls", "history-panel");
  await expect(page.locator("#history-panel")).toBeVisible();
  await history.focus();
  await page.keyboard.press("ArrowRight");
  await expect(overview).toBeFocused();
  await expect(page.locator("#overview-panel")).toBeVisible();
  await expect(page.locator("#history-panel")).toBeHidden();
  await page.evaluate(() => {
    location.hash = "history-panel";
  });
  await expect(history).toHaveAttribute("aria-selected", "true");
  await page.evaluate(async () => {
    const tabs = document.querySelector("#mixed-container");
    tabs.remove();
    await new Promise(requestAnimationFrame);
    document.querySelector("main").append(tabs);
  });
  await expect(history).toHaveAttribute("aria-controls", "history-panel");
  await expect(page.locator("#history-panel")).toBeVisible();
});

test("tooltip persists across mixed hover and focus, and Escape preserves focus", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "About analysis" });
  const other = page.getByRole("button", { name: "Another action" });
  const tooltip = page.locator("#fixture-tooltip");
  await trigger.hover();
  await trigger.focus();
  await other.hover();
  // Wait beyond the configured hide delay to test persistence, not just opening.
  await page.waitForTimeout(500);
  await expect(tooltip).toHaveAttribute("data-state", "open");
  await trigger.hover();
  await other.focus();
  await page.waitForTimeout(500);
  await expect(tooltip).toHaveAttribute("data-state", "open");
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveAttribute("data-state", "closed");
  await expect(other).toBeFocused();
});

test("bound forms expose selection and error relationships and enlarged radio targets work", async ({ page }) => {
  const radio = page.getByRole("radio", { name: "Dark theme" });
  await expect(radio).toBeChecked();
  await expect(radio).toHaveAttribute("aria-invalid", "true");
  await expect(radio).toHaveAccessibleDescription("Change appearance Choose an available theme");
  const medium = page.getByRole("radio", { name: "medium option" });
  await expect(medium).not.toBeChecked();
  await medium.locator("..").click({ position: { x: 2, y: 2 } });
  await expect(medium).toBeChecked();
  const control = page.getByRole("switch", { name: "medium updates" });
  await control.focus();
  await page.keyboard.press("Space");
  await expect(control).toBeChecked();
});

test("default and compact activation areas meet their minimum dimensions", async ({ page }) => {
  for (const size of ["medium", "small"]) {
    const minimum = size === "medium" ? 44 : 24;
    for (const kind of ["toolbar", "radio", "switch"]) {
      const control = page.locator(`#${kind}-${size}`);
      const target =
        kind === "radio"
          ? control.locator("..")
          : kind === "switch"
            ? page.locator(`#${kind}-${size} + label`)
            : control;
      const bounds = await target.boundingBox();
      expect(bounds.width, `${kind} ${size} width`).toBeGreaterThanOrEqual(minimum);
      expect(bounds.height, `${kind} ${size} height`).toBeGreaterThanOrEqual(minimum);
    }
  }
  for (const tab of await page.getByRole("tab").all()) {
    const bounds = await tab.boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
});

async function switchContrast(page) {
  return page
    .locator("section.light .pathogen-switch-track, section.dark .pathogen-switch-track")
    .evaluateAll((tracks) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d");
      const luminance = (color, backdrop) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = backdrop;
        context.fillRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data]
          .slice(0, 3)
          .map((value) => {
            value /= 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
      };
      const contrast = (a, b, backdrop) => {
        const values = [luminance(a, backdrop), luminance(b, backdrop)].sort((a, b) => b - a);
        return (values[0] + 0.05) / (values[1] + 0.05);
      };
      return tracks.map((track) => {
        const style = getComputedStyle(track);
        const surface = getComputedStyle(track.closest("section")).backgroundColor;
        return {
          colors: {
            border: style.borderColor,
            track: style.backgroundColor,
            thumb: getComputedStyle(track, "::after").backgroundColor,
          },
          boundary: contrast(style.borderColor, surface, surface),
          thumb: contrast(getComputedStyle(track, "::after").backgroundColor, style.backgroundColor, surface),
        };
      });
    });
}

for (const forcedColors of ["none", "active"]) {
  test(`switch state indicators remain distinguishable with forced colours ${forcedColors}`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ forcedColors });
    for (const result of await switchContrast(page)) {
      expect(result.boundary).toBeGreaterThanOrEqual(3);
      expect(result.thumb, JSON.stringify(result.colors)).toBeGreaterThanOrEqual(3);
    }
    if (forcedColors === "active") {
      const path = testInfo.outputPath("forced-colours.png");
      await page.screenshot({ path, fullPage: true });
      await testInfo.attach("forced-colours", { path, contentType: "image/png" });
    }
  });
}

test("rendered fixture has no automated WCAG A/AA violations", async ({ page }, testInfo) => {
  await page.addScriptTag({ url: "/axe.js" });
  const results = await page.evaluate(() =>
    window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
    }),
  );
  const path = testInfo.outputPath("axe-results.json");
  await writeFile(path, JSON.stringify(results, null, 2));
  await testInfo.attach("axe-results", { path, contentType: "application/json" });
  expect(results.violations).toEqual([]);
  // Incomplete results are retained for manual review, not counted as passes.
});

test("320px reflow with text spacing and reduced motion retains operation", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addStyleTag({
    content:
      "* { line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important } p { margin-bottom:2em!important }",
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const control = page.getByRole("switch", { name: "medium updates" });
  await control.focus();
  await page.keyboard.press("Space");
  await expect(control).toBeChecked();
  expect(
    await page
      .locator(".pathogen-switch-track")
      .first()
      .evaluate((track) => getComputedStyle(track, "::after").transitionDuration),
  ).toBe("0s");
  const path = testInfo.outputPath("320px-text-spacing.png");
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach("320px-text-spacing", { path, contentType: "image/png" });
});
