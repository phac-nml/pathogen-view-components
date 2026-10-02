import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const dialog = (page) => page.locator("#main-dialog");
const target = (page, name) => dialog(page).locator(`[data-pathogen--dialog-target~="${name}"]`).first();

async function openDialog(page) {
  await page.goto("/");
  await page.waitForFunction(() => {
    const root = document.querySelector("#main-dialog").closest('[data-controller~="pathogen--dialog"]');
    return window.pathogenBrowser?.application.getControllerForElementAndIdentifier(root, "pathogen--dialog");
  });
  await page.locator("#main-trigger").click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page)).toHaveJSProperty("open", true);
}

async function fullyVisible(locator, container) {
  const box = await locator.boundingBox();
  const area = container
    ? await container.boundingBox()
    : await locator.page().evaluate(() => ({ x: 0, y: 0, width: innerWidth, height: innerHeight }));
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(area.x - 1);
  expect(box.y).toBeGreaterThanOrEqual(area.y - 1);
  expect(box.x + box.width).toBeLessThanOrEqual(area.x + area.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(area.y + area.height + 1);
}

test("native modality, initial focus, Tab containment and return focus", async ({ page }) => {
  await openDialog(page);
  expect(await dialog(page).evaluate((element) => element.matches(":modal"))).toBe(true);
  await expect(page.locator("#main-dialog-title")).toBeFocused();
  await page.locator("#background-action").evaluate((element) => element.focus());
  await expect(page.locator("#main-dialog-title")).toBeFocused();
  for (const key of ["Tab", "Tab", "Tab", "Tab", "Tab", "Tab", "Tab", "Tab", "Shift+Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    expect(await dialog(page).evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.locator("#main-dialog-title").focus();
  await expect(page.getByRole("tooltip", { includeHidden: true })).toHaveAttribute("data-state", "closed");
  await page.keyboard.press("Escape");
  await expect(dialog(page)).not.toBeVisible();
  await expect(page.locator("#main-trigger")).toBeFocused();
});

test("only body scrolls, actions stay visible, and scrolling does not move the page", async ({
  page,
  browserName,
}, testInfo) => {
  await openDialog(page);
  const body = target(page, "body");
  expect(await body.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  const headerBefore = await target(page, "header").boundingBox();
  const footerBefore = await target(page, "footer").boundingBox();
  const pageBefore = await page.evaluate(() => scrollY);
  await page.locator("#last-body-action").focus();
  expect(await body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await fullyVisible(page.locator("#last-body-action"), body);
  expect((await target(page, "header").boundingBox()).y).toBeCloseTo(headerBefore.y, 1);
  expect((await target(page, "footer").boundingBox()).y).toBeCloseTo(footerBefore.y, 1);
  await fullyVisible(page.locator("#save-project"));
  if (browserName === "webkit" && testInfo.project.use.isMobile) {
    // Playwright does not support wheel input in mobile WebKit. Keyboard input
    // still verifies boundary scrolling; physical touch remains a manual check.
    await body.focus();
    await page.keyboard.press("PageDown");
  } else {
    await body.hover();
    await page.mouse.wheel(0, 1000);
  }
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => scrollY)).toBe(pageBefore);
});

test("footer submit reaches the body form and leaves closing to the host", async ({ page }) => {
  await openDialog(page);
  await page.locator("#project-name").fill("Updated project");
  await page.locator("#save-project").click();
  await expect(page.locator("#form-status")).toHaveText("Saved project name");
  await expect(dialog(page)).toBeVisible();
});

test("close requests are cancelable and preserve the Escape reason", async ({ page }) => {
  await openDialog(page);
  await page.evaluate(() => {
    document
      .querySelector("#main-dialog")
      .closest('[data-controller~="pathogen--dialog"]')
      .addEventListener("pathogen--dialog:before-close", (event) => event.preventDefault(), { once: true });
  });
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeVisible();
  expect(await page.evaluate(() => window.pathogenBrowser.events.at(-1))).toMatchObject({
    name: "before-close",
    reason: "escape",
  });
  await page.keyboard.press("Escape");
  await expect(dialog(page)).not.toBeVisible();
  const events = await page.evaluate(() => window.pathogenBrowser.events.map((event) => event.name));
  expect(events).toEqual(["opened", "before-close", "before-close", "closed"]);
});

test("backdrop presses are disabled and dragging from content does not dismiss", async ({ page }) => {
  await openDialog(page);
  await page.mouse.click(1, 1);
  await expect(dialog(page)).toBeVisible();
  const box = await page.locator("#main-dialog-title").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(1, 1);
  await page.mouse.up();
  await expect(dialog(page)).toBeVisible();
});

test("stacked dialogs contain focus and Escape closes only the top dialog", async ({ page }) => {
  await openDialog(page);
  await page.locator("#child-trigger").click();
  const child = page.locator("#child-dialog");
  await expect(child).toBeVisible();
  await expect(page.locator("#child-reference")).toBeFocused();
  await page.locator("#project-name").evaluate((element) => element.focus());
  expect(await child.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(child).not.toBeVisible();
  await expect(dialog(page)).toBeVisible();
  await expect(page.locator("#child-trigger")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).not.toBeVisible();
  await expect(page.locator("#main-trigger")).toBeFocused();
});

test("explicit initial and return focus work when the opener has been removed", async ({ page }) => {
  await page.goto("/");
  await page.locator("#fallback-trigger").click();
  await expect(page.locator("#fallback-field")).toBeFocused();
  await page.locator("#fallback-trigger").evaluate((element) => element.remove());
  await page.keyboard.press("Escape");
  await expect(page.locator("#return-focus")).toBeFocused();
});

test("an initial focus target near the end of long content is fully visible", async ({ page }) => {
  await page.goto("/");
  await page.locator("#main-dialog").evaluate((element) => {
    element
      .closest('[data-controller~="pathogen--dialog"]')
      .setAttribute("data-pathogen--dialog-initial-focus-value", "#last-body-action");
  });
  await page.locator("#main-trigger").click();
  await expect(page.locator("#last-body-action")).toBeFocused();
  await fullyVisible(page.locator("#last-body-action"), target(page, "body"));
});

test("sibling native dialogs leave only the most recently opened modal interactive", async ({ page }) => {
  await openDialog(page);
  await page.evaluate(() => {
    const root = document.querySelector("#fallback-dialog").closest('[data-controller~="pathogen--dialog"]');
    window.pathogenBrowser.application.getControllerForElementAndIdentifier(root, "pathogen--dialog").open();
  });
  await expect(page.locator("#fallback-field")).toBeFocused();
  await page.locator("#project-name").evaluate((element) => element.focus());
  await expect(page.locator("#fallback-field")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#fallback-dialog")).not.toBeVisible();
  await expect(dialog(page)).toBeVisible();
  await expect(page.locator("#main-dialog-title")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).not.toBeVisible();
});

test("tooltip remains in the modal and consumes Escape before the dialog", async ({ page }) => {
  await openDialog(page);
  await page.locator("#tooltip-trigger").focus();
  const tooltip = page.getByRole("tooltip", { includeHidden: true });
  await expect(tooltip).toHaveAttribute("data-state", "open");
  expect(await tooltip.evaluate((element) => Boolean(element.closest("dialog:modal")))).toBe(true);
  await fullyVisible(tooltip);
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveAttribute("data-state", "closed");
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).not.toBeVisible();
});

test("a parent tooltip cannot consume Escape intended for an open child dialog", async ({ page }) => {
  await openDialog(page);
  await page.locator("#tooltip-trigger").focus();
  await expect(page.getByRole("tooltip", { includeHidden: true })).toHaveAttribute("data-state", "open");
  await page.evaluate(() => {
    const root = document.querySelector("#child-dialog").closest('[data-controller~="pathogen--dialog"]');
    window.pathogenBrowser.application.getControllerForElementAndIdentifier(root, "pathogen--dialog").open();
  });
  await expect(page.locator("#child-reference")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#child-dialog")).not.toBeVisible();
  await expect(dialog(page)).toBeVisible();
});

test("short viewports use a reachable panel scrolling fallback", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 180 });
  await openDialog(page);
  const panel = target(page, "panel");
  await expect(panel).toHaveAttribute("data-scroll-mode", "panel");
  expect(await panel.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await page.locator("#save-project").focus();
  await fullyVisible(page.locator("#save-project"), panel);
  await dialog(page).getByRole("button", { name: "Close dialog", exact: true }).focus();
  await fullyVisible(dialog(page).getByRole("button", { name: "Close dialog", exact: true }), panel);
  await page.keyboard.press("Escape");
  await expect(dialog(page)).not.toBeVisible();
});

test("320px reflow and WCAG text spacing preserve content and actions", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await openDialog(page);
  await page.addStyleTag({
    content:
      '* { font-family: "DejaVu Sans", sans-serif !important; line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }',
  });
  await test.info().attach("dialog-narrow.png", { body: await page.screenshot(), contentType: "image/png" });
  expect(await dialog(page).evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  expect(await target(page, "body").evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await fullyVisible(page.locator("#save-project"));
  await page.locator("#last-body-action").focus();
  await fullyVisible(page.locator("#last-body-action"), target(page, "body"));
});

test("200% text sizing keeps close, body and footer usable", async ({ page, browserName }, testInfo) => {
  await openDialog(page);
  // A broad fallback font exercises the wrapping that differed between local
  // Noto Sans and the CI runner's default font.
  await page.addStyleTag({ content: '* { font-family: "DejaVu Sans", sans-serif !important; }' });
  await page.evaluate(() => {
    const sizes = [...document.querySelectorAll("body *")].map((element) => [
      element,
      parseFloat(getComputedStyle(element).fontSize),
    ]);
    for (const [element, size] of sizes) element.style.setProperty("font-size", `${size * 2}px`, "important");
  });
  if (browserName === "webkit" && testInfo.project.use.isMobile) {
    await expect(target(page, "panel")).toHaveAttribute("data-scroll-mode", "panel");
  }
  const scroller =
    (await target(page, "panel").getAttribute("data-scroll-mode")) === "panel"
      ? target(page, "panel")
      : target(page, "body");
  const close = dialog(page).getByRole("button", { name: "Close dialog", exact: true });
  await close.focus();
  await fullyVisible(close);
  await page.locator("#save-project").focus();
  await fullyVisible(page.locator("#save-project"));
  expect(await dialog(page).evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  expect(await scroller.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.locator("#last-body-action").focus();
  await fullyVisible(page.locator("#last-body-action"), scroller);
  await close.focus();
  await fullyVisible(close);
  await close.click();
  await expect(dialog(page)).not.toBeVisible();
});

test("400% zoom reflow keeps close, footer and focused controls visible", async ({ page }) => {
  // A 400% zoomed desktop viewport has roughly the CSS dimensions of a
  // 320px-wide, short viewport. Enlarged text exercises that state together
  // with the layout's visualViewport-based scrolling fallback.
  await page.setViewportSize({ width: 320, height: 200 });
  await openDialog(page);
  await page.addStyleTag({ content: '* { font-family: "DejaVu Sans", sans-serif !important; }' });
  await page.evaluate(() => {
    const sizes = [...document.querySelectorAll("body *")].map((element) => [
      element,
      parseFloat(getComputedStyle(element).fontSize),
    ]);
    for (const [element, size] of sizes) element.style.setProperty("font-size", `${size * 2}px`, "important");
  });

  const panel = target(page, "panel");
  const footer = target(page, "footer");
  const close = dialog(page).getByRole("button", { name: "Close dialog", exact: true });
  await expect(panel).toHaveAttribute("data-scroll-mode", "panel");
  const scroller = (await panel.getAttribute("data-scroll-mode")) === "panel" ? panel : target(page, "body");

  await close.focus();
  await fullyVisible(close, panel);
  await page.locator("#save-project").focus();
  await fullyVisible(page.locator("#save-project"), scroller);
  await fullyVisible(footer, panel);
  await page.locator("#last-body-action").focus();
  await fullyVisible(page.locator("#last-body-action"), scroller);
  await close.focus();
  await fullyVisible(close, panel);
});

for (const scheme of ["light", "dark"]) {
  test(`${scheme} mode has no automated AA violations and a measured close focus indicator`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), scheme === "dark");
    await page.locator("#main-trigger").click();
    await expect(dialog(page)).toBeVisible();
    await testInfo.attach(`dialog-${scheme}.png`, { body: await page.screenshot(), contentType: "image/png" });
    await page.addScriptTag({ path: axePath });
    const results = await page.evaluate(async () =>
      window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
      }),
    );
    await testInfo.attach(`axe-${scheme}.json`, {
      body: JSON.stringify(results, null, 2),
      contentType: "application/json",
    });
    expect(results.violations).toEqual([]);

    const close = dialog(page).getByRole("button", { name: "Close dialog", exact: true });
    await page.keyboard.press("Tab");
    await close.focus();
    const measurements = await close.evaluate((element) => {
      const style = getComputedStyle(element);
      const panelStyle = getComputedStyle(element.closest("dialog"));
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d");
      const rgb = (color) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
      };
      const luminance = (color) =>
        rgb(color)
          .map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          })
          .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
      const focus = luminance(style.outlineColor);
      const surface = luminance(panelStyle.backgroundColor);
      const box = element.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        outlineWidth: parseFloat(style.outlineWidth),
        outlineStyle: style.outlineStyle,
        focusVisible: element.matches(":focus-visible"),
        contrast: (Math.max(focus, surface) + 0.05) / (Math.min(focus, surface) + 0.05),
      };
    });
    await testInfo.attach(`focus-${scheme}.json`, {
      body: JSON.stringify(measurements, null, 2),
      contentType: "application/json",
    });
    expect(measurements.width).toBeGreaterThanOrEqual(44);
    expect(measurements.height).toBeGreaterThanOrEqual(44);
    expect(measurements.focusVisible).toBe(true);
    expect(measurements.outlineStyle).toBe("solid");
    expect(measurements.outlineWidth).toBeGreaterThanOrEqual(2);
    expect(measurements.contrast).toBeGreaterThanOrEqual(3);
    await fullyVisible(close);
  });
}

test("reduced motion avoids animation and preserves visible focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDialog(page);
  const timing = await dialog(page).evaluate((element) => {
    const style = getComputedStyle(element);
    return [...style.animationDuration.split(","), ...style.transitionDuration.split(",")].map(parseFloat);
  });
  expect(timing.every((duration) => duration === 0)).toBe(true);
  await page.keyboard.press("Tab");
  const close = dialog(page).getByRole("button", { name: "Close dialog", exact: true });
  await close.focus();
  expect(await close.evaluate((element) => parseFloat(getComputedStyle(element).outlineWidth))).toBeGreaterThanOrEqual(
    2,
  );
});

test("long static content has a named keyboard scroll stop and no content controls", async ({ page }) => {
  await page.goto("/");
  await page.locator("#static-trigger").click();
  const staticDialog = page.locator("#static-dialog");
  const body = staticDialog.locator('[data-pathogen--dialog-target~="body"]');
  await expect(page.locator("#static-dialog-title")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(staticDialog.getByRole("button", { name: "Close dialog", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(body).toBeFocused();
  await expect(body).toHaveAttribute("role", "region");
  await expect(body).toHaveAccessibleName("Static laboratory guidance");
  expect(await body.locator("button, input, textarea, select, a[href]").count()).toBe(0);
  await page.keyboard.press("PageDown");
  await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press("End");
  await expect
    .poll(() => body.evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop))
    .toBeLessThanOrEqual(1);
  await fullyVisible(body.locator("section").last(), body);
  await page.keyboard.press("Escape");
  await expect(staticDialog).not.toBeVisible();
  await expect(page.locator("#static-trigger")).toBeFocused();
});

test("resizing between body and panel scrolling preserves focused control", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 800 });
  await openDialog(page);
  await page.locator("#save-project").focus();
  const panel = target(page, "panel");
  await expect(panel).toHaveAttribute("data-scroll-mode", "body");
  await page.setViewportSize({ width: 600, height: 180 });
  await expect(panel).toHaveAttribute("data-scroll-mode", "panel");
  await expect(page.locator("#save-project")).toBeFocused();
  await fullyVisible(page.locator("#save-project"), panel);
  await page.setViewportSize({ width: 800, height: 800 });
  await expect(panel).toHaveAttribute("data-scroll-mode", "body");
  await expect(page.locator("#save-project")).toBeFocused();
  await fullyVisible(page.locator("#save-project"));
});

test("resize transfers focus when the active scroll region loses its Tab stop", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 800 });
  await openDialog(page);
  const body = target(page, "body");
  const panel = target(page, "panel");
  await body.focus();
  await page.setViewportSize({ width: 600, height: 180 });
  await expect(panel).toHaveAttribute("data-scroll-mode", "panel");
  await expect(panel).toBeFocused();
  await page.setViewportSize({ width: 800, height: 800 });
  await expect(panel).toHaveAttribute("data-scroll-mode", "body");
  await expect(body).toBeFocused();
});

test("content shrinking removes the scroll Tab stop and returns its focus to the title", async ({ page }) => {
  await openDialog(page);
  const body = target(page, "body");
  await body.focus();
  await expect(body).toBeFocused();
  await target(page, "content").evaluate((element) => {
    element.innerHTML = "<p>Short laboratory guidance.</p>";
  });
  await expect.poll(() => body.getAttribute("tabindex")).toBeNull();
  await expect(page.locator("#main-dialog-title")).toBeFocused();
  await expect(dialog(page)).toBeVisible();
  await expect(target(page, "panel")).toHaveAttribute("data-scroll-mode", "body");
});

test("safe-area margins and visual viewport offset constrain the dialog geometry", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 800 });
  await page.addInitScript(() => {
    const viewport = Object.assign(new EventTarget(), {
      height: 360,
      offsetTop: 90,
      width: 800,
      offsetLeft: 0,
      scale: 1,
    });
    Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
  });
  await openDialog(page);
  await dialog(page).evaluate((element) => {
    element.style.setProperty("--pvc-dialog-safe-top", "48px");
    element.style.setProperty("--pvc-dialog-safe-bottom", "72px");
    window.dispatchEvent(new Event("resize"));
  });
  const bounds = await dialog(page).boundingBox();
  expect(bounds.y).toBeGreaterThanOrEqual(90 + 48 - 1);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(90 + 360 - 72 + 1);
  await page.evaluate(() => {
    window.visualViewport.height = 260;
    window.visualViewport.offsetTop = 120;
    window.visualViewport.dispatchEvent(new Event("resize"));
  });
  await expect(target(page, "panel")).toHaveAttribute("data-scroll-mode", "panel");
  const resized = await dialog(page).boundingBox();
  expect(resized.y).toBeGreaterThanOrEqual(120 + 48 - 1);
  expect(resized.y + resized.height).toBeLessThanOrEqual(120 + 260 - 72 + 1);
});

test("native close, removal and Turbo cache release document scrolling", async ({ page }) => {
  await openDialog(page);
  const locked = () => page.evaluate(() => document.body.style.overflow === "hidden");
  expect(await locked()).toBe(true);
  await dialog(page).evaluate((element) => element.close());
  await expect.poll(locked).toBe(false);
  await page.locator("#main-trigger").click();
  expect(await locked()).toBe(true);
  await page.evaluate(() => document.dispatchEvent(new Event("turbo:before-cache")));
  await expect(dialog(page)).not.toBeVisible();
  await expect.poll(locked).toBe(false);
  await page.locator("#main-trigger").click();
  await dialog(page).evaluate((element) => element.closest('[data-controller~="pathogen--dialog"]').remove());
  await expect.poll(locked).toBe(false);
  await page.locator("#background-action").focus();
  await expect(page.locator("#background-action")).toBeFocused();
});

for (const first of ["sidebar", "dialog"]) {
  test(`Sidebar and Dialog keep scrolling locked until both close (${first} first)`, async ({ page }) => {
    await page.goto("/");
    await page.locator("#sidebar-trigger").click();
    await expect(page.locator("#browser-sidebar-dialog")).toBeVisible();
    await page.evaluate(() => {
      const root = document.querySelector("#main-dialog").closest('[data-controller~="pathogen--dialog"]');
      window.pathogenBrowser.application.getControllerForElementAndIdentifier(root, "pathogen--dialog").open();
    });
    await expect(dialog(page)).toBeVisible();
    const close = async (name) =>
      page.evaluate((kind) => {
        const identifier = `pathogen--${kind}`;
        const element =
          kind === "dialog"
            ? document.querySelector("#main-dialog").closest(`[data-controller~="${identifier}"]`)
            : document.querySelector('[data-controller~="pathogen--sidebar"]');
        const controller = window.pathogenBrowser.application.getControllerForElementAndIdentifier(element, identifier);
        if (kind === "dialog") controller.close();
        else controller.closeOffcanvas();
      }, name);
    await close(first);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    await close(first === "sidebar" ? "dialog" : "sidebar");
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
    await expect(page.locator("#browser-sidebar-dialog")).not.toBeVisible();
    await expect(dialog(page)).not.toBeVisible();
  });
}

test("open true mounts a genuine modal with title focus", async ({ page }) => {
  await page.goto("/auto-open");
  await expect(dialog(page)).toBeVisible();
  expect(await dialog(page).evaluate((element) => element.matches(":modal"))).toBe(true);
  await expect(page.locator("#main-dialog-title")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).not.toBeVisible();
});

test("forced colours preserves close control and focus outline", async ({ page, browserName }) => {
  test.skip(
    browserName !== "chromium",
    "Forced-colours emulation is verified in Chromium; other browser high-contrast checks require manual evidence.",
  );
  await page.emulateMedia({ forcedColors: "active" });
  await openDialog(page);
  await page.keyboard.press("Tab");
  const close = dialog(page).getByRole("button", { name: "Close dialog", exact: true });
  await close.focus();
  const style = await close.evaluate((element) => ({
    outline: getComputedStyle(element).outlineStyle,
    width: parseFloat(getComputedStyle(element).outlineWidth),
    forced: matchMedia("(forced-colors: active)").matches,
  }));
  expect(style.forced).toBe(true);
  expect(style.outline).toBe("solid");
  expect(style.width).toBeGreaterThanOrEqual(2);
  await fullyVisible(close);
  await page.keyboard.press("Enter");
  await expect(dialog(page)).not.toBeVisible();
});
