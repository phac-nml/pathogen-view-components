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
