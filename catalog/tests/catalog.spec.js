import { test, expect } from "@playwright/test";

test("static examples retain keyboard behaviour, styles, and working assets", async ({ page }) => {
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });

  for (const theme of ["light", "dark"]) {
    await page.goto("components/tabs/");
    const frame = page.frameLocator(`iframe[title="Tabs — ${theme} preview"]`);
    const overview = frame.getByRole("tab", { name: "Overview" });
    await overview.focus();
    await page.keyboard.press("ArrowRight");
    await expect(frame.getByRole("tab", { name: "Quality metrics" })).toBeFocused();
    await expect(frame.getByRole("tab", { name: "Quality metrics" })).toHaveAttribute("aria-selected", "true");
    await expect(frame.getByRole("tabpanel")).toContainText("Coverage: 98%");
    await expect(overview).toHaveCSS("min-height", "44px");

    await page.goto("components/form/");
    const form = page.frameLocator(`iframe[title="Form controls — ${theme} preview"]`);
    await form.getByRole("radio", { name: "Full report", exact: true }).check();
    await expect(form.getByRole("radio", { name: "Summary report", exact: true })).not.toBeChecked();
    const toggle = form.getByRole("switch", { name: "Include sample metadata" });
    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(toggle).not.toBeChecked();

    await page.goto("components/button/");
    const buttons = page.frameLocator(`iframe[title="Buttons — ${theme} preview"]`);
    await expect(buttons.getByRole("button", { name: "Export unavailable" })).toBeDisabled();
    await expect(buttons.locator("html")).toHaveAttribute("data-theme", theme);
    await page.getByRole("combobox", { name: "Select theme" }).selectOption(theme);
    await page.screenshot({ path: `test-results/catalog-${theme}.png`, fullPage: true });
  }

  await page.setViewportSize({ width: 320, height: 800 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 320);
  await page.screenshot({ path: "test-results/catalog-narrow.png", fullPage: true });
  expect(failures).toEqual([]);
});

test("production search and exported documentation links work", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Search", exact: false }).click();
  const search = page.getByRole("dialog", { name: "Search", exact: true });
  await search.getByRole("textbox", { name: "Search", exact: true }).fill("Foundations");
  const result = search.getByRole("link").filter({ hasText: "Foundations" }).first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/design-system-design-contract/);

  await page.goto("design-system/design-system-overview/");
  const foundations = page.getByRole("link", { name: "Foundations", exact: true }).first();
  await expect(foundations).toHaveAttribute(
    "href",
    "/pathogen-view-components/design-system/design-system-design-contract/",
  );
  await foundations.click();
  await expect(page.getByRole("heading", { name: "Foundations", exact: true }).first()).toBeVisible();
});
