import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent } from "@testing-library/dom";
import { Application } from "@hotwired/stimulus";
import TabsController from "../../../app/assets/javascripts/pathogen_view_components/tabs_controller.js";

function renderTabsFixture() {
  document.body.innerHTML = `
    <div
      id="tabs-component"
      data-controller="pathogen--tabs"
      data-pathogen--tabs-default-index-value="0"
      data-pathogen--tabs-sync-url-value="false"
    >
      <div role="tablist" aria-label="Sample Tabs">
        <button
          id="tab-overview"
          type="button"
          role="tab"
          aria-selected="false"
          tabindex="-1"
          data-pathogen--tabs-target="tab"
          data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown"
        >
          Overview
        </button>
        <button
          id="tab-details"
          type="button"
          role="tab"
          aria-selected="false"
          tabindex="-1"
          data-pathogen--tabs-target="tab"
          data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown"
        >
          Details
        </button>
      </div>
      <div id="panel-overview" data-pathogen--tabs-target="panel">
        Overview content
      </div>
      <div id="panel-details" data-pathogen--tabs-target="panel" class="hidden">
        Details content
      </div>
    </div>
  `;
}

describe("Pathogen Tabs controller", () => {
  let application;
  let originalTurbo;

  beforeEach(() => {
    originalTurbo = window.Turbo;
    window.Turbo = {
      session: {
        history: {
          update: vi.fn(),
        },
      },
    };

    renderTabsFixture();

    application = Application.start();
    application.register("pathogen--tabs", TabsController);
  });

  afterEach(() => {
    if (originalTurbo === undefined) {
      delete window.Turbo;
    } else {
      window.Turbo = originalTurbo;
    }

    if (application) {
      application.stop();
      application = null;
    }

    vi.useRealTimers();
  });

  it("marks the first tab as selected by default", () => {
    vi.useFakeTimers();
    const firstPanel = document.getElementById("panel-overview");
    const secondPanel = document.getElementById("panel-details");
    const firstTab = document.getElementById("tab-overview");
    const secondTab = document.getElementById("tab-details");

    vi.advanceTimersByTime(20);

    expect(firstTab).toHaveAttribute("aria-selected", "true");
    expect(firstPanel).not.toHaveClass("hidden");
    expect(firstPanel).toHaveAttribute("aria-hidden", "false");
    expect(secondPanel).toHaveClass("hidden");
    expect(secondPanel).toHaveAttribute("aria-hidden", "true");
    expect(firstTab.tabIndex).toBe(0);
    expect(secondTab.tabIndex).toBe(-1);

    fireEvent.click(secondTab);
    vi.advanceTimersByTime(20);

    expect(firstTab).toHaveAttribute("aria-selected", "false");
    expect(firstTab.tabIndex).toBe(-1);
    expect(secondTab).toHaveAttribute("aria-selected", "true");
    expect(secondTab.tabIndex).toBe(0);
    expect(firstPanel).toHaveClass("hidden");
    expect(secondPanel).not.toHaveClass("hidden");
    expect(secondPanel).toHaveAttribute("aria-hidden", "false");
  });

  it("supports keyboard navigation with ArrowRight", () => {
    vi.useFakeTimers();
    const firstTab = document.getElementById("tab-overview");
    const secondTab = document.getElementById("tab-details");

    vi.advanceTimersByTime(20);
    firstTab.focus();
    fireEvent.keyDown(firstTab, { key: "ArrowRight" });
    vi.advanceTimersByTime(20);

    expect(document.activeElement).toBe(secondTab);
    expect(secondTab).toHaveAttribute("aria-selected", "true");
    expect(secondTab.tabIndex).toBe(0);
  });
});
