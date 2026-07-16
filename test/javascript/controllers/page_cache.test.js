import { describe, expect, it } from "vitest";

import {
  PageCache,
  maxPageForCount,
  pagesForRowRange,
  pagesForRowRangeWithPrefetch,
} from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller/page_cache";
import {
  PaginatedRowSource,
  parseRows,
} from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller/page_source";
import {
  paginationContract,
  cachedVirtualCells,
} from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller/pagination_mode";
import { CenterColumnWindow } from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller/virtual_columns";

const CELL_SELECTOR = '[data-pathogen--data-grid-target~="cell"]';

const laneRowHTML = (rowIndex) => `
  <div role="row" aria-rowindex="${rowIndex + 1}">
    <div data-pvc-data-grid-lane="pinned">
      <div role="gridcell" data-pathogen--data-grid-target="cell"
        data-pathogen--data-grid-row-index="${rowIndex}"
        data-pathogen--data-grid-column-index="0">P0</div>
    </div>
    <div data-pvc-data-grid-lane="center">
      <div role="gridcell" data-pathogen--data-grid-target="cell"
        data-pathogen--data-grid-row-index="${rowIndex}"
        data-pathogen--data-grid-column-index="1">C1</div>
      <div role="gridcell" data-pathogen--data-grid-target="cell"
        data-pathogen--data-grid-row-index="${rowIndex}"
        data-pathogen--data-grid-column-index="2">C2</div>
      <div role="gridcell" data-pathogen--data-grid-target="cell"
        data-pathogen--data-grid-row-index="${rowIndex}"
        data-pathogen--data-grid-column-index="3">C3</div>
    </div>
  </div>`;

describe("page_cache", () => {
  it("maps row ranges to page numbers", () => {
    expect(pagesForRowRange(0, 1, 20)).toEqual([1]);
    expect(pagesForRowRange(20, 41, 20)).toEqual([2, 3]);
  });

  it("prefetches neighboring pages around the visible range", () => {
    expect(pagesForRowRangeWithPrefetch(40, 61, 20, 2)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("does not prefetch pages beyond the dataset", () => {
    expect(maxPageForCount(5000, 50)).toBe(100);
    expect(pagesForRowRangeWithPrefetch(4950, 5000, 50, 2, 5000)).toEqual([98, 99, 100]);
  });

  it("does not request pages beyond the dataset", () => {
    const cache = new PageCache();
    expect(cache.hasAllRowsForPage(101, 50, 5000)).toBeNull();
    expect(cache.needsPage(101, 50, 5000)).toBe(false);
  });

  it("parses row HTML payloads by global index", () => {
    const rows = parseRows({
      rows: [
        {
          index: 20,
          html: '<div role="row" data-pvc-data-grid-global-row-index="20"><div role="gridcell">Alpha</div></div>',
        },
      ],
    });

    expect(rows.size).toBe(1);
    expect(rows.get(20)?.getAttribute("role")).toBe("row");
  });

  it("dedupes in-flight page fetches", async () => {
    let fetchCount = 0;
    const source = new PaginatedRowSource({
      url: "/demo/samples/rows.json",
      pageSize: 20,
      totalRows: 100,
      fetchFn: async () => {
        fetchCount += 1;
        return {
          ok: true,
          async json() {
            return { rows: [] };
          },
        };
      },
    });

    const [first, second] = await Promise.all([source.fetchPage(2), source.fetchPage(2)]);

    expect(fetchCount).toBe(1);
    expect(first.aborted).toBe(false);
    expect(second.aborted).toBe(false);
  });

  it("appends additional search params to page requests", async () => {
    let requestedUrl = null;
    const source = new PaginatedRowSource({
      url: "/demo/samples/rows.json",
      pageSize: 20,
      totalRows: 100,
      searchParams: { sort: "name", direction: "asc", q: "salmonella" },
      origin: "https://example.test",
      fetchFn: async (url) => {
        requestedUrl = new URL(url);
        return {
          ok: true,
          async json() {
            return { rows: [] };
          },
        };
      },
    });

    await source.fetchPage(3);

    expect(requestedUrl.searchParams.get("page")).toBe("3");
    expect(requestedUrl.searchParams.get("limit")).toBe("20");
    expect(requestedUrl.searchParams.get("sort")).toBe("name");
    expect(requestedUrl.searchParams.get("direction")).toBe("asc");
    expect(requestedUrl.searchParams.get("q")).toBe("salmonella");
  });

  it("overrides conflicting page and limit search params", async () => {
    let requestedUrl = null;
    const source = new PaginatedRowSource({
      url: "/demo/samples/rows.json",
      pageSize: 20,
      totalRows: 100,
      searchParams: { page: "99", limit: "5", sort: "id" },
      origin: "https://example.test",
      fetchFn: async (url) => {
        requestedUrl = new URL(url);
        return {
          ok: true,
          async json() {
            return { rows: [] };
          },
        };
      },
    });

    await source.fetchPage(2);

    expect(requestedUrl.searchParams.get("page")).toBe("2");
    expect(requestedUrl.searchParams.get("limit")).toBe("20");
    expect(requestedUrl.searchParams.get("sort")).toBe("id");
  });

  it("preserves repeated search params in page requests", async () => {
    let requestedUrl = null;
    const source = new PaginatedRowSource({
      url: "/demo/samples/rows.json",
      pageSize: 20,
      totalRows: 100,
      searchParams: new URLSearchParams([
        ["status", "open"],
        ["status", "closed"],
      ]),
      origin: "https://example.test",
      fetchFn: async (url) => {
        requestedUrl = new URL(url);
        return {
          ok: true,
          async json() {
            return { rows: [] };
          },
        };
      },
    });

    await source.fetchPage(2);

    expect(requestedUrl.searchParams.getAll("status")).toEqual(["open", "closed"]);
  });

  it("does not refetch a page while rows remain cached after partial eviction", () => {
    const cache = new PageCache();
    const pageSize = 50;

    for (let index = 1400; index < 1450; index += 1) {
      const row = document.createElement("div");
      row.dataset.pvcDataGridGlobalRowIndex = String(index);
      cache.storeRows(new Map([[index, row]]));
    }

    expect(cache.hasAllRowsForPage(29, pageSize, 5000)).toBe(true);
    cache.evictOutsideRange(1420, 1440, 10, 5000);
    expect(cache.hasAllRowsForPage(29, pageSize, 5000)).toBe(false);
    expect(cache.needsPage(29, pageSize, 5000)).toBe(true);
  });

  it("retains prefetched pages through eviction so scrolling does not re-request them", () => {
    const cache = new PageCache();
    const pageSize = 20;
    const totalRows = 1000;
    const source = new PaginatedRowSource({
      url: "/demo/samples/rows.json",
      pageSize,
      totalRows,
      prefetchPages: 2,
      cache,
    });

    // Seed the visible range plus its 2-page prefetch window on each side, mirroring
    // what a scroll-settled fetch loads for a visible range of rows [200, 220).
    for (let index = 160; index < 260; index += 1) {
      const row = document.createElement("div");
      row.dataset.pvcDataGridGlobalRowIndex = String(index);
      cache.storeRows(new Map([[index, row]]));
    }

    expect(source.missingPagesForRange(200, 220)).toEqual([]);

    // Evicting with a small overscan buffer must not drop the prefetched pages.
    source.evictOutsideRange(200, 220, 20);

    // Horizontal scrolling re-runs the same visible-range fetch; nothing is missing.
    expect(source.missingPagesForRange(200, 220)).toEqual([]);
  });

  it("returns cached rows in global row order", () => {
    const cache = new PageCache();

    [40, 0, 20].forEach((globalIndex) => {
      const row = document.createElement("div");
      row.dataset.pvcDataGridGlobalRowIndex = String(globalIndex);
      cache.storeRows(new Map([[globalIndex, row]]));
    });

    expect(cache.getCachedRows().map((row) => row.dataset.pvcDataGridGlobalRowIndex)).toEqual(["0", "20", "40"]);
  });

  it("preserves the initial row offset in the pagination contract", () => {
    const grid = document.createElement("div");
    grid.dataset.pvcDataGridTotalCount = "5000";
    grid.dataset.pvcDataGridRowsUrl = "/rows.json";
    grid.dataset.pvcDataGridPageSize = "20";
    grid.dataset.pvcDataGridRowOffset = "40";

    expect(paginationContract(grid, 20)).toEqual({
      totalRows: 5000,
      rowsUrl: "/rows.json",
      searchParams: null,
      pageSize: 20,
      rowOffset: 40,
    });
  });
});

describe("cachedVirtualCells", () => {
  it("includes detached center-lane cells after column window slicing", () => {
    document.body.innerHTML = `
      <div role="grid">
        <div role="row" class="pvc-data-grid__row--header" aria-rowindex="1">
          <div data-pvc-data-grid-lane="pinned">
            <div role="columnheader" data-pathogen--data-grid-target="cell"
              data-pathogen--data-grid-row-index="0"
              data-pathogen--data-grid-column-index="0">H0</div>
          </div>
          <div data-pvc-data-grid-lane="center">
            <div role="columnheader" data-pathogen--data-grid-target="cell"
              data-pathogen--data-grid-row-index="0"
              data-pathogen--data-grid-column-index="1">H1</div>
            <div role="columnheader" data-pathogen--data-grid-target="cell"
              data-pathogen--data-grid-row-index="0"
              data-pathogen--data-grid-column-index="2">H2</div>
            <div role="columnheader" data-pathogen--data-grid-target="cell"
              data-pathogen--data-grid-row-index="0"
              data-pathogen--data-grid-column-index="3">H3</div>
          </div>
        </div>
      </div>`;

    const grid = document.querySelector('[role="grid"]');
    const headerRow = grid.querySelector('[role="row"]');
    const bodyRow = document.createElement("div");
    bodyRow.innerHTML = laneRowHTML(1);
    const row = bodyRow.firstElementChild;

    const centerColumnWindow = new CenterColumnWindow({
      pinnedCount: () => 1,
      cellSelector: CELL_SELECTOR,
    });
    centerColumnWindow.apply(headerRow, { startIndex: 1, endIndex: 3 });
    centerColumnWindow.apply(row, { startIndex: 1, endIndex: 3 });

    expect(row.querySelectorAll(CELL_SELECTOR)).toHaveLength(3);

    const cells = cachedVirtualCells({
      grid,
      rows: [row],
      cellSelector: CELL_SELECTOR,
      allCellsForRow: (laneRow) => centerColumnWindow.allCellsForRow(laneRow),
    });

    const bodyColumnIndexes = cells
      .filter((cell) => cell.getAttribute("data-pathogen--data-grid-row-index") === "1")
      .map((cell) => Number(cell.getAttribute("data-pathogen--data-grid-column-index")));

    expect(bodyColumnIndexes).toEqual([0, 1, 2, 3]);
    document.body.innerHTML = "";
  });
});
