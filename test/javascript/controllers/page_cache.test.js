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
import { paginationContract } from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller/pagination_mode";

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
      pageSize: 20,
      rowOffset: 40,
    });
  });
});
