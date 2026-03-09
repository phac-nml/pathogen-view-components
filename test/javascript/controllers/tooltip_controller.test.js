import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent } from "@testing-library/dom";
import { Application } from "@hotwired/stimulus";
import TooltipController from "../../../app/assets/javascripts/pathogen_view_components/tooltip_controller.js";

vi.mock("@floating-ui/dom", () => ({
  autoUpdate: vi.fn(() => vi.fn()),
  computePosition: vi.fn().mockResolvedValue({
    x: 0,
    y: 0,
    placement: "top",
    middlewareData: { arrow: { x: 0, y: 0 } },
  }),
  arrow: vi.fn(),
  flip: vi.fn(),
  offset: vi.fn(),
  shift: vi.fn(),
}));

describe("Pathogen Tooltip controller", () => {
  let application;

  function renderTooltipFixture() {
    document.body.innerHTML = `
      <div data-controller="pathogen--tooltip">
        <button
          id="tooltip-trigger"
          type="button"
          aria-describedby="tooltip-content"
          data-pathogen--tooltip-target="trigger"
        >
          Hover me
        </button>
        <div id="tooltip-content" role="tooltip" data-pathogen--tooltip-target="tooltip">
          Helpful details
          <span data-pathogen--tooltip-target="arrow"></span>
        </div>
      </div>
    `;
  }

  beforeEach(() => {
    window.matchMedia = vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    renderTooltipFixture();

    application = Application.start();
    application.register("pathogen--tooltip", TooltipController);
  });

  afterEach(() => {
    if (application) {
      application.stop();
      application = null;
    }
  });

  it("registers and marks the controller element when connected", async () => {
    const root = document.querySelector('[data-controller="pathogen--tooltip"]');
    const tooltip = document.getElementById("tooltip-content");

    await Promise.resolve();

    expect(root).toHaveAttribute("data-controller-connected", "true");
    expect(tooltip).not.toBeNull();
  });

  it("shows tooltip on focus and hides it on blur", () => {
    const trigger = document.getElementById("tooltip-trigger");
    const tooltip = document.getElementById("tooltip-content");

    fireEvent.focusIn(trigger);

    expect(tooltip).toHaveAttribute("aria-hidden", "false");
    expect(tooltip).toHaveClass("visible");
    expect(tooltip).toHaveClass("opacity-100");

    fireEvent.focusOut(trigger);

    expect(tooltip).toHaveAttribute("aria-hidden", "true");
    expect(tooltip).not.toHaveClass("opacity-100");
  });
});
