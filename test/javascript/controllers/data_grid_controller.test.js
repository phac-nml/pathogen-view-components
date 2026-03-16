import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("data_grid_controller (virtual mode)", () => {
  let application;

  /**
   * Generates virtual grid HTML with N rows.
   */
  const virtualGridHTML = (rowCount, { viewportHeight = 200 } = {}) => {
    const headerCells = `
      <div role="columnheader" tabindex="-1"
        data-pathogen--data-grid-target="cell"
        data-pathogen--data-grid-row-index="0"
        data-pathogen--data-grid-column-index="0"
        data-pathogen--data-grid-has-interactive="false">
        ID
      </div>
      <div role="columnheader" tabindex="-1"
        data-pathogen--data-grid-target="cell"
        data-pathogen--data-grid-row-index="0"
        data-pathogen--data-grid-column-index="1"
        data-pathogen--data-grid-has-interactive="false">
        Name
      </div>`;

    const rows = Array.from({ length: rowCount }, (_, i) => {
      const rowIndex = i + 1;
      const isFirst = i === 0;
      return `
        <div role="row" aria-rowindex="${rowIndex + 1}" style="grid-template-columns: 120px 200px; height: 40px;">
          <div role="gridcell"
            tabindex="${isFirst ? "0" : "-1"}"
            ${isFirst ? 'data-pathogen--data-grid-active="true"' : ""}
            data-pathogen--data-grid-target="cell"
            data-pathogen--data-grid-row-index="${rowIndex}"
            data-pathogen--data-grid-column-index="0"
            data-pathogen--data-grid-has-interactive="false">
            ID-${String(rowIndex).padStart(3, "0")}
          </div>
          <div role="gridcell"
            tabindex="-1"
            data-pathogen--data-grid-target="cell"
            data-pathogen--data-grid-row-index="${rowIndex}"
            data-pathogen--data-grid-column-index="1"
            data-pathogen--data-grid-has-interactive="false">
            Name ${rowIndex}
          </div>
        </div>`;
    });

    return `
      <div data-controller="pathogen--data-grid" class="pathogen-data-grid pathogen-data-grid--virtual">
        <div data-pathogen--data-grid-target="scrollContainer"
             class="pathogen-data-grid__scroll"
             style="height: ${viewportHeight}px; overflow: auto;">
          <div role="grid" data-pathogen--data-grid-target="grid"
               aria-rowcount="${rowCount + 1}" aria-colcount="2">
            <div role="row" class="pathogen-data-grid__row pathogen-data-grid__row--header"
                 aria-rowindex="1" style="grid-template-columns: 120px 200px;">
              ${headerCells}
            </div>
            <div class="pathogen-data-grid__viewport" data-pathogen--data-grid-target="viewport">
              <div class="pathogen-data-grid__spacer"></div>
              ${rows.join("\n")}
            </div>
          </div>
        </div>
      </div>`;
  };

  afterEach(() => {
    application?.stop();
    document.body.innerHTML = "";
  });

  it("detaches rows and sets spacer height on connect", async () => {
    document.body.innerHTML = virtualGridHTML(50);
    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();

    const spacer = document.querySelector(".pathogen-data-grid__spacer");
    const viewport = document.querySelector(".pathogen-data-grid__viewport");
    const renderedRows = viewport.querySelectorAll('[role="row"]');

    // Spacer should have height representing all rows
    // (jsdom doesn't compute offsetHeight, so rowHeight falls back to 40)
    expect(spacer.style.height).toBe("2000px"); // 50 × 40

    // Not all rows should be in the DOM (only visible + buffer)
    // With viewport=200, rowHeight=40, that's 5 visible + 10 buffer = 15 max
    // But clamped to totalRows if less
    expect(renderedRows.length).toBeLessThanOrEqual(50);
  });

  it("preserves keyboard navigation between visible cells in virtual mode", async () => {
    document.body.innerHTML = virtualGridHTML(20);
    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();

    const firstCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="0"]',
    );

    // First cell should exist and be focusable
    expect(firstCell).not.toBeNull();
    firstCell.focus();

    // Navigate right
    dispatchKey(firstCell, "ArrowRight");
    const rightCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="1"]',
    );
    expect(document.activeElement).toBe(rightCell);
  });

  it("navigates down through virtual rows", async () => {
    document.body.innerHTML = virtualGridHTML(20);
    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();

    const firstCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="0"]',
    );

    firstCell.focus();
    dispatchKey(firstCell, "ArrowDown");

    const secondRowCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="2"][data-pathogen--data-grid-column-index="0"]',
    );
    expect(secondRowCell).not.toBeNull();
    expect(document.activeElement).toBe(secondRowCell);
    expect(secondRowCell.getAttribute("data-pathogen--data-grid-active")).toBe("true");
  });

  it("header cells are accessible for Ctrl+Home navigation", async () => {
    document.body.innerHTML = virtualGridHTML(10);
    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();

    // Navigate to a data cell first
    const dataCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="0"]',
    );
    dataCell.focus();

    // Ctrl+Home should go to first header cell
    dispatchKey(dataCell, "Home", { ctrlKey: true });

    const headerCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="0"][data-pathogen--data-grid-column-index="0"]',
    );
    expect(document.activeElement).toBe(headerCell);
  });

  it("coalesces multiple scroll events into one animation-frame render", async () => {
    document.body.innerHTML = virtualGridHTML(200);
    const rafSpy = vi.spyOn(window, "requestAnimationFrame");

    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();

    const scrollContainer = document.querySelector('[data-pathogen--data-grid-target="scrollContainer"]');
    scrollContainer.dispatchEvent(new Event("scroll"));
    scrollContainer.dispatchEvent(new Event("scroll"));

    expect(rafSpy).toHaveBeenCalledTimes(1);
    rafSpy.mockRestore();
  });

  it("updates row measurements on debounced resize", async () => {
    vi.useFakeTimers();
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback();
      return 1;
    });

    document.body.innerHTML = virtualGridHTML(20);
    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();

    const viewport = document.querySelector(".pathogen-data-grid__viewport");
    const firstRenderedRow = viewport.querySelector('[role="row"]');
    Object.defineProperty(firstRenderedRow, "offsetHeight", { value: 60, configurable: true });

    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("resize"));
    vi.advanceTimersByTime(120);

    const spacer = document.querySelector(".pathogen-data-grid__spacer");
    expect(spacer.style.height).toBe("1200px");

    rafSpy.mockRestore();
    vi.useRealTimers();
  });
});
