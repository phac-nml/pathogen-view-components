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
