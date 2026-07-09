import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import TabsController from "../../../app/assets/javascripts/pathogen_view_components/tabs_controller";

const waitForTabsUpdate = () => new Promise((resolve) => setTimeout(resolve, 80));

const dispatchKey = (target, key) => {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key,
  });

  target.dispatchEvent(event);
  return event;
};

describe("tabs_controller", () => {
  let application;

  beforeEach(() => {
    application = Application.start();
    application.register("pathogen--tabs", TabsController);
  });

  afterEach(() => {
    application?.stop();
    document.body.innerHTML = "";
  });

  it("applies semantic selected and hidden state when selection changes", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--tabs" data-pathogen--tabs-default-index-value="0">
        <nav role="tablist" aria-orientation="horizontal" aria-label="Demo tabs">
          <button id="tab-overview" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown">Overview</button>
          <button id="tab-details" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown">Details</button>
        </nav>
        <div id="panel-overview" role="tabpanel" data-pathogen--tabs-target="panel">Overview panel</div>
        <div id="panel-details" role="tabpanel" data-pathogen--tabs-target="panel">Details panel</div>
      </div>
    `;

    await waitForTabsUpdate();

    const [overviewTab, detailsTab] = document.querySelectorAll('[data-pathogen--tabs-target="tab"]');
    const [overviewPanel, detailsPanel] = document.querySelectorAll('[data-pathogen--tabs-target="panel"]');

    expect(overviewTab.getAttribute("aria-selected")).toBe("true");
    expect(overviewTab.dataset.state).toBe("active");
    expect(overviewTab.tabIndex).toBe(0);
    expect(overviewPanel.hidden).toBe(false);
    expect(overviewPanel.getAttribute("aria-hidden")).toBe("false");
    expect(overviewPanel.dataset.state).toBe("active");

    expect(detailsTab.getAttribute("aria-selected")).toBe("false");
    expect(detailsTab.dataset.state).toBe("inactive");
    expect(detailsTab.tabIndex).toBe(-1);
    expect(detailsPanel.hidden).toBe(true);
    expect(detailsPanel.getAttribute("aria-hidden")).toBe("true");
    expect(detailsPanel.dataset.state).toBe("inactive");

    detailsTab.click();
    await waitForTabsUpdate();

    expect(overviewTab.getAttribute("aria-selected")).toBe("false");
    expect(overviewTab.dataset.state).toBe("inactive");
    expect(overviewTab.tabIndex).toBe(-1);
    expect(overviewPanel.hidden).toBe(true);
    expect(overviewPanel.getAttribute("aria-hidden")).toBe("true");
    expect(overviewPanel.dataset.state).toBe("inactive");

    expect(detailsTab.getAttribute("aria-selected")).toBe("true");
    expect(detailsTab.dataset.state).toBe("active");
    expect(detailsTab.tabIndex).toBe(0);
    expect(detailsPanel.hidden).toBe(false);
    expect(detailsPanel.getAttribute("aria-hidden")).toBe("false");
    expect(detailsPanel.dataset.state).toBe("active");

    expect(overviewPanel.classList.contains("hidden")).toBe(false);
    expect(detailsPanel.classList.contains("hidden")).toBe(false);
  });

  it("navigates tabs with horizontal arrow keys using roving tabindex", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--tabs" data-pathogen--tabs-default-index-value="0">
        <nav role="tablist" aria-orientation="horizontal" aria-label="Keyboard tabs">
          <button id="tab-a" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown">A</button>
          <button id="tab-b" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown">B</button>
        </nav>
        <div id="panel-a" role="tabpanel" data-pathogen--tabs-target="panel">Panel A</div>
        <div id="panel-b" role="tabpanel" data-pathogen--tabs-target="panel">Panel B</div>
      </div>
    `;

    await waitForTabsUpdate();

    const [tabA, tabB] = document.querySelectorAll('[data-pathogen--tabs-target="tab"]');
    const [panelA, panelB] = document.querySelectorAll('[data-pathogen--tabs-target="panel"]');

    tabA.focus();
    dispatchKey(tabA, "ArrowRight");
    await waitForTabsUpdate();

    expect(document.activeElement).toBe(tabB);
    expect(tabA.getAttribute("aria-selected")).toBe("false");
    expect(tabA.tabIndex).toBe(-1);
    expect(tabB.getAttribute("aria-selected")).toBe("true");
    expect(tabB.tabIndex).toBe(0);

    expect(panelA.hidden).toBe(true);
    expect(panelA.dataset.state).toBe("inactive");
    expect(panelB.hidden).toBe(false);
    expect(panelB.dataset.state).toBe("active");
  });

  it("defers panel visibility during keyboard navigation", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--tabs" data-pathogen--tabs-default-index-value="0">
        <nav role="tablist" aria-orientation="horizontal" aria-label="Keyboard tabs">
          <button id="tab-a" role="tab" aria-controls="panel-a" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown">A</button>
          <button id="tab-b" role="tab" aria-controls="panel-b" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown">B</button>
        </nav>
        <div id="panel-a" role="tabpanel" data-pathogen--tabs-target="panel">Panel A</div>
        <div id="panel-b" role="tabpanel" data-pathogen--tabs-target="panel">Panel B</div>
      </div>
    `;

    await waitForTabsUpdate();

    const [tabA, tabB] = document.querySelectorAll('[data-pathogen--tabs-target="tab"]');
    const [, panelB] = document.querySelectorAll('[data-pathogen--tabs-target="panel"]');
    let ariaSelectedUpdates = 0;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "aria-selected" && mutation.target === tabB) {
          ariaSelectedUpdates += 1;
        }
      });
    });

    observer.observe(tabB, { attributes: true, attributeFilter: ["aria-selected"] });

    tabA.focus();
    dispatchKey(tabA, "ArrowRight");
    await Promise.resolve();

    observer.disconnect();

    expect(document.activeElement).toBe(tabB);
    expect(tabB.getAttribute("aria-selected")).toBe("true");
    expect(tabB.getAttribute("aria-controls")).toBe("panel-b");
    expect(ariaSelectedUpdates).toBe(1);

    expect(panelB.hidden).toBe(true);

    await waitForTabsUpdate();

    expect(panelB.hidden).toBe(false);
  });

  it("does not re-apply tab selection when already synced", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--tabs" data-pathogen--tabs-default-index-value="0">
        <nav role="tablist" aria-orientation="horizontal" aria-label="Keyboard tabs">
          <button id="tab-a" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown">A</button>
          <button id="tab-b" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown">B</button>
        </nav>
        <div id="panel-a" role="tabpanel" data-pathogen--tabs-target="panel">Panel A</div>
        <div id="panel-b" role="tabpanel" data-pathogen--tabs-target="panel">Panel B</div>
      </div>
    `;

    await waitForTabsUpdate();

    const [, tabB] = document.querySelectorAll('[data-pathogen--tabs-target="tab"]');
    let ariaSelectedUpdates = 0;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "aria-selected" && mutation.target === tabB) {
          ariaSelectedUpdates += 1;
        }
      });
    });

    observer.observe(tabB, { attributes: true, attributeFilter: ["aria-selected"] });

    tabB.click();
    await waitForTabsUpdate();
    tabB.click();
    await waitForTabsUpdate();

    observer.disconnect();

    expect(ariaSelectedUpdates).toBe(1);
  });

  it("re-syncs panels when clicking the already-selected tab after panel state drifts", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--tabs" data-pathogen--tabs-default-index-value="0">
        <nav role="tablist" aria-orientation="horizontal" aria-label="Keyboard tabs">
          <button id="tab-a" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown">A</button>
          <button id="tab-b" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown">B</button>
        </nav>
        <div id="panel-a" role="tabpanel" data-pathogen--tabs-target="panel">Panel A</div>
        <div id="panel-b" role="tabpanel" data-pathogen--tabs-target="panel">Panel B</div>
      </div>
    `;

    await waitForTabsUpdate();

    const [tabA] = document.querySelectorAll('[data-pathogen--tabs-target="tab"]');
    const [overviewPanel] = document.querySelectorAll('[data-pathogen--tabs-target="panel"]');

    overviewPanel.hidden = true;
    overviewPanel.setAttribute("aria-hidden", "true");
    overviewPanel.dataset.state = "inactive";

    tabA.click();
    await waitForTabsUpdate();

    expect(overviewPanel.hidden).toBe(false);
    expect(overviewPanel.getAttribute("aria-hidden")).toBe("false");
    expect(overviewPanel.dataset.state).toBe("active");
  });

  it("re-applies tab selection when inactive tabs have stale roving state", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--tabs" data-pathogen--tabs-default-index-value="0">
        <nav role="tablist" aria-orientation="horizontal" aria-label="Keyboard tabs">
          <button id="tab-a" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown">A</button>
          <button id="tab-b" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown">B</button>
        </nav>
        <div id="panel-a" role="tabpanel" data-pathogen--tabs-target="panel">Panel A</div>
        <div id="panel-b" role="tabpanel" data-pathogen--tabs-target="panel">Panel B</div>
      </div>
    `;

    await waitForTabsUpdate();

    const [tabA, tabB] = document.querySelectorAll('[data-pathogen--tabs-target="tab"]');

    tabB.click();
    await waitForTabsUpdate();

    tabA.setAttribute("aria-selected", "true");
    tabA.dataset.state = "active";
    tabA.tabIndex = 0;

    tabB.click();
    await waitForTabsUpdate();

    expect(tabA.getAttribute("aria-selected")).toBe("false");
    expect(tabA.dataset.state).toBe("inactive");
    expect(tabA.tabIndex).toBe(-1);
    expect(tabB.getAttribute("aria-selected")).toBe("true");
    expect(tabB.dataset.state).toBe("active");
    expect(tabB.tabIndex).toBe(0);
  });

  it("ignores turbo render when tab selection is already synced", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--tabs"
           data-pathogen--tabs-default-index-value="0"
           data-pathogen--tabs-sync-url-value="true">
        <nav role="tablist" aria-orientation="horizontal" aria-label="Keyboard tabs">
          <button id="tab-a" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown">A</button>
          <button id="tab-b" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown">B</button>
        </nav>
        <div id="panel-a" role="tabpanel" data-pathogen--tabs-target="panel">Panel A</div>
        <div id="panel-b" role="tabpanel" data-pathogen--tabs-target="panel">Panel B</div>
      </div>
    `;

    await waitForTabsUpdate();

    const [, tabB] = document.querySelectorAll('[data-pathogen--tabs-target="tab"]');
    let ariaSelectedUpdates = 0;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "aria-selected" && mutation.target === tabB) {
          ariaSelectedUpdates += 1;
        }
      });
    });

    observer.observe(tabB, { attributes: true, attributeFilter: ["aria-selected"] });

    tabB.click();
    await waitForTabsUpdate();

    const updatesBeforeTurboRender = ariaSelectedUpdates;
    document.dispatchEvent(new Event("turbo:render"));
    await waitForTabsUpdate();

    observer.disconnect();

    expect(updatesBeforeTurboRender).toBe(1);
    expect(ariaSelectedUpdates).toBe(1);
  });

  it("renders Pathogen-styled validation error when tab and panel counts mismatch", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--tabs" data-pathogen--tabs-default-index-value="0">
        <nav role="tablist" aria-orientation="horizontal" aria-label="Broken tabs">
          <button id="tab-a" role="tab" data-pathogen--tabs-target="tab">A</button>
          <button id="tab-b" role="tab" data-pathogen--tabs-target="tab">B</button>
        </nav>
        <div id="panel-a" role="tabpanel" data-pathogen--tabs-target="panel">Panel A</div>
      </div>
    `;

    await waitForTabsUpdate();

    const error = Array.from(document.querySelectorAll("div")).find((el) =>
      el.textContent?.includes("Tab and panel counts must match"),
    );
    expect(error).not.toBeUndefined();
    expect(error.textContent).toContain("Tab and panel counts must match");
  });
});
