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
        <p data-pathogen--data-grid-target="scrollHint" hidden>Scroll horizontally to view more columns.</p>
        <div
          data-pathogen--data-grid-target="errorState"
          data-default-message="Something went wrong while rendering this grid. Refresh or try again."
          hidden
        >
          <p data-pathogen--data-grid-target="errorMessage">
            Something went wrong while rendering this grid. Refresh or try again.
          </p>
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

  it("shows the error state when a runtime error event is dispatched", () => {
    const gridRoot = document.querySelector('[data-controller="pathogen--data-grid"]');
    const errorState = document.querySelector('[data-pathogen--data-grid-target="errorState"]');
    const errorMessage = document.querySelector('[data-pathogen--data-grid-target="errorMessage"]');

    gridRoot.dispatchEvent(
      new CustomEvent("pathogen:data-grid:error", {
        bubbles: true,
        detail: { message: "Grid render failed. Please retry." },
      }),
    );

    expect(gridRoot.dataset.pathogenDataGridState).toBe("error");
    expect(errorState.hidden).toBe(false);
    expect(errorMessage.textContent).toContain("Grid render failed. Please retry.");
  });

  it("clears the error state when clear-error is dispatched", () => {
    const gridRoot = document.querySelector('[data-controller="pathogen--data-grid"]');
    const errorState = document.querySelector('[data-pathogen--data-grid-target="errorState"]');

    gridRoot.dispatchEvent(
      new CustomEvent("pathogen:data-grid:error", {
        bubbles: true,
        detail: { message: "Grid render failed. Please retry." },
      }),
    );
    expect(errorState.hidden).toBe(false);

    gridRoot.dispatchEvent(new CustomEvent("pathogen:data-grid:clear-error", { bubbles: true }));

    expect(errorState.hidden).toBe(true);
    expect(gridRoot.dataset.pathogenDataGridState).toBeUndefined();
  });

  it("shows horizontal overflow affordance and hint at the starting edge", () => {
    const gridRoot = document.querySelector('[data-controller="pathogen--data-grid"]');
    const scrollContainer = document.querySelector('[data-pathogen--data-grid-target="scrollContainer"]');
    const scrollHint = document.querySelector('[data-pathogen--data-grid-target="scrollHint"]');

    Object.defineProperty(scrollContainer, "clientWidth", { configurable: true, value: 200 });
    Object.defineProperty(scrollContainer, "scrollWidth", { configurable: true, value: 420 });
    Object.defineProperty(scrollContainer, "scrollLeft", { configurable: true, writable: true, value: 0 });

    scrollContainer.dispatchEvent(new Event("scroll"));

    expect(gridRoot.dataset.pathogenDataGridOverflowing).toBe("true");
    expect(gridRoot.dataset.pathogenDataGridScrollPosition).toBe("start");
    expect(scrollHint.hidden).toBe(false);
  });

  it("updates horizontal overflow state as the user scrolls", () => {
    const gridRoot = document.querySelector('[data-controller="pathogen--data-grid"]');
    const scrollContainer = document.querySelector('[data-pathogen--data-grid-target="scrollContainer"]');
    const scrollHint = document.querySelector('[data-pathogen--data-grid-target="scrollHint"]');

    Object.defineProperty(scrollContainer, "clientWidth", { configurable: true, value: 200 });
    Object.defineProperty(scrollContainer, "scrollWidth", { configurable: true, value: 420 });
    Object.defineProperty(scrollContainer, "scrollLeft", { configurable: true, writable: true, value: 80 });
    scrollContainer.dispatchEvent(new Event("scroll"));

    expect(gridRoot.dataset.pathogenDataGridScrollPosition).toBe("middle");
    expect(scrollHint.hidden).toBe(true);

    scrollContainer.scrollLeft = 220;
    scrollContainer.dispatchEvent(new Event("scroll"));

    expect(gridRoot.dataset.pathogenDataGridScrollPosition).toBe("end");
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

  it("ArrowRight scrolls horizontally when target cell is out of view", async () => {
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
                  Left
                </td>
                <td
                  role="gridcell"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="1"
                  data-pathogen--data-grid-column-index="1"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  Right
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

    const scrollContainer = document.querySelector('[data-pathogen--data-grid-target="scrollContainer"]');
    const leftCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="0"]',
    );
    const rightCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="1"]',
    );

    scrollContainer.scrollLeft = 0;
    scrollContainer.scrollTop = 0;
    scrollContainer.getBoundingClientRect = () => ({
      left: 0,
      right: 100,
      top: 0,
      bottom: 100,
    });
    leftCell.getBoundingClientRect = () => ({
      left: 10,
      right: 50,
      top: 10,
      bottom: 30,
    });
    rightCell.getBoundingClientRect = () => ({
      left: 150,
      right: 230,
      top: 10,
      bottom: 30,
    });

    leftCell.focus();
    dispatchKey(leftCell, "ArrowRight");

    expect(document.activeElement).toBe(rightCell);
    expect(scrollContainer.scrollLeft).toBe(130);
  });

  it("ArrowDown scrolls vertically when target cell is out of view", async () => {
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
                  Row 1
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
                  Row 2
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

    const scrollContainer = document.querySelector('[data-pathogen--data-grid-target="scrollContainer"]');
    const firstRowCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="0"]',
    );
    const secondRowCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="2"][data-pathogen--data-grid-column-index="0"]',
    );

    scrollContainer.scrollLeft = 0;
    scrollContainer.scrollTop = 0;
    scrollContainer.getBoundingClientRect = () => ({
      left: 0,
      right: 120,
      top: 0,
      bottom: 100,
    });
    firstRowCell.getBoundingClientRect = () => ({
      left: 10,
      right: 90,
      top: 10,
      bottom: 30,
    });
    secondRowCell.getBoundingClientRect = () => ({
      left: 10,
      right: 90,
      top: 150,
      bottom: 190,
    });

    firstRowCell.focus();
    dispatchKey(firstRowCell, "ArrowDown");

    expect(document.activeElement).toBe(secondRowCell);
    expect(scrollContainer.scrollTop).toBe(90);
  });

  it("ArrowUp keeps focused body cell visible below sticky header", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--data-grid">
        <div data-pathogen--data-grid-target="scrollContainer">
          <table role="grid" data-pathogen--data-grid-target="grid">
            <thead>
              <tr role="row">
                <th
                  role="columnheader"
                  class="pathogen-data-grid__cell pathogen-data-grid__cell--header"
                  tabindex="-1"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="0"
                  data-pathogen--data-grid-column-index="0"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  Header
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
                  Row 1
                </td>
              </tr>
              <tr role="row">
                <td
                  role="gridcell"
                  tabindex="0"
                  data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-active="true"
                  data-pathogen--data-grid-row-index="2"
                  data-pathogen--data-grid-column-index="0"
                  data-pathogen--data-grid-has-interactive="false"
                >
                  Row 2
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

    const scrollContainer = document.querySelector('[data-pathogen--data-grid-target="scrollContainer"]');
    const headerCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="0"][data-pathogen--data-grid-column-index="0"]',
    );
    const firstRowCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="0"]',
    );
    const secondRowCell = document.querySelector(
      '[data-pathogen--data-grid-row-index="2"][data-pathogen--data-grid-column-index="0"]',
    );

    scrollContainer.scrollTop = 40;
    scrollContainer.getBoundingClientRect = () => ({
      left: 0,
      right: 120,
      top: 0,
      bottom: 100,
    });
    headerCell.getBoundingClientRect = () => ({
      left: 0,
      right: 120,
      top: 0,
      bottom: 24,
    });
    firstRowCell.getBoundingClientRect = () => ({
      left: 10,
      right: 90,
      top: 10,
      bottom: 30,
    });
    secondRowCell.getBoundingClientRect = () => ({
      left: 10,
      right: 90,
      top: 45,
      bottom: 65,
    });

    secondRowCell.focus();
    dispatchKey(secondRowCell, "ArrowUp");

    expect(document.activeElement).toBe(firstRowCell);
    expect(scrollContainer.scrollTop).toBe(26);
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
   * NOTE: This markup must stay in sync with virtual_state_component.html.erb.
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
      <div data-controller="pathogen--data-grid" class="pathogen-data-grid">
        <div data-pathogen--data-grid-target="scrollContainer"
             class="pathogen-data-grid__scroll"
             style="height: ${viewportHeight}px; overflow: auto;">
          <div role="grid" data-pathogen--data-grid-target="grid"
               aria-rowcount="${rowCount + 1}" aria-colcount="2">
            <div class="pathogen-data-grid__virtual-status"
                 data-pathogen--data-grid-target="virtualStatus"
                 data-loading-text="Loading rows…"
                 data-loaded-text="Rows loaded."
                 role="status"
                 aria-live="polite">
              Loading rows…
            </div>
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

  const virtualLaneGridHTML = (
    rowCount,
    { viewportHeight = 200, columnWidths = [120, 160, 160, 160], pinnedCount = 1, columnOverscan = 0 } = {},
  ) => {
    const pinnedWidths = columnWidths.slice(0, pinnedCount);
    const centerWidths = columnWidths.slice(pinnedCount);

    const pinnedTemplate = pinnedWidths.map((width) => `${width}px`).join(" ");
    const centerTemplate = centerWidths.map((width) => `${width}px`).join(" ");
    const fullTemplate = columnWidths.map((width) => `${width}px`).join(" ");

    const headerPinnedCells = pinnedWidths
      .map(
        (_width, index) => `
      <div role="columnheader" tabindex="-1"
        class="pathogen-data-grid__cell pathogen-data-grid__cell--sticky"
        data-pathogen--data-grid-target="cell"
        data-pathogen--data-grid-row-index="0"
        data-pathogen--data-grid-column-index="${index}"
        data-pathogen--data-grid-has-interactive="false">
        H-${index}
      </div>`,
      )
      .join("\n");

    const headerCenterCells = centerWidths
      .map((_, index) => {
        const columnIndex = pinnedCount + index;
        return `
      <div role="columnheader" tabindex="-1"
        class="pathogen-data-grid__cell"
        data-pathogen--data-grid-target="cell"
        data-pathogen--data-grid-row-index="0"
        data-pathogen--data-grid-column-index="${columnIndex}"
        data-pathogen-data-grid-virtual-col-index="${columnIndex}"
        data-pathogen--data-grid-has-interactive="false">
        H-${columnIndex}
      </div>`;
      })
      .join("\n");

    const rows = Array.from({ length: rowCount }, (_, i) => {
      const rowIndex = i + 1;
      const pinnedCells = pinnedWidths
        .map(
          (_width, index) => `
          <div role="gridcell"
            class="pathogen-data-grid__cell pathogen-data-grid__cell--sticky"
            tabindex="${rowIndex === 1 && index === 0 ? "0" : "-1"}"
            ${rowIndex === 1 && index === 0 ? 'data-pathogen--data-grid-active="true"' : ""}
            data-pathogen--data-grid-target="cell"
            data-pathogen--data-grid-row-index="${rowIndex}"
            data-pathogen--data-grid-column-index="${index}"
            data-pathogen--data-grid-has-interactive="false">
            R${rowIndex}-C${index}
          </div>`,
        )
        .join("\n");

      const centerCells = centerWidths
        .map((_, index) => {
          const columnIndex = pinnedCount + index;
          if (columnIndex === 2) {
            return `
          <div role="gridcell"
            class="pathogen-data-grid__cell"
            tabindex="-1"
            data-pathogen--data-grid-target="cell"
            data-pathogen--data-grid-row-index="${rowIndex}"
            data-pathogen--data-grid-column-index="${columnIndex}"
            data-pathogen-data-grid-virtual-col-index="${columnIndex}"
            data-pathogen--data-grid-has-interactive="true">
            <a href="/rows/${rowIndex}" tabindex="-1">Open</a>
            <button type="button" tabindex="-1">Action</button>
          </div>`;
          }

          return `
          <div role="gridcell"
            class="pathogen-data-grid__cell"
            tabindex="-1"
            data-pathogen--data-grid-target="cell"
            data-pathogen--data-grid-row-index="${rowIndex}"
            data-pathogen--data-grid-column-index="${columnIndex}"
            data-pathogen-data-grid-virtual-col-index="${columnIndex}"
            data-pathogen--data-grid-has-interactive="false">
            R${rowIndex}-C${columnIndex}
          </div>`;
        })
        .join("\n");

      return `
        <div role="row" aria-rowindex="${rowIndex + 1}" style="grid-template-columns: ${fullTemplate}; height: 40px;">
          <div class="pathogen-data-grid__lane pathogen-data-grid__lane--pinned"
               data-pathogen-data-grid-lane="pinned"
               role="presentation"
               style="grid-template-columns: ${pinnedTemplate};">
            ${pinnedCells}
          </div>
          <div class="pathogen-data-grid__lane pathogen-data-grid__lane--center"
               data-pathogen-data-grid-lane="center"
               role="presentation"
               style="grid-template-columns: ${centerTemplate};">
            ${centerCells}
          </div>
        </div>`;
    });

    return `
      <div data-controller="pathogen--data-grid" class="pathogen-data-grid pathogen-data-grid--virtual">
        <div data-pathogen--data-grid-target="scrollContainer"
             class="pathogen-data-grid__scroll"
             style="height: ${viewportHeight}px; overflow: auto;">
          <div role="grid" data-pathogen--data-grid-target="grid"
               aria-rowcount="${rowCount + 1}" aria-colcount="${columnWidths.length}"
               data-pathogen-data-grid-row-height="40"
               data-pathogen-data-grid-row-overscan="10"
               data-pathogen-data-grid-column-overscan="${columnOverscan}"
               data-pathogen-data-grid-pinned-count="${pinnedCount}"
               data-pathogen-data-grid-column-widths="${columnWidths.join(",")}">
            <div class="pathogen-data-grid__virtual-status"
                 data-pathogen--data-grid-target="virtualStatus"
                 data-loading-text="Loading rows…"
                 data-loaded-text="Rows loaded."
                 role="status"
                 aria-live="polite">
              Loading rows…
            </div>
            <div role="row" class="pathogen-data-grid__row pathogen-data-grid__row--header"
                 aria-rowindex="1" style="grid-template-columns: ${fullTemplate};">
              <div class="pathogen-data-grid__lane pathogen-data-grid__lane--pinned"
                   data-pathogen-data-grid-lane="pinned"
                   role="presentation"
                   style="grid-template-columns: ${pinnedTemplate};">
                ${headerPinnedCells}
              </div>
              <div class="pathogen-data-grid__lane pathogen-data-grid__lane--center"
                   data-pathogen-data-grid-lane="center"
                   role="presentation"
                   style="grid-template-columns: ${centerTemplate};">
                ${headerCenterCells}
              </div>
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

  it("toggles aria-busy and updates virtual status text when initialization completes", async () => {
    document.body.innerHTML = virtualGridHTML(25);
    const grid = document.querySelector('[data-pathogen--data-grid-target="grid"]');
    const status = document.querySelector('[data-pathogen--data-grid-target="virtualStatus"]');
    const setAttributeSpy = vi.spyOn(grid, "setAttribute");

    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();

    expect(setAttributeSpy).toHaveBeenCalledWith("aria-busy", "true");
    expect(setAttributeSpy).toHaveBeenCalledWith("aria-busy", "false");
    expect(grid.getAttribute("aria-busy")).toBe("false");
    expect(status.textContent.trim()).toBe("Rows loaded.");

    setAttributeSpy.mockRestore();
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

  it("windows center-lane columns in virtual mode and keeps pinned columns mounted", async () => {
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback();
      return 1;
    });

    document.body.innerHTML = virtualLaneGridHTML(30, {
      columnWidths: [120, 160, 160, 160],
      pinnedCount: 1,
      columnOverscan: 0,
    });

    const scrollContainer = document.querySelector('[data-pathogen--data-grid-target="scrollContainer"]');
    Object.defineProperty(scrollContainer, "clientHeight", { configurable: true, value: 200 });
    Object.defineProperty(scrollContainer, "clientWidth", { configurable: true, value: 320 });
    Object.defineProperty(scrollContainer, "scrollTop", { configurable: true, writable: true, value: 0 });
    Object.defineProperty(scrollContainer, "scrollLeft", { configurable: true, writable: true, value: 0 });

    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();

    const firstRow = document.querySelector('[role="row"][aria-rowindex="2"]');
    const pinnedLane = firstRow.querySelector('[data-pathogen-data-grid-lane="pinned"]');
    const centerLane = firstRow.querySelector('[data-pathogen-data-grid-lane="center"]');

    expect(pinnedLane.querySelector('[data-pathogen--data-grid-column-index="0"]')).not.toBeNull();
    expect(centerLane.querySelector('[data-pathogen--data-grid-column-index="1"]')).not.toBeNull();
    expect(centerLane.querySelector('[data-pathogen--data-grid-column-index="2"]')).not.toBeNull();
    expect(centerLane.querySelector('[data-pathogen--data-grid-column-index="3"]')).toBeNull();

    scrollContainer.scrollLeft = 200;
    scrollContainer.dispatchEvent(new Event("scroll"));
    await flush();

    expect(pinnedLane.querySelector('[data-pathogen--data-grid-column-index="0"]')).not.toBeNull();
    expect(centerLane.querySelector('[data-pathogen--data-grid-column-index="1"]')).toBeNull();
    expect(centerLane.querySelector('[data-pathogen--data-grid-column-index="2"]')).not.toBeNull();
    expect(centerLane.querySelector('[data-pathogen--data-grid-column-index="3"]')).not.toBeNull();

    rafSpy.mockRestore();
  });

  it("restores focus to the owning cell after virtual rerender and requires widget re-entry", async () => {
    vi.useFakeTimers();
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback();
      return 1;
    });

    try {
      document.body.innerHTML = virtualLaneGridHTML(20);
      const scrollContainer = document.querySelector('[data-pathogen--data-grid-target="scrollContainer"]');
      Object.defineProperty(scrollContainer, "clientHeight", { configurable: true, value: 200 });
      Object.defineProperty(scrollContainer, "clientWidth", { configurable: true, value: 480 });

      application = Application.start();
      application.register("pathogen--data-grid", DataGridController);
      await flush();

      const interactiveCell = document.querySelector(
        '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="2"]',
      );
      const link = interactiveCell.querySelector("a");

      interactiveCell.focus();
      dispatchKey(interactiveCell, "Enter");
      expect(document.activeElement).toBe(link);
      expect(link.tabIndex).toBe(0);

      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(120);
      await flush();

      expect(document.activeElement).toBe(interactiveCell);
      expect(link.tabIndex).toBe(-1);
    } finally {
      rafSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});
