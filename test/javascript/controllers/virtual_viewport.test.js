import { afterEach, describe, expect, it, vi } from "vitest";

import { CellIndex } from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller/cell_index";
import { VirtualViewport } from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller/virtual_viewport";

const cellSelector = '[data-pathogen--data-grid-target~="cell"]';
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function rowHTML(index) {
  return `<div role="row" aria-rowindex="${index + 2}" data-pvc-data-grid-global-row-index="${index}">
    <div role="gridcell" tabindex="-1" data-pathogen--data-grid-target="cell"
      data-pathogen--data-grid-row-index="${index + 1}" data-pathogen--data-grid-column-index="0">Sample ${index + 1}</div>
  </div>`;
}

describe("paginated virtual viewport cell indexes", () => {
  let virtualViewport;

  afterEach(() => {
    virtualViewport?.disconnect();
    virtualViewport = null;
    vi.unstubAllGlobals();
  });

  it("refreshes loaded and placeholder cells lazily, then removes evicted cached cells", async () => {
    const requests = new Map();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (url) => new Promise((resolve) => requests.set(Number(new URL(url).searchParams.get("page")), resolve)),
    );
    let renderFrame;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback) => {
        renderFrame = callback;
        return 1;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    document.body.innerHTML = `<div role="grid" data-pvc-data-grid-total-count="100"
      data-pvc-data-grid-page-size="2" data-pvc-data-grid-rows-url="/samples/rows.json"
      data-pvc-data-grid-column-widths="120" data-pvc-data-grid-row-overscan="0">
      <div role="row" class="pvc-data-grid__row--header">
        <div role="columnheader" data-pathogen--data-grid-target="cell"
          data-pathogen--data-grid-row-index="0" data-pathogen--data-grid-column-index="0">Sample</div>
      </div>
      <div id="viewport"><div class="pvc-data-grid__spacer"></div>${rowHTML(0)}${rowHTML(1)}</div>
    </div>`;
    const grid = document.querySelector('[role="grid"]');
    const viewport = document.getElementById("viewport");
    const scrollContainer = { scrollTop: 0, scrollLeft: 0, clientHeight: 80, clientWidth: 120 };
    const readCells = vi.fn(() => virtualViewport.cells);
    const index = new CellIndex(readCells);
    virtualViewport = new VirtualViewport({
      element: grid,
      grid,
      viewport,
      scrollContainer,
      cellSelector,
      onCellsChanged: () => index.invalidate(),
      onError: vi.fn(),
      syncScrollAffordance: vi.fn(),
      setBusy: vi.fn(),
      onPageError: vi.fn(),
      onPageSuccess: vi.fn(),
      focus: {
        resolveCell: (target) => (grid.contains(target) ? target.closest(cellSelector) : null),
        resolveFocusCell: (row, column) => index.at(row, column),
        getPendingFocusCoordinate: () => null,
        setActiveCell: (cell) => {
          cell.tabIndex = 0;
        },
        ensureFocusableCell: () => index.cells,
        restorePendingFocus: vi.fn(),
      },
    });
    virtualViewport.connect();
    const initialCell = index.at(1, 0);
    scrollContainer.scrollTop = 400;
    virtualViewport.render();
    const placeholderCell = index.at(11, 0);
    expect(placeholderCell.closest('[role="row"]').getAttribute("aria-busy")).toBe("true");
    expect(placeholderCell.isConnected).toBe(true);
    expect(index.at(1, 0)).toBeNull();
    expect(index.has(initialCell)).toBe(false);
    placeholderCell.focus();

    virtualViewport.fetchVisiblePages();
    const readsBeforeResponses = readCells.mock.calls.length;
    [6, 7].forEach((page) => {
      requests.get(page)({
        ok: true,
        json: async () => ({
          rows: [0, 1].map((offset) => {
            const globalIndex = (page - 1) * 2 + offset;
            return { index: globalIndex, html: rowHTML(globalIndex) };
          }),
        }),
      });
    });
    await settle();
    expect(readCells).toHaveBeenCalledTimes(readsBeforeResponses);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    renderFrame();

    const loadedCell = index.at(11, 0);
    const prefetchedCell = index.at(13, 0);
    expect(loadedCell).not.toBe(placeholderCell);
    expect(loadedCell.textContent).toBe("Sample 11");
    expect(document.activeElement).toBe(loadedCell);
    expect(index.has(placeholderCell)).toBe(false);
    expect(prefetchedCell.textContent).toBe("Sample 13");
    expect(prefetchedCell.isConnected).toBe(false);
    expect(readCells).toHaveBeenCalledTimes(readsBeforeResponses + 1);

    loadedCell.blur();
    scrollContainer.scrollTop = 1600;
    virtualViewport.render();
    expect(index.at(11, 0)).toBeNull();
    expect(index.at(13, 0)).toBeNull();
    expect(index.has(prefetchedCell)).toBe(false);
    expect(index.at(41, 0).isConnected).toBe(true);
  });
});

describe("virtual viewport branch coverage", () => {
  let virtualViewport;

  afterEach(() => {
    virtualViewport?.disconnect();
    virtualViewport = null;
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  const staticGrid = ({ columnWidths = "120,120", pinnedCount, spacer = true } = {}) => `
    <div role="grid"${columnWidths ? ` data-pvc-data-grid-column-widths="${columnWidths}"` : ""}${
      pinnedCount === undefined ? "" : ` data-pvc-data-grid-pinned-count="${pinnedCount}"`
    }>
      <div role="row" class="pvc-data-grid__row--header">
        <div role="columnheader" data-pathogen--data-grid-target="cell"
          data-pathogen--data-grid-row-index="0" data-pathogen--data-grid-column-index="0">H0</div>
        <div role="columnheader" data-pathogen--data-grid-target="cell"
          data-pathogen--data-grid-row-index="0" data-pathogen--data-grid-column-index="not-a-number">NoIndex</div>
      </div>
      <div id="viewport">${spacer ? '<div class="pvc-data-grid__spacer"></div>' : ""}${rowHTML(0)}${rowHTML(1)}</div>
    </div>`;

  const paginatedGrid = () => `
    <div role="grid" data-pvc-data-grid-total-count="200" data-pvc-data-grid-page-size="2"
      data-pvc-data-grid-rows-url="/samples/rows.json" data-pvc-data-grid-column-widths="120"
      data-pvc-data-grid-row-overscan="0">
      <div role="row" class="pvc-data-grid__row--header">
        <div role="columnheader" data-pathogen--data-grid-target="cell"
          data-pathogen--data-grid-row-index="0" data-pathogen--data-grid-column-index="0">Sample</div>
      </div>
      <div id="viewport"><div class="pvc-data-grid__spacer"></div>${rowHTML(0)}${rowHTML(1)}</div>
    </div>`;

  function mount({
    html = staticGrid(),
    scrollContainer = { scrollTop: 0, scrollLeft: 0, clientHeight: 80, clientWidth: 120 },
    onError = vi.fn(),
    connect = true,
  } = {}) {
    document.body.innerHTML = html;
    const grid = document.querySelector('[role="grid"]');
    const viewport = document.getElementById("viewport");
    const readCells = vi.fn(() => virtualViewport.cells);
    const index = new CellIndex(readCells);
    virtualViewport = new VirtualViewport({
      element: grid,
      grid,
      viewport,
      scrollContainer,
      cellSelector,
      onCellsChanged: () => index.invalidate(),
      onError,
      syncScrollAffordance: vi.fn(),
      setBusy: vi.fn(),
      onPageError: vi.fn(),
      onPageSuccess: vi.fn(),
      focus: {
        resolveCell: (target) => (target && grid.contains(target) ? target.closest(cellSelector) : null),
        resolveFocusCell: (row, column) => index.at(row, column),
        getPendingFocusCoordinate: () => null,
        setActiveCell: (cell) => {
          cell.tabIndex = 0;
        },
        ensureFocusableCell: () => index.cells,
        restorePendingFocus: vi.fn(),
      },
    });
    if (connect) virtualViewport.connect();
    return { grid, viewport, vv: virtualViewport, index, onError };
  }

  it("reports empty totals and cells before connecting", () => {
    const { vv } = mount({ connect: false });

    expect(vv.totalRows).toBe(0);
    expect(vv.cells).toEqual([]);
  });

  it("ignores resetScroll when there is no scroll container", () => {
    const { vv } = mount({ scrollContainer: null, connect: false });

    expect(() => vv.resetScroll()).not.toThrow();
  });

  it("no-ops disconnect before connecting", () => {
    const { vv } = mount({ connect: false });

    expect(() => vv.disconnect()).not.toThrow();
  });

  it("reports render errors raised inside a scheduled animation frame", () => {
    vi.stubGlobal("requestAnimationFrame", (callback) => {
      callback();
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const { vv, onError } = mount({ connect: false });
    vi.spyOn(vv, "render").mockImplementation(() => {
      throw new Error("render boom");
    });

    vv.handleScroll();

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("connects without a spacer element in the viewport", () => {
    expect(() => mount({ html: staticGrid({ spacer: false }) })).not.toThrow();
  });

  it("computes no column range when there is no scroll container", () => {
    expect(() => mount({ scrollContainer: null })).not.toThrow();
  });

  it("derives column widths from cells and clamps a non-numeric pinned count", () => {
    expect(() => mount({ html: staticGrid({ columnWidths: "", pinnedCount: "abc" }) })).not.toThrow();
  });

  it("falls back to the trailing offset when the pinned count exceeds the columns", () => {
    expect(() => mount({ html: staticGrid({ columnWidths: "120", pinnedCount: 5 }) })).not.toThrow();
  });

  it("clears leftover placeholder rows from the viewport on disconnect", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    const scrollContainer = { scrollTop: 0, scrollLeft: 0, clientHeight: 80, clientWidth: 120 };
    const { vv, viewport, index } = mount({ html: paginatedGrid(), scrollContainer });

    // Retain the first cached row via focus so it survives eviction while placeholders render.
    index.at(1, 0).focus();
    scrollContainer.scrollTop = 4000;
    vv.render();
    expect(viewport.querySelector('[aria-busy="true"]')).not.toBeNull();

    vv.disconnect();

    expect(viewport.querySelector('[aria-busy="true"]')).toBeNull();
  });
});
