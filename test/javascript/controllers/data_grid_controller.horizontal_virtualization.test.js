import { Application } from "@hotwired/stimulus";
import { afterEach, describe, expect, it, vi } from "vitest";

import DataGridController from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller";

const flush = async () => Promise.resolve();

const visibleCenterColumns = (lane) =>
  Array.from(lane.querySelectorAll('[data-pathogen--data-grid-target="cell"]')).map((cell) =>
    Number(cell.getAttribute("data-pathogen--data-grid-column-index")),
  );

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

describe("data_grid_controller horizontal virtualization", () => {
  let application;

  afterEach(() => {
    application?.stop();
    document.body.innerHTML = "";
  });

  const mountGrid = async ({ columnOverscan = 0 } = {}) => {
    document.body.innerHTML = virtualLaneGridHTML(30, {
      columnWidths: [120, 160, 160, 160],
      pinnedCount: 1,
      columnOverscan,
    });

    const scrollContainer = document.querySelector('[data-pathogen--data-grid-target="scrollContainer"]');
    Object.defineProperty(scrollContainer, "clientHeight", { configurable: true, value: 200 });
    Object.defineProperty(scrollContainer, "clientWidth", { configurable: true, value: 320 });
    Object.defineProperty(scrollContainer, "scrollTop", { configurable: true, writable: true, value: 0 });
    Object.defineProperty(scrollContainer, "scrollLeft", { configurable: true, writable: true, value: 0 });

    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();

    const firstBodyRow = document.querySelector('[role="row"][aria-rowindex="2"]');
    const headerRow = document.querySelector('[role="row"][aria-rowindex="1"]');

    return {
      scrollContainer,
      headerPinnedLane: headerRow.querySelector('[data-pathogen-data-grid-lane="pinned"]'),
      headerCenterLane: headerRow.querySelector('[data-pathogen-data-grid-lane="center"]'),
      bodyPinnedLane: firstBodyRow.querySelector('[data-pathogen-data-grid-lane="pinned"]'),
      bodyCenterLane: firstBodyRow.querySelector('[data-pathogen-data-grid-lane="center"]'),
    };
  };

  it("keeps center-window slicing bounded while pinned lane cells remain mounted", async () => {
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback();
      return 1;
    });

    try {
      const { bodyPinnedLane, bodyCenterLane } = await mountGrid();

      expect(bodyPinnedLane.querySelector('[data-pathogen--data-grid-column-index="0"]')).not.toBeNull();
      expect(visibleCenterColumns(bodyCenterLane)).toEqual([1, 2]);
      expect(bodyCenterLane.querySelector('[data-pathogen--data-grid-column-index="3"]')).toBeNull();
    } finally {
      rafSpy.mockRestore();
    }
  });

  it("maintains a one-column pinned-to-center handoff while horizontal virtualization moves", async () => {
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback();
      return 1;
    });

    try {
      const { scrollContainer, bodyPinnedLane, bodyCenterLane } = await mountGrid();
      expect(visibleCenterColumns(bodyCenterLane)).toEqual([1, 2]);
      expect(bodyPinnedLane.querySelector('[data-pathogen--data-grid-column-index="0"]')).not.toBeNull();

      scrollContainer.scrollLeft = 160;
      scrollContainer.dispatchEvent(new Event("scroll"));
      await flush();

      expect(visibleCenterColumns(bodyCenterLane)).toEqual([2, 3]);
      expect(bodyPinnedLane.querySelector('[data-pathogen--data-grid-column-index="0"]')).not.toBeNull();
    } finally {
      rafSpy.mockRestore();
    }
  });

  it("keeps header/body lane alignment hooks synchronized across horizontal virtualization windows", async () => {
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback();
      return 1;
    });

    try {
      const { scrollContainer, headerCenterLane, bodyCenterLane } = await mountGrid();
      expect(visibleCenterColumns(headerCenterLane)).toEqual([1, 2]);
      expect(visibleCenterColumns(bodyCenterLane)).toEqual([1, 2]);

      scrollContainer.scrollLeft = 160;
      scrollContainer.dispatchEvent(new Event("scroll"));
      await flush();

      expect(visibleCenterColumns(headerCenterLane)).toEqual([2, 3]);
      expect(visibleCenterColumns(bodyCenterLane)).toEqual([2, 3]);

      const renderedCenterCells = [
        ...headerCenterLane.querySelectorAll('[data-pathogen--data-grid-target="cell"]'),
        ...bodyCenterLane.querySelectorAll('[data-pathogen--data-grid-target="cell"]'),
      ];

      renderedCenterCells.forEach((cell) => {
        expect(cell.getAttribute("data-pathogen-data-grid-virtual-col-index")).toBe(
          cell.getAttribute("data-pathogen--data-grid-column-index"),
        );
      });
    } finally {
      rafSpy.mockRestore();
    }
  });
});
