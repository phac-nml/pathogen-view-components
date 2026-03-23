import { Application } from "@hotwired/stimulus";
import { afterEach, describe, expect, it, vi } from "vitest";

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

describe("data_grid_controller focus restore", () => {
  let application;

  afterEach(() => {
    application?.stop();
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  const mountGrid = async ({ viewportHeight = 200 } = {}) => {
    document.body.innerHTML = virtualLaneGridHTML(40, {
      viewportHeight,
      columnWidths: [120, 160, 160, 160],
      pinnedCount: 1,
      columnOverscan: 0,
    });

    const scrollContainer = document.querySelector('[data-pathogen--data-grid-target="scrollContainer"]');
    Object.defineProperty(scrollContainer, "clientHeight", { configurable: true, value: viewportHeight });
    Object.defineProperty(scrollContainer, "clientWidth", { configurable: true, value: 320 });
    Object.defineProperty(scrollContainer, "scrollTop", { configurable: true, writable: true, value: 0 });
    Object.defineProperty(scrollContainer, "scrollLeft", { configurable: true, writable: true, value: 0 });

    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();

    return { scrollContainer };
  };

  it("restores focus across virtual rerender cascades and requires Enter/F2 to re-enter widgets", async () => {
    vi.useFakeTimers();
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback();
      return 1;
    });

    try {
      const { scrollContainer } = await mountGrid();
      const interactiveCell = document.querySelector(
        '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="2"]',
      );
      const link = interactiveCell.querySelector("a");

      interactiveCell.focus();
      dispatchKey(interactiveCell, "Enter");
      expect(document.activeElement).toBe(link);
      expect(link.tabIndex).toBe(0);

      scrollContainer.scrollLeft = 160;
      scrollContainer.dispatchEvent(new Event("scroll"));
      await flush();

      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(120);
      await flush();

      expect(document.activeElement).toBe(interactiveCell);
      expect(link.tabIndex).toBe(-1);

      dispatchKey(interactiveCell, "F2");
      expect(document.activeElement).toBe(link);
      expect(link.tabIndex).toBe(0);
    } finally {
      rafSpy.mockRestore();
    }
  });

  it("keeps PageDown/PageUp column preservation through virtual rerenders", async () => {
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback();
      return 1;
    });

    try {
      await mountGrid();
      const firstRowColumnTwo = document.querySelector(
        '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="2"]',
      );
      firstRowColumnTwo.focus();

      dispatchKey(firstRowColumnTwo, "PageDown");
      expect(document.activeElement.getAttribute("data-pathogen--data-grid-row-index")).toBe("6");
      expect(document.activeElement.getAttribute("data-pathogen--data-grid-column-index")).toBe("2");

      dispatchKey(document.activeElement, "PageUp");
      expect(document.activeElement.getAttribute("data-pathogen--data-grid-row-index")).toBe("1");
      expect(document.activeElement.getAttribute("data-pathogen--data-grid-column-index")).toBe("2");
    } finally {
      rafSpy.mockRestore();
    }
  });

  it("keeps row targeting stable while Home/End navigation anchors columns after PageDown", async () => {
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback();
      return 1;
    });

    try {
      await mountGrid();
      const firstRowColumnTwo = document.querySelector(
        '[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="2"]',
      );
      firstRowColumnTwo.focus();

      dispatchKey(firstRowColumnTwo, "PageDown");
      const pagedCell = document.activeElement;
      expect(pagedCell.getAttribute("data-pathogen--data-grid-row-index")).toBe("6");
      expect(pagedCell.getAttribute("data-pathogen--data-grid-column-index")).toBe("2");

      dispatchKey(pagedCell, "End");
      expect(document.activeElement.getAttribute("data-pathogen--data-grid-row-index")).toBe("6");
      expect(document.activeElement.getAttribute("data-pathogen--data-grid-column-index")).toBe("3");

      dispatchKey(document.activeElement, "Home");
      expect(document.activeElement.getAttribute("data-pathogen--data-grid-row-index")).toBe("6");
      expect(document.activeElement.getAttribute("data-pathogen--data-grid-column-index")).toBe("0");
    } finally {
      rafSpy.mockRestore();
    }
  });
});
