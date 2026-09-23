import { Application } from "@hotwired/stimulus";
import { afterEach, describe, expect, it, vi } from "vitest";

import DataGridController from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller";

const flush = () => Promise.resolve();

const dispatchKey = (target, key, options = {}) =>
  target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key, ...options }));

let application;

async function start(html) {
  document.body.innerHTML = html;
  application = Application.start();
  application.register("pathogen--data-grid", DataGridController);
  await flush();
  return document.querySelector('[data-controller="pathogen--data-grid"]');
}

const q = (selector) => document.querySelector(selector);
const cellAt = (row, column) =>
  q(`[data-pathogen--data-grid-row-index="${row}"][data-pathogen--data-grid-column-index="${column}"]`);

const tableGrid = ({ withErrorState = true } = {}) => `
  <div data-controller="pathogen--data-grid">
    <div data-pathogen--data-grid-target="scrollContainer">
      <table role="grid" data-pathogen--data-grid-target="grid" aria-colcount="2">
        <tbody>
          <tr role="row">
            <td role="gridcell" tabindex="0" data-pathogen--data-grid-target="cell"
              data-pathogen--data-grid-active="true" data-pathogen--data-grid-row-index="1"
              data-pathogen--data-grid-column-index="0" data-pathogen--data-grid-has-interactive="false">Alpha</td>
            <td role="gridcell" tabindex="-1" data-pathogen--data-grid-target="cell"
              data-pathogen--data-grid-row-index="1" data-pathogen--data-grid-column-index="1"
              data-pathogen--data-grid-has-interactive="true">
              <a href="/samples/S-001" tabindex="-1">Open</a>
              <button type="button" tabindex="-1">Edit</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    ${
      withErrorState
        ? `<div data-pathogen--data-grid-target="errorState"
             data-default-message="Something went wrong while rendering this grid. Refresh or try again." hidden>
             <p data-pathogen--data-grid-target="errorMessage">Something went wrong.</p>
           </div>`
        : ""
    }
  </div>`;

afterEach(() => {
  application?.stop();
  application = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("data_grid_controller focusin and click handling", () => {
  it("activates a cell when focus enters it", async () => {
    await start(tableGrid());
    const cell = cellAt(1, 1);

    cell.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

    expect(cell.getAttribute("data-pathogen--data-grid-active")).toBe("true");
    expect(cellAt(1, 0).getAttribute("data-pathogen--data-grid-active")).toBeNull();
  });

  it("promotes an interactive descendant when focus enters through it", async () => {
    await start(tableGrid());
    const cell = cellAt(1, 1);
    const link = cell.querySelector("a");

    link.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

    expect(cell.getAttribute("data-pathogen--data-grid-active")).toBe("true");
    expect(link.tabIndex).toBe(0);
  });

  it("ignores focus that lands outside any cell", async () => {
    const root = await start(tableGrid());
    const outside = document.createElement("input");
    root.appendChild(outside);

    outside.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

    expect(cellAt(1, 0).getAttribute("data-pathogen--data-grid-active")).toBe("true");
  });

  it("focuses a plain cell on click and prevents the default selection", async () => {
    await start(tableGrid());
    const cell = cellAt(1, 0);

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    cell.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(cell);
  });

  it("enters widget mode on click of an interactive descendant", async () => {
    await start(tableGrid());
    const cell = cellAt(1, 1);
    const link = cell.querySelector("a");

    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(cell.getAttribute("data-pathogen--data-grid-active")).toBe("true");
    expect(link.tabIndex).toBe(0);
  });

  it("ignores clicks outside any cell", async () => {
    const root = await start(tableGrid());
    const outside = document.createElement("button");
    root.appendChild(outside);

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    outside.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});

describe("data_grid_controller keydown guards", () => {
  it("ignores keydown when the event was already handled", async () => {
    await start(tableGrid());
    const cell = cellAt(1, 0);
    cell.focus();
    document.addEventListener("keydown", (event) => event.preventDefault(), { capture: true, once: true });

    const handled = dispatchKey(cell, "ArrowRight");

    expect(document.activeElement).toBe(cell);
    expect(handled).toBe(false);
  });

  it("ignores keydown when there is no grid target", async () => {
    await start(`
      <div data-controller="pathogen--data-grid">
        <span data-pathogen--data-grid-target="cell" tabindex="0"
          data-pathogen--data-grid-row-index="1" data-pathogen--data-grid-column-index="0">Loose</span>
      </div>`);
    const loose = q('[data-pathogen--data-grid-target="cell"]');
    loose.focus();

    const notPrevented = dispatchKey(loose, "ArrowRight");

    expect(notPrevented).toBe(true);
    expect(document.activeElement).toBe(loose);
  });

  it("ignores keyboard events originating from non-HTML elements", async () => {
    const root = await start(tableGrid());
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("tabindex", "0");
    root.appendChild(svg);

    const notPrevented = dispatchKey(svg, "ArrowRight");

    expect(notPrevented).toBe(true);
  });
});

describe("data_grid_controller active cell resolution", () => {
  it("resolves the initial active cell when nothing is focused yet", async () => {
    await start(tableGrid());

    dispatchKey(cellAt(1, 0), "ArrowRight");

    expect(document.activeElement).toBe(cellAt(1, 1));
  });

  it("maps the focused element back to its cached cell during navigation", async () => {
    await start(tableGrid());
    const cell = cellAt(1, 1);
    cell.focus();

    dispatchKey(cell, "ArrowLeft");

    expect(document.activeElement).toBe(cellAt(1, 0));
  });

  it("reuses the last active cell on subsequent navigation", async () => {
    await start(tableGrid());
    const cell = cellAt(1, 0);
    cell.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

    dispatchKey(cell, "ArrowRight");

    expect(document.activeElement).toBe(cellAt(1, 1));
  });
});

describe("data_grid_controller error state", () => {
  it("shows the default message for a non-custom error event", async () => {
    const root = await start(tableGrid());

    root.dispatchEvent(new Event("pathogen:data-grid:error", { bubbles: true }));

    expect(q('[data-pathogen--data-grid-target="errorState"]').hidden).toBe(false);
  });

  it("falls back to the default message when the error detail is blank", async () => {
    const root = await start(tableGrid());

    root.dispatchEvent(new CustomEvent("pathogen:data-grid:error", { bubbles: true, detail: { message: "   " } }));

    expect(q('[data-pathogen--data-grid-target="errorMessage"]').textContent).toContain("Something went wrong");
  });

  it("ignores error events when no error-state target is present", async () => {
    const root = await start(tableGrid({ withErrorState: false }));

    expect(() =>
      root.dispatchEvent(new CustomEvent("pathogen:data-grid:error", { bubbles: true, detail: { message: "Boom" } })),
    ).not.toThrow();
  });

  it("reports a runtime error raised while connecting", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await start(`
      <div data-controller="pathogen--data-grid">
        <div data-pathogen--data-grid-target="viewport"></div>
      </div>`);

    expect(consoleError).toHaveBeenCalled();
  });
});

describe("data_grid_controller pre-connect focus", () => {
  async function connect() {
    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();
  }

  it("maps a cell focused before connect to its cached coordinate", async () => {
    document.body.innerHTML = tableGrid();
    cellAt(1, 1).focus();

    await connect();
    dispatchKey(cellAt(1, 1), "ArrowLeft");

    expect(document.activeElement).toBe(cellAt(1, 0));
  });

  it("keeps focus on a pre-focused cell whose coordinates are not numeric", async () => {
    document.body.innerHTML = `
      <div data-controller="pathogen--data-grid">
        <div data-pathogen--data-grid-target="scrollContainer">
          <table role="grid" data-pathogen--data-grid-target="grid">
            <tbody>
              <tr role="row">
                <td role="gridcell" tabindex="0" data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="unknown" data-pathogen--data-grid-column-index="unknown"
                  data-pathogen--data-grid-has-interactive="false">Loose</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;
    const cell = q('[data-pathogen--data-grid-target="cell"]');
    cell.focus();

    await connect();
    const event = dispatchKey(cell, "ArrowRight");

    expect(event).toBe(true);
    expect(document.activeElement).toBe(cell);
  });
});

describe("data_grid_controller widget-mode cell traversal", () => {
  const multiInteractiveGrid = `
    <div data-controller="pathogen--data-grid">
      <div data-pathogen--data-grid-target="scrollContainer">
        <table role="grid" data-pathogen--data-grid-target="grid">
          <tbody>
            <tr role="row">
              <td role="gridcell" tabindex="0" data-pathogen--data-grid-target="cell"
                data-pathogen--data-grid-active="true" data-pathogen--data-grid-row-index="1"
                data-pathogen--data-grid-column-index="0" data-pathogen--data-grid-has-interactive="true">
                <a href="/a" tabindex="-1">Open 0</a>
              </td>
              <td role="gridcell" tabindex="-1" data-pathogen--data-grid-target="cell"
                data-pathogen--data-grid-row-index="1" data-pathogen--data-grid-column-index="1"
                data-pathogen--data-grid-has-interactive="false">Plain</td>
              <td role="gridcell" tabindex="-1" data-pathogen--data-grid-target="cell"
                data-pathogen--data-grid-row-index="1" data-pathogen--data-grid-column-index="2"
                data-pathogen--data-grid-has-interactive="true">
                <a href="/c" tabindex="-1">Open 2</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;

  it("Tab from the last widget skips non-interactive cells to the next interactive cell", async () => {
    await start(multiInteractiveGrid);
    const first = cellAt(1, 0);
    first.focus();
    dispatchKey(first, "Enter");

    const event = dispatchKey(first.querySelector("a"), "Tab");

    expect(event).toBe(false);
    expect(document.activeElement).toBe(cellAt(1, 2).querySelector("a"));
  });

  it("Shift+Tab from the first widget skips non-interactive cells to the previous interactive cell", async () => {
    await start(multiInteractiveGrid);
    const last = cellAt(1, 2);
    last.focus();
    dispatchKey(last, "Enter");

    const event = dispatchKey(last.querySelector("a"), "Tab", { shiftKey: true });

    expect(event).toBe(false);
    expect(document.activeElement).toBe(cellAt(1, 0).querySelector("a"));
  });

  it("does not consume Tab when the adjacent interactive cell refuses focus", async () => {
    await start(multiInteractiveGrid);
    const first = cellAt(1, 0);
    first.focus();
    dispatchKey(first, "Enter");
    vi.spyOn(cellAt(1, 2).querySelector("a"), "focus").mockImplementation(() => {});

    const event = dispatchKey(first.querySelector("a"), "Tab");

    expect(event).toBe(true);
  });
});

describe("data_grid_controller resolution edge cases", () => {
  it("does not navigate when no active cell can be resolved", async () => {
    await start(`
      <div data-controller="pathogen--data-grid">
        <div data-pathogen--data-grid-target="scrollContainer">
          <table role="grid" data-pathogen--data-grid-target="grid">
            <tbody>
              <tr role="row">
                <td role="gridcell" tabindex="-1" data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="5" data-pathogen--data-grid-column-index="3">Lonely</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`);
    const cell = q('[data-pathogen--data-grid-target="cell"]');

    const event = dispatchKey(cell, "ArrowRight");

    expect(event).toBe(true);
    expect(document.activeElement).toBe(document.body);
  });

  it("navigates when the grid has no scroll container", async () => {
    await start(`
      <div data-controller="pathogen--data-grid">
        <table role="grid" data-pathogen--data-grid-target="grid">
          <tbody>
            <tr role="row">
              <td role="gridcell" tabindex="0" data-pathogen--data-grid-target="cell"
                data-pathogen--data-grid-active="true" data-pathogen--data-grid-row-index="1"
                data-pathogen--data-grid-column-index="0" data-pathogen--data-grid-has-interactive="false">A</td>
              <td role="gridcell" tabindex="-1" data-pathogen--data-grid-target="cell"
                data-pathogen--data-grid-row-index="1" data-pathogen--data-grid-column-index="1"
                data-pathogen--data-grid-has-interactive="false">B</td>
            </tr>
          </tbody>
        </table>
      </div>`);
    const first = cellAt(1, 0);
    first.focus();

    dispatchKey(first, "ArrowRight");

    expect(document.activeElement).toBe(cellAt(1, 1));
  });

  it("resolves a header cell when navigating up into the sticky header", async () => {
    await start(`
      <div data-controller="pathogen--data-grid">
        <div data-pathogen--data-grid-target="scrollContainer">
          <table role="grid" data-pathogen--data-grid-target="grid">
            <thead>
              <tr role="row">
                <th role="columnheader" tabindex="-1" data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="0" data-pathogen--data-grid-column-index="0"
                  data-pathogen--data-grid-has-interactive="false">Header</th>
              </tr>
            </thead>
            <tbody>
              <tr role="row">
                <td role="gridcell" tabindex="0" data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-active="true" data-pathogen--data-grid-row-index="1"
                  data-pathogen--data-grid-column-index="0" data-pathogen--data-grid-has-interactive="false">Body</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`);
    const body = cellAt(1, 0);
    body.focus();

    dispatchKey(body, "ArrowUp");

    expect(document.activeElement).toBe(cellAt(0, 0));
  });

  it("focuses a clicked cell that has no numeric coordinates", async () => {
    await start(`
      <div data-controller="pathogen--data-grid">
        <div data-pathogen--data-grid-target="scrollContainer">
          <table role="grid" data-pathogen--data-grid-target="grid">
            <tbody>
              <tr role="row">
                <td role="gridcell" tabindex="-1" data-pathogen--data-grid-target="cell"
                  data-pathogen--data-grid-row-index="loose" data-pathogen--data-grid-column-index="loose"
                  data-pathogen--data-grid-has-interactive="false">Loose</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`);
    const cell = q('[data-pathogen--data-grid-target="cell"]');

    cell.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(cell);
  });

  it("does not enter widget mode when the descendant refuses focus", async () => {
    await start(tableGrid());
    const cell = cellAt(1, 1);
    cell.focus();
    vi.spyOn(cell.querySelector("a"), "focus").mockImplementation(() => {});
    vi.spyOn(cell.querySelector("button"), "focus").mockImplementation(() => {});

    const event = dispatchKey(cell, "Enter");

    expect(event).toBe(true);
  });

  it("ignores error events when the controller has no grid target", async () => {
    const root = await start(`
      <div data-controller="pathogen--data-grid">
        <div data-pathogen--data-grid-target="errorState"
          data-default-message="Default failure message." hidden>
          <p data-pathogen--data-grid-target="errorMessage"></p>
        </div>
      </div>`);

    root.dispatchEvent(new CustomEvent("pathogen:data-grid:error", { bubbles: true, detail: { message: "Boom" } }));

    expect(q('[data-pathogen--data-grid-target="errorState"]').hidden).toBe(false);
    expect(q('[data-pathogen--data-grid-target="errorMessage"]').textContent).toContain("Boom");
  });
});
