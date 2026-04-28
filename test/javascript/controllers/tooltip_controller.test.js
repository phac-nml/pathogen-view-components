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
  tooltip.className = "pathogen-tooltip pathogen-tooltip--placement-" + placement;
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

  it("does not use Tailwind visibility classes on show or hide", async () => {
    const { container, tooltip } = appendTooltip();
    await waitForController();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--tooltip");
    controller.show();
    controller.hide();

    const tailwindClasses = ["invisible", "visible", "opacity-0", "opacity-100", "scale-90", "scale-100"];
    tailwindClasses.forEach((cls) => {
      expect(tooltip.classList.contains(cls)).toBe(false);
    });
  });
});
