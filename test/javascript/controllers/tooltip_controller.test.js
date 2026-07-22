import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Floating UI to avoid jsdom layout engine crashes
vi.mock("@floating-ui/dom", () => {
  return {
    computePosition: vi.fn(() => Promise.resolve({ x: 0, y: 0, placement: "top", middlewareData: {} })),
    autoUpdate: vi.fn(() => () => {}),
    offset: vi.fn((n) => n),
    flip: vi.fn((o) => o),
    shift: vi.fn((o) => o),
    arrow: vi.fn((o) => o),
  };
});

import TooltipController from "../../../app/assets/javascripts/pathogen_view_components/tooltip_controller";

const waitForController = () => new Promise((resolve) => setTimeout(resolve, 50));

const appendTooltip = (placement = "top") => {
  const container = document.createElement("div");
  container.setAttribute("data-controller", "pathogen--tooltip");

  const trigger = document.createElement("button");
  trigger.id = "trigger-btn";
  trigger.setAttribute("data-pathogen--tooltip-target", "trigger");
  trigger.setAttribute("aria-describedby", "tip-1");
  trigger.setAttribute("tabindex", "0");
  trigger.textContent = "Hover me";

  const tooltip = document.createElement("div");
  tooltip.id = "tip-1";
  tooltip.setAttribute("role", "tooltip");
  tooltip.setAttribute("data-pathogen--tooltip-target", "tooltip");
  tooltip.dataset.state = "closed";
  tooltip.setAttribute("data-placement", placement);
  tooltip.setAttribute("aria-hidden", "true");
  tooltip.setAttribute("data-pathogen-tooltip-root", "");
  tooltip.className =
    "fixed z-50 opacity-0 scale-90 transition-[opacity,transform] data-[state=open]:opacity-100 data-[state=open]:scale-100";
  tooltip.textContent = "Tooltip content";

  container.appendChild(trigger);
  container.appendChild(tooltip);

  // Wrap in dialog so controller skips portal-to-body logic (avoids jsdom teardown issues).
  const dialog = document.createElement("dialog");
  dialog.appendChild(container);
  document.body.appendChild(dialog);

  return { container, trigger, tooltip };
};

describe("tooltip_controller", () => {
  let application;

  beforeEach(() => {
    application = Application.start();
    application.register("pathogen--tooltip", TooltipController);
  });

  afterEach(async () => {
    application?.stop();
    await waitForController();
  });

  it("starts in closed state with aria-hidden true", async () => {
    const { tooltip } = appendTooltip();
    await waitForController();

    expect(tooltip.dataset.state).toBe("closed");
    expect(tooltip.getAttribute("aria-hidden")).toBe("true");
  });

  it("sets data-state to open and aria-hidden to false on show()", async () => {
    const { container, tooltip } = appendTooltip();
    await waitForController();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--tooltip");
    controller.show();

    expect(tooltip.dataset.state).toBe("open");
    expect(tooltip.getAttribute("aria-hidden")).toBe("false");
  });

  it("sets data-state to closed and aria-hidden to true on hide()", async () => {
    const { container, tooltip } = appendTooltip();
    await waitForController();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--tooltip");
    controller.show();
    controller.hide();

    expect(tooltip.dataset.state).toBe("closed");
    expect(tooltip.getAttribute("aria-hidden")).toBe("true");
  });

  it("sets hidden after fade-out so closed tooltips don't block interactions", async () => {
    const { container, tooltip } = appendTooltip();
    await waitForController();

    vi.useFakeTimers();
    try {
      const controller = application.getControllerForElementAndIdentifier(container, "pathogen--tooltip");
      controller.show();
      controller.hide();

      // hidden is applied after the CSS transition completes (200ms)
      expect(tooltip.hasAttribute("hidden")).toBe(false);
      vi.advanceTimersByTime(200);
      expect(tooltip.hasAttribute("hidden")).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("removes hidden before showing (re-open after hide)", async () => {
    const { container, tooltip } = appendTooltip();
    await waitForController();

    tooltip.setAttribute("hidden", "");

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--tooltip");
    controller.show();

    expect(tooltip.hasAttribute("hidden")).toBe(false);
    expect(tooltip.dataset.state).toBe("open");
    expect(tooltip.getAttribute("aria-hidden")).toBe("false");
  });

  it("hides tooltip on Escape key press", async () => {
    const { container, tooltip } = appendTooltip();
    await waitForController();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--tooltip");
    controller.show();

    const event = new KeyboardEvent("keydown", { bubbles: true, key: "Escape" });
    document.dispatchEvent(event);

    expect(tooltip.dataset.state).toBe("closed");
    expect(tooltip.getAttribute("aria-hidden")).toBe("true");
  });

  it("reconnects hover listeners after a Turbo-style disconnect and reconnect", async () => {
    const { container, trigger, tooltip } = appendTooltip();
    await waitForController();

    const dialog = container.closest("dialog");
    dialog.remove();
    await waitForController();

    document.body.appendChild(dialog);
    await waitForController();

    trigger.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await waitForController();

    expect(tooltip.dataset.state).toBe("open");
    expect(tooltip.getAttribute("aria-hidden")).toBe("false");
  });

  it("portals open tooltip to the global tooltip landmark", async () => {
    const main = document.createElement("main");
    const container = document.createElement("div");
    container.setAttribute("data-controller", "pathogen--tooltip");

    const trigger = document.createElement("button");
    trigger.setAttribute("data-pathogen--tooltip-target", "trigger");
    trigger.setAttribute("aria-describedby", "tip-landmark");
    trigger.setAttribute("tabindex", "0");

    const tooltip = document.createElement("div");
    tooltip.id = "tip-landmark";
    tooltip.setAttribute("role", "tooltip");
    tooltip.setAttribute("data-pathogen--tooltip-target", "tooltip");
    tooltip.dataset.state = "closed";
    tooltip.setAttribute("data-placement", "top");
    tooltip.setAttribute("aria-hidden", "true");

    container.appendChild(trigger);
    container.appendChild(tooltip);
    main.appendChild(container);
    document.body.appendChild(main);
    await waitForController();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--tooltip");

    controller.show();
    await waitForController();
    const portal = document.getElementById("pathogen-tooltip-portal");
    expect(portal).toBeTruthy();
    expect(portal.getAttribute("role")).toBe("region");
    expect(portal.getAttribute("aria-label")).toBe("Tooltips");
    expect(tooltip.parentElement).toBe(portal);
    expect(main.contains(portal)).toBe(false);
    expect(tooltip.dataset.state).toBe("open");

    controller.hide();
    await waitForController();
    expect(tooltip.dataset.state).toBe("closed");

    controller.show();
    await waitForController();
    expect(tooltip.dataset.state).toBe("open");

    main.remove();
  });

  it("uses portalAriaLabel value for the tooltip landmark aria-label", async () => {
    const container = document.createElement("div");
    container.setAttribute("data-controller", "pathogen--tooltip");
    container.setAttribute("data-pathogen--tooltip-portal-aria-label-value", "Info-bulles");

    const trigger = document.createElement("button");
    trigger.setAttribute("data-pathogen--tooltip-target", "trigger");
    trigger.setAttribute("aria-describedby", "tip-i18n");
    trigger.setAttribute("tabindex", "0");

    const tooltip = document.createElement("div");
    tooltip.id = "tip-i18n";
    tooltip.setAttribute("role", "tooltip");
    tooltip.setAttribute("data-pathogen--tooltip-target", "tooltip");
    tooltip.dataset.state = "closed";
    tooltip.setAttribute("aria-hidden", "true");

    container.appendChild(trigger);
    container.appendChild(tooltip);
    document.body.appendChild(container);
    await waitForController();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--tooltip");
    controller.show();
    await waitForController();

    expect(document.getElementById("pathogen-tooltip-portal").getAttribute("aria-label")).toBe("Info-bulles");
    container.remove();
    document.getElementById("pathogen-tooltip-portal")?.remove();
  });

  it("keeps tooltip reference when target disconnects due to portal", async () => {
    const container = document.createElement("div");
    container.setAttribute("data-controller", "pathogen--tooltip");

    const trigger = document.createElement("button");
    trigger.setAttribute("data-pathogen--tooltip-target", "trigger");
    trigger.setAttribute("aria-describedby", "tip-portal-reference");
    trigger.setAttribute("tabindex", "0");

    const tooltip = document.createElement("div");
    tooltip.id = "tip-portal-reference";
    tooltip.setAttribute("role", "tooltip");
    tooltip.setAttribute("data-pathogen--tooltip-target", "tooltip");
    tooltip.dataset.state = "closed";
    tooltip.setAttribute("data-placement", "top");
    tooltip.setAttribute("aria-hidden", "true");

    container.appendChild(trigger);
    container.appendChild(tooltip);
    document.body.appendChild(container);
    await waitForController();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--tooltip");

    controller.show();
    await waitForController();
    expect(tooltip.parentElement).toBe(document.getElementById("pathogen-tooltip-portal"));
    expect(tooltip.dataset.state).toBe("open");

    controller.hide();
    await waitForController();
    expect(tooltip.dataset.state).toBe("closed");

    controller.show();
    await waitForController();
    expect(tooltip.dataset.state).toBe("open");

    container.remove();
    tooltip.remove();
  });

  it("keeps tooltip in its container until opened", async () => {
    const container = document.createElement("div");
    container.setAttribute("data-controller", "pathogen--tooltip");

    const trigger = document.createElement("button");
    trigger.setAttribute("data-pathogen--tooltip-target", "trigger");
    trigger.setAttribute("aria-describedby", "tip-portal");
    trigger.setAttribute("tabindex", "0");

    const tooltip = document.createElement("div");
    tooltip.id = "tip-portal";
    tooltip.setAttribute("role", "tooltip");
    tooltip.setAttribute("data-pathogen--tooltip-target", "tooltip");
    tooltip.dataset.state = "closed";
    tooltip.setAttribute("data-placement", "top");
    tooltip.setAttribute("aria-hidden", "true");

    container.appendChild(trigger);
    container.appendChild(tooltip);
    document.body.appendChild(container);
    await waitForController();

    expect(tooltip.parentElement).toBe(container);
    container.remove();
  });

  it("restores portaled tooltip to its container before Turbo caches the page", async () => {
    const container = document.createElement("div");
    container.setAttribute("data-controller", "pathogen--tooltip");

    const trigger = document.createElement("button");
    trigger.setAttribute("data-pathogen--tooltip-target", "trigger");
    trigger.setAttribute("aria-describedby", "tip-portal");
    trigger.setAttribute("tabindex", "0");

    const tooltip = document.createElement("div");
    tooltip.id = "tip-portal";
    tooltip.setAttribute("role", "tooltip");
    tooltip.setAttribute("data-pathogen--tooltip-target", "tooltip");
    tooltip.dataset.state = "closed";
    tooltip.setAttribute("data-placement", "top");
    tooltip.setAttribute("aria-hidden", "true");

    container.appendChild(trigger);
    container.appendChild(tooltip);
    document.body.appendChild(container);
    await waitForController();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--tooltip");
    controller.show();
    expect(tooltip.parentElement).toBe(document.getElementById("pathogen-tooltip-portal"));

    document.dispatchEvent(new Event("turbo:before-cache"));
    await waitForController();

    expect(tooltip.parentElement).toBe(container);
    container.remove();
  });

  it("reconciles tooltip left in body when Stimulus cannot see the tooltip target", async () => {
    const container = document.createElement("div");
    container.setAttribute("data-controller", "pathogen--tooltip");

    const trigger = document.createElement("button");
    trigger.setAttribute("data-pathogen--tooltip-target", "trigger");
    trigger.setAttribute("aria-describedby", "tip-orphan");
    trigger.setAttribute("tabindex", "0");

    const tooltip = document.createElement("div");
    tooltip.id = "tip-orphan";
    tooltip.setAttribute("role", "tooltip");
    tooltip.dataset.state = "closed";
    tooltip.setAttribute("data-placement", "top");
    tooltip.setAttribute("aria-hidden", "true");

    container.appendChild(trigger);
    document.body.appendChild(container);
    document.body.appendChild(tooltip);
    await waitForController();

    trigger.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await waitForController();

    expect(tooltip.dataset.state).toBe("open");
    container.remove();
    tooltip.remove();
  });

  describe("associate value", () => {
    const appendVisualOnlyTooltip = () => {
      const container = document.createElement("div");
      container.setAttribute("data-controller", "pathogen--tooltip");
      container.setAttribute("data-pathogen--tooltip-associate-value", "none");

      const trigger = document.createElement("button");
      trigger.setAttribute("data-pathogen--tooltip-target", "trigger");
      trigger.setAttribute("aria-label", "Specimens");
      trigger.setAttribute("tabindex", "0");

      const tooltip = document.createElement("div");
      tooltip.id = "tip-visual-only";
      tooltip.setAttribute("role", "tooltip");
      tooltip.setAttribute("data-pathogen--tooltip-target", "tooltip");
      tooltip.dataset.state = "closed";
      tooltip.setAttribute("data-placement", "top");
      tooltip.setAttribute("aria-hidden", "true");
      tooltip.textContent = "Specimens";

      container.appendChild(trigger);
      container.appendChild(tooltip);

      const dialog = document.createElement("dialog");
      dialog.appendChild(container);
      document.body.appendChild(dialog);

      return { container, trigger, tooltip, dialog };
    };

    it("does not inject aria-describedby or log an error when associate is none", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { trigger, dialog } = appendVisualOnlyTooltip();
      await waitForController();

      expect(trigger.hasAttribute("aria-describedby")).toBe(false);
      expect(errorSpy).not.toHaveBeenCalled();

      errorSpy.mockRestore();
      dialog.remove();
    });

    it("still shows and hides a visual-only tooltip on hover", async () => {
      const { container, tooltip, dialog } = appendVisualOnlyTooltip();
      await waitForController();

      const controller = application.getControllerForElementAndIdentifier(container, "pathogen--tooltip");
      controller.show();
      expect(tooltip.dataset.state).toBe("open");
      expect(tooltip.getAttribute("aria-hidden")).toBe("true");

      controller.hide();
      expect(tooltip.dataset.state).toBe("closed");
      expect(tooltip.getAttribute("aria-hidden")).toBe("true");

      dialog.remove();
    });

    it("repairs a missing aria-describedby when associate defaults to describedby", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const container = document.createElement("div");
      container.setAttribute("data-controller", "pathogen--tooltip");

      const trigger = document.createElement("button");
      trigger.setAttribute("data-pathogen--tooltip-target", "trigger");
      trigger.setAttribute("tabindex", "0");

      const tooltip = document.createElement("div");
      tooltip.id = "tip-default-associate";
      tooltip.setAttribute("role", "tooltip");
      tooltip.setAttribute("data-pathogen--tooltip-target", "tooltip");
      tooltip.dataset.state = "closed";
      tooltip.setAttribute("data-placement", "top");
      tooltip.setAttribute("aria-hidden", "true");

      container.appendChild(trigger);
      container.appendChild(tooltip);
      const dialog = document.createElement("dialog");
      dialog.appendChild(container);
      document.body.appendChild(dialog);
      await waitForController();

      expect(trigger.getAttribute("aria-describedby")).toBe("tip-default-associate");
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
      dialog.remove();
    });
  });
});
