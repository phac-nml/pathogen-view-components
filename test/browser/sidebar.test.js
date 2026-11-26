import { Application } from "@hotwired/stimulus";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";

import "../../app/assets/stylesheets/pathogen_view_components.css";
import DisclosureController from "pathogen_view_components/disclosure_controller";
import SidebarController from "pathogen_view_components/sidebar_controller";
import TooltipController from "pathogen_view_components/tooltip_controller";

// Rendered from the real components by sidebar_browser_fixture_test.rb.
import fixture from "./fixtures/sidebar.html?raw";

const DESKTOP = [1440, 900];
const MOBILE = [390, 800];

const settle = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
const $ = (selector) => document.querySelector(selector);
const rect = (element) => element.getBoundingClientRect();
const isShown = (element) => element.checkVisibility({ visibilityProperty: true });
const press = (keys) => userEvent.keyboard(keys);

const emulateMedia = (features) =>
  cdp().send("Emulation.setEmulatedMedia", {
    features: Object.entries(features).map(([name, value]) => ({ name, value })),
  });

// Resolves any CSS colour (oklch, color-mix, system colours) to sRGB channels by painting it.
const toRgb = (color) => {
  const context = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d", {
    willReadFrequently: true,
  });
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  return [...context.getImageData(0, 0, 1, 1).data];
};

// Composites a possibly translucent colour over an opaque backdrop.
const over = ([r, g, b, a], [br, bg, bb]) => {
  const alpha = a / 255;
  return [r * alpha + br * (1 - alpha), g * alpha + bg * (1 - alpha), b * alpha + bb * (1 - alpha)];
};

const luminance = (channels) => {
  const [r, g, b] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (first, second) => {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

const railTrigger = () => $("#settings .pathogen-sidebar-item__rail-trigger");
const flyout = () => $("#settings-flyout");
const flyoutLinks = () => [...flyout().querySelectorAll("a")];
const provider = () => $(".pathogen-sidebar-provider");
const mode = () => provider().dataset.pathogenSidebarMode;

describe("Pathogen sidebar in a real browser", () => {
  let application;

  const mount = async (viewport = DESKTOP) => {
    await page.viewport(...viewport);
    document.body.innerHTML = fixture;
    application = Application.start();
    application.register("pathogen--sidebar", SidebarController);
    application.register("pathogen--disclosure", DisclosureController);
    application.register("pathogen--tooltip", TooltipController);
    await settle();
  };

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("dir");
  });

  afterEach(async () => {
    application.stop();
    document.body.innerHTML = "";
    await emulateMedia({});
  });

  describe("rail", () => {
    beforeEach(() => mount());

    it("collapses to the rail width and keeps every row a 44px target with its name", () => {
      expect(mode()).toBe("rail");
      expect(rect($(".pathogen-sidebar-panel")).width).toBe(52);

      const targets = [
        $("#rail-toggle"),
        $("#dashboard a"),
        railTrigger(),
        $("#reports a"),
        $(".pathogen-sidebar-brand"),
      ];
      for (const target of targets) {
        expect(rect(target).width, target.textContent).toBeGreaterThanOrEqual(44);
        expect(rect(target).height, target.textContent).toBeGreaterThanOrEqual(44);
      }

      expect($("#dashboard a").textContent.trim()).toContain("Dashboard");
      expect(rect($("#dashboard [data-pathogen-sidebar-label]")).width).toBeLessThanOrEqual(1);
    });

    it("marks the parent of the current page with a bar, not only a colour", () => {
      const bar = (element) => getComputedStyle(element, "::before");

      expect(bar(railTrigger()).borderInlineStartWidth).toBe("3px");
      expect(bar(railTrigger()).content).not.toBe("none");
      expect(bar($("#dashboard a")).content).toBe("none");
    });

    it("opens the flyout beside its trigger and moves focus into it with the arrow key", async () => {
      railTrigger().focus();
      await press("{ArrowRight}");

      expect(isShown(flyout())).toBe(true);
      expect(document.activeElement).toBe(flyoutLinks()[0]);
      expect(rect(flyout()).left).toBeGreaterThanOrEqual(rect(railTrigger()).right);
      expect(rect(flyout()).right).toBeLessThanOrEqual(window.innerWidth);
      expect(rect(flyout()).bottom).toBeLessThanOrEqual(window.innerHeight);

      for (const link of flyoutLinks()) {
        expect(rect(link).height, link.textContent).toBeGreaterThanOrEqual(44);
      }
    });

    it("marks the current link in the flyout with a bar and heavier weight", async () => {
      railTrigger().click();
      await settle();

      const [profile, access] = flyoutLinks();
      expect(access.getAttribute("aria-current")).toBe("page");
      expect(getComputedStyle(access, "::before").borderInlineStartWidth).toBe("3px");
      expect(getComputedStyle(profile, "::before").content).toBe("none");
      expect(Number(getComputedStyle(access).fontWeight)).toBeGreaterThan(Number(getComputedStyle(profile).fontWeight));
    });

    it("closes when Tab leaves the last link and never covers the newly focused control", async () => {
      railTrigger().focus();
      await press("{ArrowRight}");
      await press("{Tab}{Tab}");
      expect(document.activeElement).toBe(flyoutLinks()[2]);
      expect(isShown(flyout())).toBe(true);

      await press("{Tab}");

      expect(isShown(flyout())).toBe(false);
      expect(document.activeElement).toBe($("#reports a"));
      expect(railTrigger().getAttribute("aria-expanded")).toBe("false");
    });

    it("returns focus to the trigger on Escape and on the inline-start arrow", async () => {
      railTrigger().focus();
      await press("{ArrowRight}");
      await press("{Escape}");
      expect(isShown(flyout())).toBe(false);
      expect(document.activeElement).toBe(railTrigger());

      await press("{ArrowRight}");
      await press("{ArrowLeft}");
      expect(isShown(flyout())).toBe(false);
      expect(document.activeElement).toBe(railTrigger());
    });

    it("leaves Escape to the host when focus is outside the flyout", async () => {
      await userEvent.click(railTrigger());
      expect(isShown(flyout())).toBe(true);

      let hostSawEscape = false;
      $("#inset-action").addEventListener("keydown", (event) => {
        hostSawEscape = event.key === "Escape" && !event.defaultPrevented;
      });
      $("#inset-action").focus();
      await press("{Escape}");

      expect(isShown(flyout())).toBe(false);
      expect(hostSawEscape).toBe(true);
      expect(document.activeElement).toBe($("#inset-action"));
    });

    it("clamps a tall flyout to a short viewport and grows back when there is room", async () => {
      railTrigger().click();
      await settle();
      const naturalHeight = rect(flyout()).height;

      await page.viewport(1440, 140);
      await settle();
      expect(rect(flyout()).bottom).toBeLessThanOrEqual(140);
      expect(rect(flyout()).height).toBeLessThan(naturalHeight);

      await page.viewport(...DESKTOP);
      await settle();
      expect(rect(flyout()).height).toBe(naturalHeight);
    });

    it("mirrors placement and arrow keys in a right-to-left document", async () => {
      document.documentElement.dir = "rtl";
      await settle();

      railTrigger().focus();
      await press("{ArrowLeft}");

      expect(isShown(flyout())).toBe(true);
      expect(rect(flyout()).right).toBeLessThanOrEqual(rect(railTrigger()).left);
      expect(rect(flyout()).left).toBeGreaterThanOrEqual(0);

      await press("{ArrowRight}");
      expect(isShown(flyout())).toBe(false);
    });
  });

  describe("expanded", () => {
    beforeEach(async () => {
      await mount();
      $("#rail-toggle").click();
      // Let the 160ms width transition finish before measuring.
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    it("expands to the full width with 44px child rows indented at the inline start", () => {
      expect(mode()).toBe("expanded");
      expect(rect($(".pathogen-sidebar-panel")).width).toBe(256);
      expect($("#rail-toggle").getAttribute("aria-expanded")).toBe("true");

      for (const link of $("#settings-disclosure-panel").querySelectorAll("a")) {
        expect(rect(link).height, link.textContent).toBeGreaterThanOrEqual(44);
      }
      expect(getComputedStyle($("#settings-disclosure-panel")).paddingInlineStart).toBe("24px");
    });

    it("moves the current-page bar to the parent when its disclosure is collapsed", async () => {
      const parent = $("#settings .pathogen-sidebar-item__action--parent");
      expect(getComputedStyle(parent, "::before").content).toBe("none");

      parent.click();
      await settle();

      expect(parent.getAttribute("aria-expanded")).toBe("false");
      expect(getComputedStyle(parent, "::before").borderInlineStartWidth).toBe("3px");
    });

    it("shows a hover step on a row that differs from the sidebar surface", async () => {
      const link = $("#dashboard a");
      const sidebar = toRgb(getComputedStyle($("#fixture-nav")).backgroundColor);
      await userEvent.hover(link);

      const hovered = over(toRgb(getComputedStyle(link).backgroundColor), sidebar);
      expect(contrast(hovered, sidebar)).toBeGreaterThan(1.05);
    });
  });

  describe("off-canvas drawer", () => {
    beforeEach(() => mount(MOBILE));

    it("opens as a named modal dialog, contains Tab, and returns focus on Escape", async () => {
      const dialog = $("#fixture-nav-dialog");
      expect(mode()).toBe("offcanvas");
      expect(isShown($("#fixture-nav"))).toBe(false);

      $("#host-toggle").focus();
      await press("{Enter}");
      await settle();

      expect(dialog.matches(":modal")).toBe(true);
      expect(dialog.getAttribute("aria-label")).toBe("Primary navigation");
      expect(document.activeElement).toBe($(".pathogen-sidebar-dialog__close"));
      expect(rect($("#fixture-nav")).width).toBeLessThanOrEqual(390 * 0.85);

      for (let step = 0; step < 12; step += 1) {
        await press("{Tab}");
        expect(dialog.contains(document.activeElement) || document.activeElement === document.body).toBe(true);
      }

      await press("{Escape}");
      await settle();

      expect(dialog.open).toBe(false);
      expect(document.activeElement).toBe($("#host-toggle"));
      expect($("#host-toggle").getAttribute("aria-expanded")).toBe("false");
    });
  });

  describe("user preferences", () => {
    it("does not animate the width for people who ask for reduced motion", async () => {
      await mount();
      expect(getComputedStyle($(".pathogen-sidebar-panel")).transitionDuration).toBe("0.16s");

      await emulateMedia({ "prefers-reduced-motion": "reduce" });
      expect(getComputedStyle($(".pathogen-sidebar-panel")).transitionDuration).toBe("0s");

      await page.viewport(...MOBILE);
      await settle();
      expect(getComputedStyle($("#fixture-nav-dialog")).transitionDuration).toBe("0s");
    });

    it("keeps the toggle icon and the current-page bar painted in forced colours", async () => {
      await mount();
      await emulateMedia({ "forced-colors": "active" });

      const icon = getComputedStyle($("#rail-toggle .pathogen-sidebar-trigger__icon"), "::before");
      const bar = getComputedStyle(railTrigger(), "::before");
      const canvas = toRgb(getComputedStyle($("#fixture-nav")).backgroundColor);

      expect(icon.borderBlockStartWidth).toBe("2px");
      expect(contrast(toRgb(icon.borderBlockStartColor), canvas)).toBeGreaterThanOrEqual(3);
      expect(contrast(toRgb(bar.borderInlineStartColor), canvas)).toBeGreaterThanOrEqual(3);
    });
  });

  describe.each(["light", "dark"])("rendered colour, %s theme", (theme) => {
    beforeEach(async () => {
      document.documentElement.classList.toggle("dark", theme === "dark");
      await mount();
    });

    it("gives the current-page bar at least 3:1 against the sidebar and the flyout", async () => {
      railTrigger().click();
      await settle();

      const sidebar = toRgb(getComputedStyle($("#fixture-nav")).backgroundColor);
      const raised = toRgb(getComputedStyle(flyout()).backgroundColor);
      const railBar = toRgb(getComputedStyle(railTrigger(), "::before").borderInlineStartColor);
      const flyoutBar = toRgb(getComputedStyle(flyoutLinks()[1], "::before").borderInlineStartColor);

      expect(contrast(railBar, sidebar)).toBeGreaterThanOrEqual(3);
      expect(contrast(flyoutBar, raised)).toBeGreaterThanOrEqual(3);
    });

    it("passes axe with real styles in rail, open-flyout, and expanded states", async () => {
      const scan = async (state) => {
        // The inset holds unstyled fixture content, so scan the sidebar itself.
        const results = await axe.run($("#fixture-nav-panel"), { rules: { "target-size": { enabled: true } } });
        expect(
          results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target)}`),
          state,
        ).toEqual([]);
      };

      await scan("rail");

      railTrigger().click();
      await settle();
      await scan("rail with flyout open");

      $("#rail-toggle").click();
      await settle();
      await scan("expanded");
    });
  });
});
