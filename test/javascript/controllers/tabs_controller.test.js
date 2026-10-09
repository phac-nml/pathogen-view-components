import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const waitForHashUpdate = () => new Promise((resolve) => setTimeout(resolve, 140));

const setLocation = (value) => window.history.replaceState(null, "", value);
const resetLocation = () => window.history.replaceState(null, "", window.location.pathname);
const turboUpdate = () => globalThis.Turbo.session.history.update;

const renderVerticalTabs = () => {
  document.body.innerHTML = `
    <div data-controller="pathogen--tabs" data-pathogen--tabs-default-index-value="0">
      <nav role="tablist" aria-orientation="vertical" aria-label="Vertical tabs">
        <button id="v-a" role="tab" data-pathogen--tabs-target="tab" data-action="keydown->pathogen--tabs#handleKeyDown click->pathogen--tabs#selectTab">A</button>
        <button id="v-b" role="tab" data-pathogen--tabs-target="tab" data-action="keydown->pathogen--tabs#handleKeyDown click->pathogen--tabs#selectTab">B</button>
        <button id="v-c" role="tab" data-pathogen--tabs-target="tab" data-action="keydown->pathogen--tabs#handleKeyDown click->pathogen--tabs#selectTab">C</button>
      </nav>
      <div id="v-pa" role="tabpanel" aria-labelledby="v-a" data-pathogen--tabs-target="panel">A</div>
      <div id="v-pb" role="tabpanel" aria-labelledby="v-b" data-pathogen--tabs-target="panel">B</div>
      <div id="v-pc" role="tabpanel" aria-labelledby="v-c" data-pathogen--tabs-target="panel">C</div>
    </div>`;
};

const renderSyncTabs = ({ prefix = "s", syncUrl = true, defaultIndex = 0 } = {}) => {
  const sync = syncUrl ? ' data-pathogen--tabs-sync-url-value="true"' : "";
  document.body.innerHTML = `
    <div id="${prefix}-host" data-controller="pathogen--tabs"${sync} data-pathogen--tabs-default-index-value="${defaultIndex}">
      <nav role="tablist" aria-label="${prefix} tabs">
        <button id="${prefix}-a" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown">A</button>
        <button id="${prefix}-b" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab keydown->pathogen--tabs#handleKeyDown">B</button>
      </nav>
      <div id="${prefix}-pa" role="tabpanel" aria-labelledby="${prefix}-a" data-pathogen--tabs-target="panel">A</div>
      <div id="${prefix}-pb" role="tabpanel" aria-labelledby="${prefix}-b" data-pathogen--tabs-target="panel">B</div>
    </div>`;
};

describe("tabs_controller", () => {
  let application;

  beforeEach(() => {
    application = Application.start();
    application.register("pathogen--tabs", TabsController);
    globalThis.Turbo = { session: { history: { update: vi.fn() } } };
  });

  afterEach(() => {
    application?.stop();
    document.body.innerHTML = "";
    resetLocation();
    delete globalThis.Turbo;
  });

  it("preserves panel associations when panels appear in a different order", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--tabs" data-pathogen--tabs-sync-url-value="true">
        <nav role="tablist" aria-label="Mixed panels">
          <button id="history" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab">History</button>
          <button id="overview" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab">Overview</button>
        </nav>
        <div id="overview-panel" role="tabpanel" aria-labelledby="overview" data-pathogen--tabs-target="panel">Overview content</div>
        <div id="history-panel" role="tabpanel" aria-labelledby="history" data-pathogen--tabs-target="panel">History content</div>
      </div>`;
    await waitForTabsUpdate();
    const history = document.getElementById("history");
    const overview = document.getElementById("overview");
    const historyPanel = document.getElementById("history-panel");
    const overviewPanel = document.getElementById("overview-panel");
    expect(history.getAttribute("aria-controls")).toBe("history-panel");
    expect(historyPanel.getAttribute("aria-labelledby")).toBe("history");
    expect(historyPanel.hidden).toBe(false);
    expect(overviewPanel.hidden).toBe(true);
    overview.click();
    await waitForTabsUpdate();
    expect(historyPanel.hidden).toBe(true);
    expect(overviewPanel.hidden).toBe(false);
    window.history.replaceState(null, "", "#history-panel");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await waitForTabsUpdate();
    expect(history.getAttribute("aria-selected")).toBe("true");
    expect(historyPanel.hidden).toBe(false);
    window.history.replaceState(null, "", window.location.pathname);
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

  it("navigates vertical tabs with ArrowUp/ArrowDown and wraps around the ends", async () => {
    renderVerticalTabs();
    await waitForTabsUpdate();

    const a = document.getElementById("v-a");
    const b = document.getElementById("v-b");
    const c = document.getElementById("v-c");

    a.focus();
    dispatchKey(a, "ArrowDown");
    await waitForTabsUpdate();
    expect(document.activeElement).toBe(b);

    dispatchKey(b, "ArrowDown");
    await waitForTabsUpdate();
    expect(document.activeElement).toBe(c);

    dispatchKey(c, "ArrowDown");
    await waitForTabsUpdate();
    expect(document.activeElement).toBe(a);

    dispatchKey(a, "ArrowUp");
    await waitForTabsUpdate();
    expect(document.activeElement).toBe(c);
    expect(c.getAttribute("aria-selected")).toBe("true");
  });

  it("selects the first and last tab with Home and End", async () => {
    renderVerticalTabs();
    await waitForTabsUpdate();

    const a = document.getElementById("v-a");
    const b = document.getElementById("v-b");
    const c = document.getElementById("v-c");

    b.focus();
    dispatchKey(b, "End");
    await waitForTabsUpdate();
    expect(document.activeElement).toBe(c);
    expect(c.getAttribute("aria-selected")).toBe("true");

    dispatchKey(c, "Home");
    await waitForTabsUpdate();
    expect(document.activeElement).toBe(a);
    expect(a.getAttribute("aria-selected")).toBe("true");
  });

  it("ignores keys outside the tab navigation set", async () => {
    renderVerticalTabs();
    await waitForTabsUpdate();

    const a = document.getElementById("v-a");
    a.focus();
    const event = dispatchKey(a, "x");
    await waitForTabsUpdate();

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(a);
    expect(a.getAttribute("aria-selected")).toBe("true");
  });

  it("renders a validation error when there are no tab targets", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--tabs">
        <nav role="tablist" aria-label="No tabs"></nav>
        <div role="tabpanel" data-pathogen--tabs-target="panel">Panel</div>
      </div>`;
    await waitForTabsUpdate();

    const error = Array.from(document.querySelectorAll("div")).find((el) =>
      el.textContent?.includes("At least one tab target is required"),
    );
    expect(error).not.toBeUndefined();
  });

  it("renders a validation error when there are no panel targets", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--tabs">
        <nav role="tablist" aria-label="No panels">
          <button role="tab" data-pathogen--tabs-target="tab">A</button>
        </nav>
      </div>`;
    await waitForTabsUpdate();

    const error = Array.from(document.querySelectorAll("div")).find((el) =>
      el.textContent?.includes("At least one panel target is required"),
    );
    expect(error).not.toBeUndefined();
  });

  it("clamps an out-of-bounds default index to the first tab", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderSyncTabs({ prefix: "oob", syncUrl: false, defaultIndex: 9 });
    await waitForTabsUpdate();

    expect(document.getElementById("oob-a").getAttribute("aria-selected")).toBe("true");
    expect(warnSpy).toHaveBeenCalled();
  });

  it("selects the initial tab from a URL hash that matches a tab id", async () => {
    setLocation("#hb-b");
    renderSyncTabs({ prefix: "hb" });
    await waitForTabsUpdate();

    expect(document.getElementById("hb-b").getAttribute("aria-selected")).toBe("true");
  });

  it("resolves the initial hash by panel id", async () => {
    setLocation("#hp-pb");
    renderSyncTabs({ prefix: "hp" });
    await waitForTabsUpdate();

    expect(document.getElementById("hp-b").getAttribute("aria-selected")).toBe("true");
  });

  it("resolves the initial hash in tab-{index} format", async () => {
    setLocation("#tab-1");
    renderSyncTabs({ prefix: "ti" });
    await waitForTabsUpdate();

    expect(document.getElementById("ti-b").getAttribute("aria-selected")).toBe("true");
  });

  it("falls back to the default tab for an unknown initial hash", async () => {
    setLocation("#unknown");
    renderSyncTabs({ prefix: "uk" });
    await waitForTabsUpdate();

    expect(document.getElementById("uk-a").getAttribute("aria-selected")).toBe("true");
  });

  it("writes the selected tab to the URL hash and clears a stale tab param", async () => {
    setLocation("?tab=stale");
    renderSyncTabs({ prefix: "wr" });
    await waitForTabsUpdate();

    document.getElementById("wr-b").click();
    await waitForHashUpdate();

    const url = turboUpdate().mock.calls.at(-1)[1];
    expect(url.hash).toBe("#wr-b");
    expect(url.searchParams.get("tab")).toBeNull();
  });

  it("derives the hash from the panel id when the tab has no id", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--tabs" data-pathogen--tabs-sync-url-value="true">
        <nav role="tablist" aria-label="Panel id hash">
          <button role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab">A</button>
          <button role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab">B</button>
        </nav>
        <div id="pid-pa" role="tabpanel" data-pathogen--tabs-target="panel">A</div>
        <div id="pid-pb" role="tabpanel" data-pathogen--tabs-target="panel">B</div>
      </div>`;
    await waitForTabsUpdate();

    document.querySelectorAll('[data-pathogen--tabs-target="tab"]')[1].click();
    await waitForHashUpdate();

    expect(turboUpdate().mock.calls.at(-1)[1].hash).toBe("#pid-pb");
  });

  it("derives the hash from the index when neither tab nor panel has an id", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--tabs" data-pathogen--tabs-sync-url-value="true">
        <nav role="tablist" aria-label="Index hash">
          <button role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab">A</button>
          <button role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab">B</button>
        </nav>
        <div role="tabpanel" data-pathogen--tabs-target="panel">A</div>
        <div role="tabpanel" data-pathogen--tabs-target="panel">B</div>
      </div>`;
    await waitForTabsUpdate();

    document.querySelectorAll('[data-pathogen--tabs-target="tab"]')[1].click();
    await waitForHashUpdate();

    expect(turboUpdate().mock.calls.at(-1)[1].hash).toBe("#tab-1");
  });

  it("logs and recovers when the Turbo history update throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    globalThis.Turbo.session.history.update = () => {
      throw new Error("history boom");
    };
    renderSyncTabs({ prefix: "th" });
    await waitForTabsUpdate();

    document.getElementById("th-b").click();
    await waitForHashUpdate();

    expect(errorSpy).toHaveBeenCalledWith("[pathogen--tabs] Error updating URL hash:", expect.any(Error));
  });

  it("switches tabs on hashchange and ignores unknown or already-selected hashes", async () => {
    renderSyncTabs({ prefix: "hc" });
    await waitForTabsUpdate();

    const b = document.getElementById("hc-b");

    setLocation("#hc-b");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await waitForTabsUpdate();
    expect(b.getAttribute("aria-selected")).toBe("true");

    setLocation("#missing");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await waitForTabsUpdate();
    expect(b.getAttribute("aria-selected")).toBe("true");

    setLocation("#hc-b");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await waitForTabsUpdate();
    expect(b.getAttribute("aria-selected")).toBe("true");
  });

  it("restores tab selection from the URL hash after a Turbo morph", async () => {
    renderSyncTabs({ prefix: "mh" });
    await waitForTabsUpdate();

    const a = document.getElementById("mh-a");
    const b = document.getElementById("mh-b");

    setLocation("#mh-b");
    for (const tab of [a, b]) {
      tab.setAttribute("aria-selected", "false");
      tab.tabIndex = -1;
    }

    document.dispatchEvent(new Event("turbo:render"));
    await waitForTabsUpdate();

    expect(b.getAttribute("aria-selected")).toBe("true");
    expect(b.tabIndex).toBe(0);
  });

  it("restores the last selected tab after a Turbo morph without a hash", async () => {
    renderSyncTabs({ prefix: "ms" });
    await waitForTabsUpdate();

    const a = document.getElementById("ms-a");
    const b = document.getElementById("ms-b");

    b.click();
    await waitForTabsUpdate();

    resetLocation();
    for (const tab of [a, b]) {
      tab.setAttribute("aria-selected", "false");
      tab.tabIndex = -1;
    }

    document.dispatchEvent(new Event("turbo:render"));
    await waitForTabsUpdate();

    expect(b.getAttribute("aria-selected")).toBe("true");
  });

  it("re-syncs panels after a Turbo morph when only panel state drifted", async () => {
    renderSyncTabs({ prefix: "mp" });
    await waitForTabsUpdate();

    const pa = document.getElementById("mp-pa");
    pa.hidden = true;
    pa.setAttribute("aria-hidden", "true");
    pa.dataset.state = "inactive";

    document.dispatchEvent(new Event("turbo:render"));
    await waitForTabsUpdate();

    expect(pa.hidden).toBe(false);
    expect(pa.dataset.state).toBe("active");
  });

  it("short-circuits a Turbo morph when targets become invalid", async () => {
    renderSyncTabs({ prefix: "mi" });
    await waitForTabsUpdate();

    document.getElementById("mi-pb").remove();
    document.dispatchEvent(new Event("turbo:render"));
    await waitForTabsUpdate();

    const error = Array.from(document.querySelectorAll("div")).find((el) =>
      el.textContent?.includes("Tab and panel counts must match"),
    );
    expect(error).not.toBeUndefined();
  });

  it("removes listeners and clears timers when disconnected", async () => {
    renderSyncTabs({ prefix: "dc" });
    await waitForTabsUpdate();

    const host = document.getElementById("dc-host");
    document.getElementById("dc-b").click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    document.getElementById("dc-a").click();

    host.remove();
    await waitForTabsUpdate();

    expect(host.dataset.controllerConnected).toBeUndefined();
    expect(host.isConnected).toBe(false);
  });

  it("logs when a click originates from a non-tab element", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    document.body.innerHTML = `
      <div data-controller="pathogen--tabs">
        <nav role="tablist" aria-label="Stray click">
          <button id="sc-a" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab">A</button>
          <button id="sc-b" role="tab" data-pathogen--tabs-target="tab" data-action="click->pathogen--tabs#selectTab">B</button>
        </nav>
        <button id="sc-stray" data-action="click->pathogen--tabs#selectTab">Stray</button>
        <div role="tabpanel" data-pathogen--tabs-target="panel">A</div>
        <div role="tabpanel" data-pathogen--tabs-target="panel">B</div>
      </div>`;
    await waitForTabsUpdate();

    document.getElementById("sc-stray").click();
    await waitForTabsUpdate();

    expect(errorSpy).toHaveBeenCalledWith("[pathogen--tabs] Clicked tab not found in targets");
  });

  it("skips a stale deferred panel update when the selection changes first", async () => {
    renderSyncTabs({ prefix: "sd" });
    await waitForTabsUpdate();

    const a = document.getElementById("sd-a");
    const b = document.getElementById("sd-b");

    b.click();
    setLocation("#sd-a");
    for (const tab of [a, b]) {
      tab.setAttribute("aria-selected", "false");
      tab.tabIndex = -1;
    }
    document.dispatchEvent(new Event("turbo:render"));

    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(a.getAttribute("aria-selected")).toBe("true");
  });

  it("skips a deferred panel update when its tab is removed before the timer fires", async () => {
    renderSyncTabs({ prefix: "rm", syncUrl: false });
    await waitForTabsUpdate();

    const pa = document.getElementById("rm-pa");
    const b = document.getElementById("rm-b");

    b.click();
    b.remove();

    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(pa.hidden).toBe(false);
  });

  it("adds missing ARIA roles to tabs and panels", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--tabs">
        <nav role="tablist" aria-label="No roles">
          <button id="nr-a" data-pathogen--tabs-target="tab">A</button>
          <button id="nr-b" data-pathogen--tabs-target="tab">B</button>
        </nav>
        <div id="nr-pa" data-pathogen--tabs-target="panel">A</div>
        <div id="nr-pb" data-pathogen--tabs-target="panel">B</div>
      </div>`;
    await waitForTabsUpdate();

    expect(document.getElementById("nr-a").getAttribute("role")).toBe("tab");
    expect(document.getElementById("nr-pa").getAttribute("role")).toBe("tabpanel");
  });

  it("keeps focus when navigating to the already-active focused tab", async () => {
    renderVerticalTabs();
    await waitForTabsUpdate();

    const a = document.getElementById("v-a");
    a.focus();
    dispatchKey(a, "Home");
    await waitForTabsUpdate();

    expect(document.activeElement).toBe(a);
    expect(a.getAttribute("aria-selected")).toBe("true");
  });

  it("clears a pending panel update when a newer selection is scheduled", async () => {
    renderSyncTabs({ prefix: "cl", syncUrl: false });
    await waitForTabsUpdate();

    const a = document.getElementById("cl-a");
    const b = document.getElementById("cl-b");

    b.click();
    a.click();
    await waitForTabsUpdate();

    expect(a.getAttribute("aria-selected")).toBe("true");
    expect(document.getElementById("cl-pa").hidden).toBe(false);
    expect(document.getElementById("cl-pb").hidden).toBe(true);
  });

  it("skips a deferred update after all tabs are removed", async () => {
    renderSyncTabs({ prefix: "nt", syncUrl: false });
    await waitForTabsUpdate();

    const b = document.getElementById("nt-b");
    b.click();
    document.getElementById("nt-a").remove();
    b.remove();

    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(document.querySelectorAll('[data-pathogen--tabs-target="tab"]').length).toBe(0);
  });

  it("updates the URL hash when refocusing the already-selected tab", async () => {
    renderSyncTabs({ prefix: "rf" });
    await waitForTabsUpdate();

    const a = document.getElementById("rf-a");
    const b = document.getElementById("rf-b");

    b.click();
    await waitForHashUpdate();
    const callsBefore = turboUpdate().mock.calls.length;

    a.focus();
    dispatchKey(a, "End");
    await waitForHashUpdate();

    expect(document.activeElement).toBe(b);
    expect(turboUpdate().mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("ignores a tab-{index} hash that is out of range", async () => {
    setLocation("#tab-99");
    renderSyncTabs({ prefix: "oor" });
    await waitForTabsUpdate();

    expect(document.getElementById("oor-a").getAttribute("aria-selected")).toBe("true");
  });

  it("logs initialization errors and still marks the controller connected", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    document.body.innerHTML = `
      <div id="ce-host" data-controller="pathogen--tabs">
        <nav role="tablist" aria-label="Init boom">
          <button id="ce-a" role="tab" data-pathogen--tabs-target="tab">A</button>
        </nav>
        <div role="tabpanel" data-pathogen--tabs-target="panel">A</div>
      </div>`;
    const host = document.getElementById("ce-host");
    host.querySelector = () => {
      throw new Error("querySelector boom");
    };
    await waitForTabsUpdate();

    expect(errorSpy).toHaveBeenCalledWith("[pathogen--tabs] Error during initialization:", expect.any(Error));
    expect(host.dataset.controllerConnected).toBe("true");
  });

  it("logs errors thrown while selecting a tab", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderSyncTabs({ prefix: "se", syncUrl: false });
    await waitForTabsUpdate();

    const a = document.getElementById("se-a");
    a.getAttribute = () => {
      throw new Error("getAttribute boom");
    };
    a.click();
    await waitForTabsUpdate();

    expect(errorSpy).toHaveBeenCalledWith("[pathogen--tabs] Error selecting tab:", expect.any(Error));
  });

  it("logs errors thrown during keyboard handling", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderVerticalTabs();
    await waitForTabsUpdate();

    const tablist = document.querySelector('[role="tablist"]');
    tablist.getAttribute = () => {
      throw new Error("orientation boom");
    };
    const a = document.getElementById("v-a");
    a.focus();
    dispatchKey(a, "ArrowDown");
    await waitForTabsUpdate();

    expect(errorSpy).toHaveBeenCalledWith("[pathogen--tabs] Error handling keyboard:", expect.any(Error));
  });

  it("recovers when reading the tab index from the hash throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderSyncTabs({ prefix: "gh" });
    await waitForTabsUpdate();

    document.getElementById("gh-pa").getAttribute = () => {
      throw new Error("getAttribute boom");
    };
    setLocation("#gh-pb");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await waitForTabsUpdate();

    expect(errorSpy).toHaveBeenCalledWith("[pathogen--tabs] Error getting tab index from hash:", expect.any(Error));
  });

  it("recovers when applying a hashchange selection throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderSyncTabs({ prefix: "hx" });
    await waitForTabsUpdate();

    const b = document.getElementById("hx-b");
    const originalSetAttribute = b.setAttribute.bind(b);
    b.setAttribute = (name, value) => {
      if (name === "aria-selected") throw new Error("setAttribute boom");
      return originalSetAttribute(name, value);
    };
    setLocation("#hx-b");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await waitForTabsUpdate();

    expect(errorSpy).toHaveBeenCalledWith("[pathogen--tabs] Error handling hash change:", expect.any(Error));
  });

  it("recovers when restoring tabs after a Turbo morph throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderSyncTabs({ prefix: "tx" });
    await waitForTabsUpdate();

    const a = document.getElementById("tx-a");
    const b = document.getElementById("tx-b");

    setLocation("#tx-b");
    for (const tab of [a, b]) {
      tab.setAttribute("aria-selected", "false");
      tab.tabIndex = -1;
    }
    const originalSetAttribute = b.setAttribute.bind(b);
    b.setAttribute = (name, value) => {
      if (name === "aria-selected") throw new Error("setAttribute boom");
      return originalSetAttribute(name, value);
    };

    document.dispatchEvent(new Event("turbo:render"));
    await waitForTabsUpdate();

    expect(errorSpy).toHaveBeenCalledWith("[pathogen--tabs] Error handling turbo render:", expect.any(Error));
  });

  it("moves to the previous vertical tab without wrapping", async () => {
    renderVerticalTabs();
    await waitForTabsUpdate();

    const b = document.getElementById("v-b");
    const c = document.getElementById("v-c");
    c.focus();
    dispatchKey(c, "ArrowUp");
    await waitForTabsUpdate();

    expect(document.activeElement).toBe(b);
  });

  it("cleans up a non-url-synced controller on disconnect", async () => {
    renderSyncTabs({ prefix: "dn", syncUrl: false });
    await waitForTabsUpdate();

    const host = document.getElementById("dn-host");
    host.remove();
    await waitForTabsUpdate();

    expect(host.dataset.controllerConnected).toBeUndefined();
  });

  it("refocuses the already-selected tab without a URL update in non-synced mode", async () => {
    renderSyncTabs({ prefix: "rn", syncUrl: false });
    await waitForTabsUpdate();

    const a = document.getElementById("rn-a");
    const b = document.getElementById("rn-b");

    b.click();
    await waitForTabsUpdate();
    a.focus();
    dispatchKey(a, "End");
    await waitForTabsUpdate();

    expect(document.activeElement).toBe(b);
  });
});
