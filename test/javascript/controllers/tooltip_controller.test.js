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
import { TooltipRegistry } from "../../../app/assets/javascripts/pathogen_view_components/tooltip_controller";
import { autoUpdate, computePosition } from "@floating-ui/dom";

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

  it("keeps focused tooltip content visible when the pointer leaves", async () => {
    const { trigger, tooltip } = appendTooltip();
    await waitForController();
    trigger.focus();
    vi.useFakeTimers();
    try {
      trigger.dispatchEvent(new MouseEvent("mouseenter"));
      trigger.dispatchEvent(new MouseEvent("mouseleave"));
      await vi.advanceTimersByTimeAsync(500);
      expect(document.activeElement).toBe(trigger);
      expect(tooltip.dataset.state).toBe("open");
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps hovered tooltip content visible after focus moves away", async () => {
    const { trigger, tooltip } = appendTooltip();
    const other = document.createElement("button");
    document.body.append(other);
    await waitForController();
    trigger.focus();
    trigger.dispatchEvent(new MouseEvent("mouseenter"));
    other.focus();
    vi.useFakeTimers();
    try {
      await vi.advanceTimersByTimeAsync(500);
      expect(tooltip.dataset.state).toBe("open");
      trigger.dispatchEvent(new MouseEvent("mouseleave"));
      await vi.advanceTimersByTimeAsync(500);
      expect(tooltip.dataset.state).toBe("closed");
    } finally {
      vi.useRealTimers();
    }
  });

  it("dismisses a hovered tooltip without moving unrelated keyboard focus", async () => {
    const { trigger, tooltip } = appendTooltip();
    const other = document.createElement("button");
    document.body.append(other);
    await waitForController();
    other.focus();
    trigger.dispatchEvent(new MouseEvent("mouseenter"));
    document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    expect(tooltip.dataset.state).toBe("closed");
    expect(document.activeElement).toBe(other);
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

  it("does not open when disabled and hides when toggled disabled", async () => {
    const { container, tooltip } = appendTooltip();
    await waitForController();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--tooltip");

    container.setAttribute("data-pathogen--tooltip-disabled-value", "true");
    await waitForController();
    controller.show();

    expect(tooltip.dataset.state).toBe("closed");
    expect(tooltip.getAttribute("aria-hidden")).toBe("true");

    container.setAttribute("data-pathogen--tooltip-disabled-value", "false");
    await waitForController();
    controller.show();
    expect(tooltip.dataset.state).toBe("open");

    container.setAttribute("data-pathogen--tooltip-disabled-value", "true");
    await waitForController();
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

  describe("describedby value", () => {
    const appendVisualOnlyTooltip = () => {
      const container = document.createElement("div");
      container.setAttribute("data-controller", "pathogen--tooltip");
      container.setAttribute("data-pathogen--tooltip-describedby-value", "false");

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

    it("does not inject aria-describedby or log an error when describedby is false", async () => {
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

    it("repairs a missing aria-describedby when describedby defaults to true", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const container = document.createElement("div");
      container.setAttribute("data-controller", "pathogen--tooltip");

      const trigger = document.createElement("button");
      trigger.setAttribute("data-pathogen--tooltip-target", "trigger");
      trigger.setAttribute("tabindex", "0");

      const tooltip = document.createElement("div");
      tooltip.id = "tip-default-describedby";
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

      expect(trigger.getAttribute("aria-describedby")).toBe("tip-default-describedby");
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
      dialog.remove();
    });
  });

  const buildTooltip = ({
    id = "tip",
    ariaDescribedby = id,
    wrapDialog = false,
    withArrow = false,
    triggerTag = "button",
    describedbyValue = null,
    focusable = true,
  } = {}) => {
    const container = document.createElement("div");
    container.setAttribute("data-controller", "pathogen--tooltip");
    if (describedbyValue !== null) {
      container.setAttribute("data-pathogen--tooltip-describedby-value", String(describedbyValue));
    }

    const trigger = document.createElement(triggerTag);
    trigger.setAttribute("data-pathogen--tooltip-target", "trigger");
    if (ariaDescribedby) trigger.setAttribute("aria-describedby", ariaDescribedby);
    if (focusable && triggerTag !== "button") trigger.setAttribute("tabindex", "0");

    const tooltip = document.createElement("div");
    if (id) tooltip.id = id;
    tooltip.setAttribute("role", "tooltip");
    tooltip.setAttribute("data-pathogen--tooltip-target", "tooltip");
    tooltip.dataset.state = "closed";
    tooltip.setAttribute("data-placement", "top");
    tooltip.setAttribute("aria-hidden", "true");

    if (withArrow) {
      const arrow = document.createElement("div");
      arrow.setAttribute("data-pathogen--tooltip-target", "arrow");
      tooltip.appendChild(arrow);
    }

    container.appendChild(trigger);
    container.appendChild(tooltip);

    let root = container;
    if (wrapDialog) {
      const dialog = document.createElement("dialog");
      dialog.appendChild(container);
      root = dialog;
    }
    document.body.appendChild(root);

    const arrowEl = withArrow ? tooltip.querySelector('[data-pathogen--tooltip-target="arrow"]') : null;
    return { container, trigger, tooltip, arrowEl, root };
  };

  const getController = (container) => application.getControllerForElementAndIdentifier(container, "pathogen--tooltip");

  const cleanupPortal = () => document.getElementById("pathogen-tooltip-portal")?.remove();

  describe("touch interaction", () => {
    it("shows on first tap and hides on the second tap", async () => {
      const { trigger, tooltip } = buildTooltip({ id: "tip-touch", wrapDialog: true });
      await waitForController();

      trigger.dispatchEvent(new Event("touchstart", { bubbles: true }));
      const firstClick = new MouseEvent("click", { bubbles: true, cancelable: true });
      trigger.dispatchEvent(firstClick);
      expect(tooltip.dataset.state).toBe("open");
      expect(firstClick.defaultPrevented).toBe(true);

      trigger.dispatchEvent(new Event("touchstart", { bubbles: true }));
      trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      expect(tooltip.dataset.state).toBe("closed");
    });

    it("auto-dismisses a tapped tooltip after the dismiss delay", async () => {
      const { trigger, tooltip } = buildTooltip({ id: "tip-touch-timer", wrapDialog: true });
      await waitForController();

      vi.useFakeTimers();
      try {
        trigger.dispatchEvent(new Event("touchstart", { bubbles: true }));
        trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        expect(tooltip.dataset.state).toBe("open");

        await vi.advanceTimersByTimeAsync(3000);
        expect(tooltip.dataset.state).toBe("closed");
      } finally {
        vi.useRealTimers();
      }
    });

    it("hides on touch outside the trigger and tooltip", async () => {
      const { container, tooltip } = buildTooltip({ id: "tip-touch-outside", wrapDialog: true });
      await waitForController();
      const outside = document.createElement("button");
      document.body.appendChild(outside);

      getController(container).show();
      expect(tooltip.dataset.state).toBe("open");

      outside.dispatchEvent(new Event("touchstart", { bubbles: true }));
      expect(tooltip.dataset.state).toBe("closed");
      outside.remove();
    });

    it("keeps the tooltip open when touch occurs inside it", async () => {
      const { container, tooltip } = buildTooltip({ id: "tip-touch-inside", wrapDialog: true });
      await waitForController();

      getController(container).show();
      tooltip.dispatchEvent(new Event("touchstart", { bubbles: true }));
      expect(tooltip.dataset.state).toBe("open");
    });
  });

  describe("positioning and arrow", () => {
    it("positions the arrow on the static side for the resolved placement", async () => {
      const { container, arrowEl } = buildTooltip({ id: "tip-arrow-bottom", wrapDialog: true, withArrow: true });
      await waitForController();

      computePosition.mockImplementationOnce(() =>
        Promise.resolve({ x: 12, y: 20, placement: "bottom", middlewareData: { arrow: { x: 5, y: 8 } } }),
      );

      getController(container).show();
      await waitForController();

      expect(arrowEl.style.left).toBe("5px");
      expect(arrowEl.style.top).toBe("-4px");
    });

    it("positions the arrow for a left placement without a horizontal offset", async () => {
      const { container, arrowEl } = buildTooltip({ id: "tip-arrow-left", wrapDialog: true, withArrow: true });
      await waitForController();

      computePosition.mockImplementationOnce(() =>
        Promise.resolve({ x: 0, y: 0, placement: "left", middlewareData: { arrow: { x: null, y: 15 } } }),
      );

      getController(container).show();
      await waitForController();

      expect(arrowEl.style.left).toBe("");
      expect(arrowEl.style.top).toBe("15px");
      expect(arrowEl.style.right).toBe("-4px");
    });

    it("repositions through the autoUpdate callback", async () => {
      const { container, tooltip } = buildTooltip({ id: "tip-autoupdate", wrapDialog: true });
      await waitForController();

      autoUpdate.mockImplementationOnce((_reference, _floating, update) => {
        update();
        return () => {};
      });

      getController(container).show();
      await waitForController();

      expect(tooltip.dataset.state).toBe("open");
    });

    it("moves the tooltip offscreen when positioning fails", async () => {
      const { container, tooltip } = buildTooltip({ id: "tip-catch", wrapDialog: true });
      await waitForController();

      computePosition.mockImplementationOnce(() => Promise.reject(new Error("positioning failed")));

      getController(container).show();
      await waitForController();

      expect(tooltip.style.top).toBe("-9999px");
      expect(tooltip.style.left).toBe("-9999px");
    });

    it("clears the arrow horizontal offset when no x is provided", async () => {
      const { container, arrowEl } = buildTooltip({ id: "tip-arrow-top", wrapDialog: true, withArrow: true });
      await waitForController();

      computePosition.mockImplementationOnce(() =>
        Promise.resolve({ x: 0, y: 0, placement: "top", middlewareData: { arrow: { x: 7, y: null } } }),
      );

      getController(container).show();
      await waitForController();

      expect(arrowEl.style.left).toBe("7px");
      expect(arrowEl.style.top).toBe("");
      expect(arrowEl.style.bottom).toBe("-4px");
    });
  });

  describe("multiple tooltips", () => {
    it("hides other tooltips when a new one opens", async () => {
      const a = buildTooltip({ id: "tip-multi-a", wrapDialog: true });
      const b = buildTooltip({ id: "tip-multi-b", wrapDialog: true });
      await waitForController();

      getController(a.container).show();
      expect(a.tooltip.dataset.state).toBe("open");

      getController(b.container).show();
      expect(b.tooltip.dataset.state).toBe("open");
      expect(a.tooltip.dataset.state).toBe("closed");
    });

    it("reuses the existing tooltip portal for a second tooltip", async () => {
      const a = buildTooltip({ id: "tip-portal-reuse-a" });
      const b = buildTooltip({ id: "tip-portal-reuse-b" });
      await waitForController();

      getController(a.container).show();
      getController(b.container).show();

      expect(document.querySelectorAll("#pathogen-tooltip-portal")).toHaveLength(1);

      a.container.remove();
      b.container.remove();
      cleanupPortal();
    });
  });

  describe("back-forward cache recovery", () => {
    it("re-syncs bindings after a persisted pageshow", async () => {
      const { trigger, tooltip } = buildTooltip({ id: "tip-bfcache", wrapDialog: true });
      await waitForController();

      const event = new Event("pageshow");
      Object.defineProperty(event, "persisted", { value: true });
      window.dispatchEvent(event);
      await waitForController();

      trigger.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      expect(tooltip.dataset.state).toBe("open");
    });

    it("ignores a non-persisted pageshow", async () => {
      const { container } = buildTooltip({ id: "tip-bfcache-skip", wrapDialog: true });
      await waitForController();

      const controller = getController(container);
      const spy = vi.spyOn(controller, "recoverFromPageCache");

      const event = new Event("pageshow");
      Object.defineProperty(event, "persisted", { value: false });
      window.dispatchEvent(event);

      expect(spy).not.toHaveBeenCalled();
    });

    it("skips page-cache recovery when the element is disconnected", async () => {
      const { container, root } = buildTooltip({ id: "tip-bfcache-disc", wrapDialog: true });
      await waitForController();

      const controller = getController(container);
      root.remove();

      expect(() => controller.recoverFromPageCache()).not.toThrow();
    });
  });

  describe("accessibility validation", () => {
    it("warns when the trigger is not keyboard focusable", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      buildTooltip({ id: "tip-nofocus", wrapDialog: true, triggerTag: "div", focusable: false });
      await waitForController();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("keyboard-focusable"));
      warnSpy.mockRestore();
    });

    it("appends the tooltip id to an existing aria-describedby", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { trigger } = buildTooltip({ id: "tip-append", ariaDescribedby: "other-desc", wrapDialog: true });
      await waitForController();

      expect(trigger.getAttribute("aria-describedby")).toBe("other-desc tip-append");
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("logs an error when the tooltip has no id", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      buildTooltip({ id: "", ariaDescribedby: "", wrapDialog: true });
      await waitForController();

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("must have an id"));
      errorSpy.mockRestore();
    });
  });

  describe("misc branches", () => {
    it("ignores Escape when the tooltip is already closed", async () => {
      const { tooltip } = buildTooltip({ id: "tip-escape-closed", wrapDialog: true });
      await waitForController();

      document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
      expect(tooltip.dataset.state).toBe("closed");
    });

    it("does not re-show while the tooltip is escape-dismissed", async () => {
      const { container, tooltip } = buildTooltip({ id: "tip-escape-block", wrapDialog: true });
      await waitForController();

      const controller = getController(container);
      controller.show();
      expect(tooltip.dataset.state).toBe("open");

      document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
      expect(tooltip.dataset.state).toBe("closed");

      controller.show();
      expect(tooltip.dataset.state).toBe("closed");
    });

    it("keeps the tooltip open while hovered then hides after leaving it", async () => {
      const { container, tooltip } = buildTooltip({ id: "tip-hover-content", wrapDialog: true });
      await waitForController();

      const controller = getController(container);
      controller.show();
      tooltip.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      expect(tooltip.dataset.state).toBe("open");

      vi.useFakeTimers();
      try {
        tooltip.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
        await vi.advanceTimersByTimeAsync(500);
        expect(tooltip.dataset.state).toBe("closed");
      } finally {
        vi.useRealTimers();
      }
    });

    it("skips re-binding listeners when bindings are already active", async () => {
      const { container, tooltip } = buildTooltip({ id: "tip-rebind" });
      await waitForController();

      const controller = getController(container);
      controller.show();
      await waitForController();
      controller.hide();
      // Wait past the fade-out so the tooltip is restored to its container,
      // which re-fires tooltipTargetConnected while bindings are still active.
      await new Promise((resolve) => setTimeout(resolve, 300));

      controller.show();
      expect(tooltip.dataset.state).toBe("open");

      container.remove();
      cleanupPortal();
    });

    it("applies hidden immediately when reduced motion is preferred", async () => {
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: true,
        addEventListener: () => {},
        removeEventListener: () => {},
      });
      const { container, tooltip } = buildTooltip({ id: "tip-reduced", wrapDialog: true });
      await waitForController();

      vi.useFakeTimers();
      try {
        const controller = getController(container);
        controller.show();
        controller.hide();

        await vi.advanceTimersByTimeAsync(0);
        expect(tooltip.hasAttribute("hidden")).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it("keeps the tooltip in its container while inside a dialog (no portal)", async () => {
      const { container, tooltip } = buildTooltip({ id: "tip-dialog-noportal", wrapDialog: true });
      await waitForController();

      getController(container).show();
      expect(tooltip.parentElement).toBe(container);
    });

    it("resolves the tooltip via the last id in aria-describedby", async () => {
      const container = document.createElement("div");
      container.setAttribute("data-controller", "pathogen--tooltip");

      const trigger = document.createElement("button");
      trigger.setAttribute("data-pathogen--tooltip-target", "trigger");
      trigger.setAttribute("aria-describedby", "extra-desc tip-last-id");

      const tooltip = document.createElement("div");
      tooltip.id = "tip-last-id";
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
      cleanupPortal();
    });

    it("does nothing when the trigger has no aria-describedby and no tooltip target", async () => {
      const container = document.createElement("div");
      container.setAttribute("data-controller", "pathogen--tooltip");

      const trigger = document.createElement("button");
      trigger.setAttribute("data-pathogen--tooltip-target", "trigger");

      container.appendChild(trigger);
      document.body.appendChild(container);
      await waitForController();

      expect(() => trigger.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }))).not.toThrow();
      container.remove();
    });
  });

  describe("global listener lifecycle", () => {
    it("ignores non-Escape keydowns", async () => {
      const { container, tooltip } = buildTooltip({ id: "tip-nonescape", wrapDialog: true });
      await waitForController();

      getController(container).show();
      document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "a" }));
      expect(tooltip.dataset.state).toBe("open");
    });
  });
});

describe("TooltipRegistry", () => {
  const makeController = () => ({
    hide: vi.fn(),
    handleEscape: vi.fn(),
    handleTouchOutside: vi.fn(),
    recoverFromPageCache: vi.fn(),
  });

  const persistedPageShow = (persisted) => {
    const event = new Event("pageshow");
    Object.defineProperty(event, "persisted", { value: persisted });
    return event;
  };

  it("delegates Escape and touch events to registered controllers", () => {
    const registry = new TooltipRegistry();
    const controller = makeController();
    registry.register(controller);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(controller.handleEscape).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(controller.handleEscape).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new Event("touchstart"));
    expect(controller.handleTouchOutside).toHaveBeenCalledTimes(1);

    registry.unregister(controller);
  });

  it("hides every controller except the active one", () => {
    const registry = new TooltipRegistry();
    const active = makeController();
    const other = makeController();
    registry.register(active);
    registry.register(other);

    registry.hideAllExcept(active);
    expect(active.hide).not.toHaveBeenCalled();
    expect(other.hide).toHaveBeenCalledTimes(1);

    registry.unregister(active);
    registry.unregister(other);
  });

  it("recovers controllers on a persisted pageshow and ignores non-persisted ones", () => {
    const registry = new TooltipRegistry();
    const controller = makeController();
    registry.register(controller);

    window.dispatchEvent(persistedPageShow(false));
    expect(controller.recoverFromPageCache).not.toHaveBeenCalled();

    window.dispatchEvent(persistedPageShow(true));
    expect(controller.recoverFromPageCache).toHaveBeenCalledTimes(1);

    registry.unregister(controller);
  });

  it("tears down global listeners once the last controller unregisters", () => {
    const registry = new TooltipRegistry();
    const controller = makeController();
    registry.register(controller);
    registry.unregister(controller);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    document.dispatchEvent(new Event("touchstart"));
    window.dispatchEvent(persistedPageShow(true));

    expect(controller.handleEscape).not.toHaveBeenCalled();
    expect(controller.handleTouchOutside).not.toHaveBeenCalled();
    expect(controller.recoverFromPageCache).not.toHaveBeenCalled();

    const next = makeController();
    registry.register(next);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(next.handleEscape).toHaveBeenCalledTimes(1);
    registry.unregister(next);
  });
});
