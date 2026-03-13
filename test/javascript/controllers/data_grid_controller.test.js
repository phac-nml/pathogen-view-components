import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import DataGridController from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller";

const flush = async () => Promise.resolve();

const dispatchKey = (target, key, options = {}) => {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key,
    ...options,
  });

  target.dispatchEvent(event);

  return event;
};

describe("data_grid_controller", () => {
  let application;

  beforeEach(async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--data-grid">
        <div data-pathogen--data-grid-target="scrollContainer">
          <table role="grid" data-pathogen--data-grid-target="grid">
            <tbody>
              <tr role="row">
                <td
                  role="gridcell"
                  tabindex="0"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-active="true"
                  data-pathogen--data-grid-row-index="1"
                  data-pathogen--data-grid-column-index="0"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  Alpha
                </td>
                <td
                  role="gridcell"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="1"
                  data-pathogen--data-grid-column-index="1"
                  data-pathogen--data-grid-has-interactive="true"
                >
                  <a href="/samples/S-001" tabindex="-1">Open</a>
                  <button type="button" tabindex="-1">Edit</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();
  });

  afterEach(() => {
    application?.stop();
    document.body.innerHTML = "";
  });

  it("does not move focus into the grid on initialization", () => {
    const firstCell = document.querySelector('[data-pathogen--data-grid-column-index="0"]');

    expect(document.activeElement).toBe(document.body);
    expect(firstCell.getAttribute("data-pathogen--data-grid-active")).toBe("true");
  });

  it("keeps focus on the cell during grid navigation until widget mode is entered", () => {
    const firstCell = document.querySelector('[data-pathogen--data-grid-column-index="0"]');
    const interactiveCell = document.querySelector('[data-pathogen--data-grid-column-index="1"]');
    const link = interactiveCell.querySelector("a");

    firstCell.focus();
    dispatchKey(firstCell, "ArrowRight");

    expect(document.activeElement).toBe(interactiveCell);
    expect(interactiveCell.getAttribute("data-pathogen--data-grid-active")).toBe("true");
    expect(link.tabIndex).toBe(-1);
  });

  it("does not wrap ArrowRight past the end of the row", () => {
    const interactiveCell = document.querySelector('[data-pathogen--data-grid-column-index="1"]');

    interactiveCell.focus();
    const event = dispatchKey(interactiveCell, "ArrowRight");

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(interactiveCell);
    expect(interactiveCell.getAttribute("data-pathogen--data-grid-active")).toBe("true");
  });

  it("enters widget mode with Enter and exits with Escape", () => {
    const interactiveCell = document.querySelector('[data-pathogen--data-grid-column-index="1"]');
    const link = interactiveCell.querySelector("a");
    const button = interactiveCell.querySelector("button");

    interactiveCell.focus();
    dispatchKey(interactiveCell, "Enter");

    expect(document.activeElement).toBe(link);
    expect(link.tabIndex).toBe(0);
    expect(button.tabIndex).toBe(-1);

    dispatchKey(link, "Escape");

    expect(document.activeElement).toBe(interactiveCell);
    expect(interactiveCell.tabIndex).toBe(0);
    expect(link.tabIndex).toBe(-1);
    expect(button.tabIndex).toBe(-1);
  });

  it("does not hijack arrow keys while focus is inside an interactive descendant", () => {
    const firstCell = document.querySelector('[data-pathogen--data-grid-column-index="0"]');
    const interactiveCell = document.querySelector('[data-pathogen--data-grid-column-index="1"]');
    const link = interactiveCell.querySelector("a");

    interactiveCell.focus();
    dispatchKey(interactiveCell, "F2");
    const event = dispatchKey(link, "ArrowLeft");

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(link);
    expect(firstCell.getAttribute("data-pathogen--data-grid-active")).toBeNull();
    expect(interactiveCell.getAttribute("data-pathogen--data-grid-active")).toBe("true");
  });

  it("uses arrow keys to move between widgets in widget mode", () => {
    const interactiveCell = document.querySelector('[data-pathogen--data-grid-column-index="1"]');
    const link = interactiveCell.querySelector("a");
    const button = interactiveCell.querySelector("button");

    interactiveCell.focus();
    dispatchKey(interactiveCell, "Enter");

    const forward = dispatchKey(link, "ArrowRight");
    expect(forward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button);
    expect(button.tabIndex).toBe(0);
    expect(link.tabIndex).toBe(-1);

    const backward = dispatchKey(button, "ArrowLeft");
    expect(backward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(link);
    expect(link.tabIndex).toBe(0);
    expect(button.tabIndex).toBe(-1);
  });

  it("passes arrow keys through to text inputs in widget mode", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--data-grid">
        <div data-pathogen--data-grid-target="scrollContainer">
          <table role="grid" data-pathogen--data-grid-target="grid">
            <tbody>
              <tr role="row">
                <td
                  role="gridcell"
                  tabindex="0"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-active="true"
                  data-pathogen--data-grid-row-index="1"
                  data-pathogen--data-grid-column-index="0"
                  data-pathogen--data-grid-has-interactive="true"
                >
                  <input type="text" value="abc" tabindex="-1" />
                  <button type="button" tabindex="-1">Apply</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    application.stop();
    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();

    const interactiveCell = document.querySelector('[data-pathogen--data-grid-column-index="0"]');
    const input = interactiveCell.querySelector("input");

    interactiveCell.focus();
    dispatchKey(interactiveCell, "Enter");
    const event = dispatchKey(input, "ArrowRight");

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(input);
  });

  it("moves focus to the last body cell with Ctrl+End", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--data-grid">
        <div data-pathogen--data-grid-target="scrollContainer">
          <table role="grid" data-pathogen--data-grid-target="grid">
            <thead>
              <tr role="row">
                <th
                  role="columnheader"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="0"
                  data-pathogen--data-grid-column-index="0"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  ID
                </th>
                <th
                  role="columnheader"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="0"
                  data-pathogen--data-grid-column-index="1"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  Name
                </th>
              </tr>
            </thead>
            <tbody>
              <tr role="row">
                <td
                  role="gridcell"
                  tabindex="0"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-active="true"
                  data-pathogen--data-grid-row-index="1"
                  data-pathogen--data-grid-column-index="0"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  Alpha
                </td>
                <td
                  role="gridcell"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="1"
                  data-pathogen--data-grid-column-index="1"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  A-1
                </td>
              </tr>
              <tr role="row">
                <td
                  role="gridcell"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="2"
                  data-pathogen--data-grid-column-index="0"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  Beta
                </td>
                <td
                  role="gridcell"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="2"
                  data-pathogen--data-grid-column-index="1"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  B-1
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    application.stop();
    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();

    const firstCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="0"]',
    );
    const lastCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="2"][data-pathogen--data-grid-column-index="1"]',
    );

    firstCell.focus();
    dispatchKey(firstCell, "End", { ctrlKey: true });

    expect(document.activeElement).toBe(lastCell);
    expect(lastCell.getAttribute("data-pathogen--data-grid-active")).toBe("true");
    expect(lastCell.tabIndex).toBe(0);
  });

  it("does not intercept Tab in grid mode — allows browser to exit the grid", () => {
    const firstCell = document.querySelector('[data-pathogen--data-grid-column-index="0"]');
    const interactiveCell = document.querySelector('[data-pathogen--data-grid-column-index="1"]');

    // Tab from a plain cell
    firstCell.focus();
    const tabFromPlain = dispatchKey(firstCell, "Tab");
    expect(tabFromPlain.defaultPrevented).toBe(false);

    // Tab from a cell that has multiple interactive elements (grid mode, not widget mode)
    interactiveCell.focus();
    const tabFromInteractive = dispatchKey(interactiveCell, "Tab");
    expect(tabFromInteractive.defaultPrevented).toBe(false);
  });

  it("Tab cycles between interactive elements only in widget mode when there is no next interactive cell", () => {
    const interactiveCell = document.querySelector('[data-pathogen--data-grid-column-index="1"]');
    const link = interactiveCell.querySelector("a");
    const button = interactiveCell.querySelector("button");

    // Enter widget mode
    interactiveCell.focus();
    dispatchKey(interactiveCell, "Enter");
    expect(document.activeElement).toBe(link);

    // Tab from link → button (widget mode cycling)
    const tabEvent = dispatchKey(link, "Tab");
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button);

    // Tab from last interactive element with no next interactive cell → not prevented
    const tabFromLast = dispatchKey(button, "Tab");
    expect(tabFromLast.defaultPrevented).toBe(false);
  });

  it("Tab moves to the next interactive cell while staying in widget mode", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--data-grid">
        <div data-pathogen--data-grid-target="scrollContainer">
          <table role="grid" data-pathogen--data-grid-target="grid">
            <tbody>
              <tr role="row">
                <td
                  role="gridcell"
                  tabindex="0"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-active="true"
                  data-pathogen--data-grid-row-index="1"
                  data-pathogen--data-grid-column-index="0"
                  data-pathogen--data-grid-has-interactive="true"
                >
                  <a href="/samples/S-001" tabindex="-1">Open</a>
                  <button type="button" tabindex="-1">Edit</button>
                </td>
                <td
                  role="gridcell"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="1"
                  data-pathogen--data-grid-column-index="1"
                  data-pathogen--data-grid-has-interactive="true"
                >
                  <a href="/samples/S-002" tabindex="-1">Inspect</a>
                  <button type="button" tabindex="-1">Queue</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    application.stop();
    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();

    const firstInteractiveCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="0"]',
    );
    const editButton = firstInteractiveCell.querySelector("button");
    const secondInteractiveCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="1"]',
    );
    const secondLink = secondInteractiveCell.querySelector("a");

    firstInteractiveCell.focus();
    dispatchKey(firstInteractiveCell, "Enter");
    dispatchKey(firstInteractiveCell.querySelector("a"), "Tab");
    const tabFromLast = dispatchKey(editButton, "Tab");

    expect(tabFromLast.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(secondLink);
    expect(secondInteractiveCell.getAttribute("data-pathogen--data-grid-active")).toBe("true");
    expect(secondLink.tabIndex).toBe(0);
  });

  it("Shift+Tab moves to the previous interactive cell while staying in widget mode", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--data-grid">
        <div data-pathogen--data-grid-target="scrollContainer">
          <table role="grid" data-pathogen--data-grid-target="grid">
            <tbody>
              <tr role="row">
                <td
                  role="gridcell"
                  tabindex="0"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-active="true"
                  data-pathogen--data-grid-row-index="1"
                  data-pathogen--data-grid-column-index="0"
                  data-pathogen--data-grid-has-interactive="true"
                >
                  <a href="/samples/S-001" tabindex="-1">Open</a>
                  <button type="button" tabindex="-1">Edit</button>
                </td>
                <td
                  role="gridcell"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="1"
                  data-pathogen--data-grid-column-index="1"
                  data-pathogen--data-grid-has-interactive="true"
                >
                  <a href="/samples/S-002" tabindex="-1">Inspect</a>
                  <button type="button" tabindex="-1">Queue</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    application.stop();
    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();

    const secondInteractiveCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="1"]',
    );
    const secondLink = secondInteractiveCell.querySelector("a");
    const firstInteractiveCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="0"]',
    );
    const firstButton = firstInteractiveCell.querySelector("button");

    secondInteractiveCell.focus();
    dispatchKey(secondInteractiveCell, "Enter");
    const shiftTabFromFirst = dispatchKey(secondLink, "Tab", { shiftKey: true });

    expect(shiftTabFromFirst.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(firstButton);
    expect(firstInteractiveCell.getAttribute("data-pathogen--data-grid-active")).toBe("true");
    expect(firstButton.tabIndex).toBe(0);
  });

  it("moves focus to the first header cell with Ctrl+Home", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--data-grid">
        <div data-pathogen--data-grid-target="scrollContainer">
          <table role="grid" data-pathogen--data-grid-target="grid">
            <thead>
              <tr role="row">
                <th
                  role="columnheader"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="0"
                  data-pathogen--data-grid-column-index="0"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  ID
                </th>
                <th
                  role="columnheader"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="0"
                  data-pathogen--data-grid-column-index="1"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  Name
                </th>
              </tr>
            </thead>
            <tbody>
              <tr role="row">
                <td
                  role="gridcell"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="1"
                  data-pathogen--data-grid-column-index="0"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  Alpha
                </td>
                <td
                  role="gridcell"
                  tabindex="0"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-active="true"
                  data-pathogen--data-grid-row-index="1"
                  data-pathogen--data-grid-column-index="1"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  A-1
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    application.stop();
    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();

    const lastCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="1"]',
    );
    const firstHeaderCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="0"][data-pathogen--data-grid-column-index="0"]',
    );

    lastCell.focus();
    dispatchKey(lastCell, "Home", { ctrlKey: true });

    expect(document.activeElement).toBe(firstHeaderCell);
    expect(firstHeaderCell.getAttribute("data-pathogen--data-grid-active")).toBe("true");
    expect(firstHeaderCell.tabIndex).toBe(0);
  });

  it("moves focus to the last body cell with Ctrl+End from widget mode", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--data-grid">
        <div data-pathogen--data-grid-target="scrollContainer">
          <table role="grid" data-pathogen--data-grid-target="grid">
            <thead>
              <tr role="row">
                <th
                  role="columnheader"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="0"
                  data-pathogen--data-grid-column-index="0"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  ID
                </th>
                <th
                  role="columnheader"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="0"
                  data-pathogen--data-grid-column-index="1"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr role="row">
                <td
                  role="gridcell"
                  tabindex="0"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-active="true"
                  data-pathogen--data-grid-row-index="1"
                  data-pathogen--data-grid-column-index="0"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  Alpha
                </td>
                <td
                  role="gridcell"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="1"
                  data-pathogen--data-grid-column-index="1"
                  data-pathogen--data-grid-has-interactive="true"
                >
                  <a href="/samples/S-001" tabindex="-1">Open</a>
                  <button type="button" tabindex="-1">Edit</button>
                </td>
              </tr>
              <tr role="row">
                <td
                  role="gridcell"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="2"
                  data-pathogen--data-grid-column-index="0"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  Beta
                </td>
                <td
                  role="gridcell"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="2"
                  data-pathogen--data-grid-column-index="1"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  Done
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    application.stop();
    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();

    const interactiveCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="1"]',
    );
    const link = interactiveCell.querySelector("a");
    const lastCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="2"][data-pathogen--data-grid-column-index="1"]',
    );

    interactiveCell.focus();
    dispatchKey(interactiveCell, "Enter");
    dispatchKey(link, "End", { ctrlKey: true });

    expect(document.activeElement).toBe(lastCell);
    expect(lastCell.getAttribute("data-pathogen--data-grid-active")).toBe("true");
    expect(link.tabIndex).toBe(-1);
  });
});

const mountVirtualGrid = (dataset) => {
  document.body.innerHTML = "";

  const root = document.createElement("div");
  root.setAttribute("data-controller", "pathogen--data-grid");
  root.setAttribute("data-pathogen--data-grid-virtual-value", "true");
  root.setAttribute("data-pathogen--data-grid-virtual-row-height-value", "40");
  root.setAttribute("data-pathogen--data-grid-virtual-overscan-rows-value", "6");
  root.setAttribute("data-pathogen--data-grid-virtual-overscan-columns-value", "3");
  root.setAttribute("data-pathogen--data-grid-virtual-dataset-value", JSON.stringify(dataset));

  const scroll = document.createElement("div");
  scroll.setAttribute("data-pathogen--data-grid-target", "scrollContainer");
  scroll.style.height = "320px";
  scroll.style.width = "640px";
  scroll.style.overflow = "auto";

  const table = document.createElement("table");
  table.setAttribute("role", "grid");
  table.setAttribute("data-pathogen--data-grid-target", "grid");

  const thead = document.createElement("thead");
  thead.className = "pathogen-data-grid__header";
  const headerRow = document.createElement("tr");
  headerRow.className = "pathogen-data-grid__row pathogen-data-grid__row--header";
  headerRow.setAttribute("role", "row");
  headerRow.setAttribute("data-pathogen--data-grid-target", "headerRow");
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");
  tbody.className = "pathogen-data-grid__body";
  tbody.setAttribute("data-pathogen--data-grid-target", "body");

  table.appendChild(thead);
  table.appendChild(tbody);
  scroll.appendChild(table);
  root.appendChild(scroll);
  document.body.appendChild(root);
};

describe("data_grid_controller virtual mode", () => {
  let application;

  const startController = async (dataset) => {
    mountVirtualGrid(dataset);
    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();
  };

  const setScrollViewport = (height = 320, width = 640) => {
    const scrollContainer = document.querySelector('[data-pathogen--data-grid-target="scrollContainer"]');
    Object.defineProperty(scrollContainer, "clientHeight", { configurable: true, value: height });
    Object.defineProperty(scrollContainer, "clientWidth", { configurable: true, value: width });
    return scrollContainer;
  };

  afterEach(() => {
    application?.stop();
    document.body.innerHTML = "";
  });

  it("renders a viewport-bounded window while keeping sticky columns mounted", async () => {
    await startController({
      mode: "synthetic",
      rowCount: 25000,
      columns: [
        { id: "sample_id", label: "Sample ID", width: 180, sticky: true },
        { id: "name", label: "Name", width: 240, sticky: true },
        { id: "status", label: "Status", width: 160 },
        { id: "collection", label: "Collection", width: 180 },
        { id: "owner", label: "Owner", width: 180 },
      ],
    });
    const renderedRows = document.querySelectorAll("tbody tr[role='row']").length;
    expect(renderedRows).toBeGreaterThan(0);
    expect(renderedRows).toBeLessThan(25000);

    const stickyHeader = document.querySelector(
      "th.pathogen-data-grid__cell--sticky[data-pathogen--data-grid-column-index='0']",
    );
    expect(stickyHeader).not.toBeNull();
  });

  it("scrolls to and focuses the top-left cell with Ctrl+Home", async () => {
    await startController({
      mode: "synthetic",
      rowCount: 2000,
      columns: Array.from({ length: 80 }, (_, index) => ({
        id: `col_${index}`,
        label: `Column ${index + 1}`,
        width: 140,
        sticky: index < 2,
      })),
    });

    const scrollContainer = setScrollViewport();
    scrollContainer.scrollTop = 8_000;
    scrollContainer.scrollLeft = 6_000;
    scrollContainer.dispatchEvent(new Event("scroll"));
    await flush();

    const focusedCell = document.querySelector(
      "tbody td.pathogen-data-grid__cell--body:not(.pathogen-data-grid__cell--spacer)",
    );
    focusedCell.focus();
    dispatchKey(focusedCell, "Home", { ctrlKey: true });
    scrollContainer.dispatchEvent(new Event("scroll"));
    await flush();

    const topLeftCell = document.querySelector(
      "[data-pathogen--data-grid-row-index='0'][data-pathogen--data-grid-column-index='0']",
    );
    expect(scrollContainer.scrollTop).toBe(0);
    expect(scrollContainer.scrollLeft).toBe(0);
    expect(document.activeElement).toBe(topLeftCell);
    expect(topLeftCell.getAttribute("data-pathogen--data-grid-active")).toBe("true");
  });

  it("scrolls to and focuses the bottom-right cell with Ctrl+End", async () => {
    const rowCount = 1000;
    const columnCount = 300;

    await startController({
      mode: "synthetic",
      rowCount,
      columns: Array.from({ length: columnCount }, (_, index) => ({
        id: `col_${index}`,
        label: `Column ${index + 1}`,
        width: 140,
        sticky: index < 2,
      })),
    });

    const scrollContainer = setScrollViewport();
    const focusedCell = document.querySelector(
      "tbody td.pathogen-data-grid__cell--body:not(.pathogen-data-grid__cell--spacer)",
    );
    focusedCell.focus();
    dispatchKey(focusedCell, "End", { ctrlKey: true });
    scrollContainer.dispatchEvent(new Event("scroll"));
    await flush();

    const expectedTop = rowCount * 40 - 320;
    const stickyWidth = 2 * 140;
    const centerWidth = (columnCount - 2) * 140;
    const expectedLeft = centerWidth - (640 - stickyWidth);
    const bottomRightCell = document.querySelector(
      `[data-pathogen--data-grid-row-index='${rowCount}'][data-pathogen--data-grid-column-index='${columnCount - 1}']`,
    );

    expect(scrollContainer.scrollTop).toBe(expectedTop);
    expect(scrollContainer.scrollLeft).toBe(expectedLeft);
    expect(document.activeElement).toBe(bottomRightCell);
    expect(bottomRightCell.getAttribute("data-pathogen--data-grid-active")).toBe("true");
  });

  it("keeps render bounds small during rapid scroll jumps", async () => {
    await startController({
      mode: "synthetic",
      rowCount: 100000,
      columns: Array.from({ length: 1200 }, (_, index) => ({
        id: `col_${index}`,
        label: `Column ${index + 1}`,
        width: 140,
        sticky: index < 2,
      })),
    });

    const scrollContainer = document.querySelector('[data-pathogen--data-grid-target="scrollContainer"]');
    scrollContainer.scrollTop = 320_000;
    scrollContainer.scrollLeft = 120_000;
    scrollContainer.dispatchEvent(new Event("scroll"));
    await flush();

    const renderedBodyRows = document.querySelectorAll(
      "tbody tr.pathogen-data-grid__row:not(.pathogen-data-grid__row--spacer)",
    );
    expect(renderedBodyRows.length).toBeGreaterThan(0);
    expect(renderedBodyRows.length).toBeLessThan(200);

    const focusedCell = document.querySelector(
      "tbody td.pathogen-data-grid__cell--body:not(.pathogen-data-grid__cell--spacer)",
    );
    focusedCell.focus();
    dispatchKey(focusedCell, "End", { ctrlKey: true });
    await flush();

    scrollContainer.scrollLeft = 0;
    scrollContainer.dispatchEvent(new Event("scroll"));
    await flush();

    const renderedCenterHeaders = document.querySelectorAll(
      "thead th.pathogen-data-grid__cell--header:not(.pathogen-data-grid__cell--sticky):not(.pathogen-data-grid__cell--spacer)",
    );
    expect(renderedCenterHeaders.length).toBeGreaterThan(0);
    expect(renderedCenterHeaders.length).toBeLessThan(80);
  });

  it("navigates to an offscreen row/column with Ctrl+End and restores active focus", async () => {
    await startController({
      mode: "synthetic",
      rowCount: 512,
      columns: Array.from({ length: 20 }, (_, index) => ({
        id: `col_${index}`,
        label: `Column ${index + 1}`,
        width: 140,
        sticky: index < 2,
      })),
    });

    const firstCell = document.querySelector(
      "[data-pathogen--data-grid-row-index='1'][data-pathogen--data-grid-column-index='0']",
    );
    firstCell.focus();
    dispatchKey(firstCell, "End", { ctrlKey: true });
    await flush();

    const lastCell = document.querySelector(
      "[data-pathogen--data-grid-row-index='512'][data-pathogen--data-grid-column-index='19']",
    );
    expect(lastCell).not.toBeNull();
    expect(document.activeElement).toBe(lastCell);
    expect(lastCell.getAttribute("data-pathogen--data-grid-active")).toBe("true");
  });

  it("keeps widget mode enter/escape behavior in virtual cells", async () => {
    await startController({
      mode: "synthetic",
      rowCount: 120,
      columns: [
        { id: "sample_id", label: "Sample ID", width: 180, sticky: true },
        { id: "details", label: "Details", width: 200, kind: "link" },
        { id: "queue", label: "Queue", width: 160, kind: "button" },
      ],
    });

    const linkCell = document.querySelector(
      "[data-pathogen--data-grid-row-index='1'][data-pathogen--data-grid-column-index='1']",
    );
    linkCell.focus();
    dispatchKey(linkCell, "Enter");
    await flush();

    const link = linkCell.querySelector("a");
    expect(document.activeElement).toBe(link);
    expect(link.tabIndex).toBe(0);

    dispatchKey(link, "Escape");
    await flush();

    expect(document.activeElement).toBe(linkCell);
    expect(linkCell.getAttribute("data-pathogen--data-grid-active")).toBe("true");
    expect(link.tabIndex).toBe(-1);
  });
});
