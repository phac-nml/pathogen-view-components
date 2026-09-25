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
        class="pvc-data-grid__cell pvc-data-grid__cell--sticky"
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
        class="pvc-data-grid__cell"
        data-pathogen--data-grid-target="cell"
        data-pathogen--data-grid-row-index="0"
        data-pathogen--data-grid-column-index="${columnIndex}"
        data-pvc-data-grid-virtual-col-index="${columnIndex}"
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
            class="pvc-data-grid__cell pvc-data-grid__cell--sticky"
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
            class="pvc-data-grid__cell"
            tabindex="-1"
            data-pathogen--data-grid-target="cell"
            data-pathogen--data-grid-row-index="${rowIndex}"
            data-pathogen--data-grid-column-index="${columnIndex}"
            data-pvc-data-grid-virtual-col-index="${columnIndex}"
            data-pathogen--data-grid-has-interactive="false">
            R${rowIndex}-C${columnIndex}
          </div>`;
      })
      .join("\n");

    return `
        <div role="row" aria-rowindex="${rowIndex + 1}" style="grid-template-columns: ${fullTemplate}; height: 40px;">
          <div class="pvc-data-grid__lane pvc-data-grid__lane--pinned"
               data-pvc-data-grid-lane="pinned"
               role="presentation"
               style="grid-template-columns: ${pinnedTemplate};">
            ${pinnedCells}
          </div>
          <div class="pvc-data-grid__lane pvc-data-grid__lane--center"
               data-pvc-data-grid-lane="center"
               role="presentation"
               style="grid-template-columns: ${centerTemplate};">
            ${centerCells}
          </div>
        </div>`;
  });

  return `
      <div data-controller="pathogen--data-grid" class="pvc-data-grid pvc-data-grid--virtual">
        <div data-pathogen--data-grid-target="scrollContainer"
             class="pvc-data-grid__scroll"
             style="height: ${viewportHeight}px; overflow: auto;">
          <div role="grid" data-pathogen--data-grid-target="grid"
               aria-rowcount="${rowCount + 1}" aria-colcount="${columnWidths.length}"
               data-pvc-data-grid-row-height="40"
               data-pvc-data-grid-row-overscan="10"
               data-pvc-data-grid-column-overscan="${columnOverscan}"
               data-pvc-data-grid-pinned-count="${pinnedCount}"
               data-pvc-data-grid-column-widths="${columnWidths.join(",")}">
            <div class="pvc-data-grid__virtual-status"
                 data-pathogen--data-grid-target="virtualStatus"
                 data-loading-text="Loading rows…"
                 data-loaded-text="Rows loaded."
                 role="status"
                 aria-live="polite">
              Loading rows…
            </div>
            <div role="row" class="pvc-data-grid__row pvc-data-grid__row--header"
                 aria-rowindex="1" style="grid-template-columns: ${fullTemplate};">
              <div class="pvc-data-grid__lane pvc-data-grid__lane--pinned"
                   data-pvc-data-grid-lane="pinned"
                   role="presentation"
                   style="grid-template-columns: ${pinnedTemplate};">
                ${headerPinnedCells}
              </div>
              <div class="pvc-data-grid__lane pvc-data-grid__lane--center"
                   data-pvc-data-grid-lane="center"
                   role="presentation"
                   style="grid-template-columns: ${centerTemplate};">
                ${headerCenterCells}
              </div>
            </div>
            <div class="pvc-data-grid__viewport" data-pathogen--data-grid-target="viewport">
              <div class="pvc-data-grid__spacer"></div>
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const mountGrid = async ({ columnOverscan = 0, horizontalSticky = true } = {}) => {
    document.body.innerHTML = virtualLaneGridHTML(30, {
      columnWidths: [120, 160, 160, 160],
      pinnedCount: 1,
      columnOverscan,
    });

    const scrollContainer = document.querySelector('[data-pathogen--data-grid-target="scrollContainer"]');
    scrollContainer.style.setProperty("--pvc-data-grid-horizontal-sticky", horizontalSticky ? "1" : "0");
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
      headerPinnedLane: headerRow.querySelector('[data-pvc-data-grid-lane="pinned"]'),
      headerCenterLane: headerRow.querySelector('[data-pvc-data-grid-lane="center"]'),
      bodyPinnedLane: firstBodyRow.querySelector('[data-pvc-data-grid-lane="pinned"]'),
      bodyCenterLane: firstBodyRow.querySelector('[data-pvc-data-grid-lane="center"]'),
    };
  };

  it("uses the full viewport for unpinned columns and scrolls back to a formerly pinned cell", async () => {
    const { scrollContainer, bodyPinnedLane, bodyCenterLane, headerCenterLane } = await mountGrid({
      horizontalSticky: false,
    });
    const firstCell = bodyPinnedLane.querySelector('[role="gridcell"]');
    firstCell.focus();
    firstCell.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "End" }));
    expect(document.activeElement.textContent.trim()).toBe("R1-C3");
    expect(scrollContainer.scrollLeft).toBe(280);
    expect(visibleCenterColumns(bodyCenterLane)).toEqual([2, 3]);

    document.activeElement.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Home" }),
    );
    expect(document.activeElement).toBe(firstCell);
    expect(scrollContainer.scrollLeft).toBe(0);
    expect(visibleCenterColumns(bodyCenterLane)).toEqual([1, 2]);
    expect(visibleCenterColumns(headerCenterLane)).toEqual([1, 2]);
    expect(bodyCenterLane.firstElementChild.style.gridColumn).toBe("1");
  });

  it("updates horizontal geometry on container resize and disconnects its observer before a Turbo snapshot", async () => {
    vi.useFakeTimers();
    let resized;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback) {
          resized = callback;
        }
        observe = observe;
        disconnect = disconnect;
      },
    );
    const { scrollContainer, bodyPinnedLane, bodyCenterLane, headerCenterLane } = await mountGrid();
    expect(observe).toHaveBeenCalledWith(scrollContainer);
    scrollContainer.scrollLeft = 160;
    scrollContainer.dispatchEvent(new Event("scroll"));
    await vi.advanceTimersByTimeAsync(20);
    expect(visibleCenterColumns(bodyCenterLane)).toEqual([2, 3]);

    scrollContainer.style.setProperty("--pvc-data-grid-horizontal-sticky", "0");
    resized();
    await vi.advanceTimersByTimeAsync(160);
    expect(visibleCenterColumns(bodyCenterLane)).toEqual([1, 2, 3]);
    expect(visibleCenterColumns(headerCenterLane)).toEqual([1, 2, 3]);
    expect(Array.from(bodyCenterLane.children).map((cell) => cell.style.gridColumn)).toEqual(["1", "2", "3"]);
    expect(bodyPinnedLane.children).toHaveLength(1);

    scrollContainer.style.setProperty("--pvc-data-grid-horizontal-sticky", "1");
    resized();
    await vi.advanceTimersByTimeAsync(160);
    expect(visibleCenterColumns(bodyCenterLane)).toEqual([2, 3]);
    expect(visibleCenterColumns(headerCenterLane)).toEqual([2, 3]);

    resized();
    document.dispatchEvent(new Event("turbo:before-cache"));
    expect(disconnect).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(160);
    expect(document.querySelectorAll('[role="row"]')).toHaveLength(31);
    expect(visibleCenterColumns(bodyCenterLane)).toEqual([1, 2, 3]);
  });

  it("restores all rows and columns after disconnect and reconnect", async () => {
    await mountGrid();
    const root = document.querySelector('[data-controller="pathogen--data-grid"]');
    root.remove();
    await flush();
    document.body.append(root);
    await flush();

    expect(root.querySelector(".pvc-data-grid__spacer").style.height).toBe("1200px");
    const firstCell = root.querySelector('[role="gridcell"]');
    firstCell.focus();
    firstCell.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "End", ctrlKey: true }),
    );
    expect(document.activeElement.textContent.trim()).toBe("R30-C3");
  });

  it("stops pending renders before Turbo takes a complete snapshot", async () => {
    vi.useFakeTimers();
    const { scrollContainer } = await mountGrid();
    scrollContainer.scrollTop = 800;
    scrollContainer.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("resize"));
    document.dispatchEvent(new Event("turbo:before-cache"));
    await vi.advanceTimersByTimeAsync(180);
    const snapshot = document.querySelector('[data-controller="pathogen--data-grid"]').cloneNode(true);
    const rows = snapshot.querySelectorAll('[role="row"]');
    expect(rows).toHaveLength(31);
    rows.forEach((row) => expect(row.querySelectorAll('[data-pathogen--data-grid-target="cell"]')).toHaveLength(4));
    expect(snapshot.hasAttribute("data-virtual-ready")).toBe(false);
    vi.useRealTimers();
  });

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
        expect(cell.getAttribute("data-pvc-data-grid-virtual-col-index")).toBe(
          cell.getAttribute("data-pathogen--data-grid-column-index"),
        );
      });
    } finally {
      rafSpy.mockRestore();
    }
  });

  it("preserves absolute center track placement while slicing center columns", async () => {
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback();
      return 1;
    });

    try {
      const { scrollContainer, headerCenterLane, bodyCenterLane } = await mountGrid();

      scrollContainer.scrollLeft = 160;
      scrollContainer.dispatchEvent(new Event("scroll"));
      await flush();

      const headerColumns = Array.from(headerCenterLane.querySelectorAll('[data-pathogen--data-grid-target="cell"]'));
      const bodyColumns = Array.from(bodyCenterLane.querySelectorAll('[data-pathogen--data-grid-target="cell"]'));

      expect(headerColumns.map((cell) => cell.style.gridColumn)).toEqual(["2", "3"]);
      expect(bodyColumns.map((cell) => cell.style.gridColumn)).toEqual(["2", "3"]);
    } finally {
      rafSpy.mockRestore();
    }
  });
});
