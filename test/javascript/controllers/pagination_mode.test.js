import { describe, expect, it, vi } from "vitest";

import {
  cachedVirtualCells,
  paginationContract,
  setPaginationBusy,
} from "pathogen_view_components/data_grid_controller/pagination_mode";

const CELL_SELECTOR = '[data-pathogen--data-grid-target~="cell"]';

function buildCell({ label, rowIndex, columnIndex }) {
  const cell = document.createElement("div");
  cell.textContent = label;
  cell.setAttribute("data-pathogen--data-grid-target", "cell");
  if (rowIndex !== undefined) {
    cell.setAttribute("data-pathogen--data-grid-row-index", String(rowIndex));
  }
  if (columnIndex !== undefined) {
    cell.setAttribute("data-pathogen--data-grid-column-index", String(columnIndex));
  }
  return cell;
}

describe("data_grid_controller/pagination_mode", () => {
  describe("paginationContract", () => {
    it("parses valid pagination values from dataset", () => {
      const grid = document.createElement("div");
      grid.dataset.pvcDataGridTotalCount = "42";
      grid.dataset.pvcDataGridRowsUrl = "/rows";
      grid.dataset.pvcDataGridSearchParams = "state=active";
      grid.dataset.pvcDataGridPageSize = "25";
      grid.dataset.pvcDataGridRowOffset = "10";

      expect(paginationContract(grid, 100)).toEqual({
        mode: "offset",
        nextCursor: null,
        knownTotal: 42,
        totalRows: 42,
        rowsUrl: "/rows",
        searchParams: "state=active",
        rowOffset: 10,
        pageSize: 25,
      });
    });

    it("falls back to safe defaults for invalid or missing values", () => {
      const grid = document.createElement("div");
      grid.dataset.pvcDataGridTotalCount = "not-a-number";
      grid.dataset.pvcDataGridRowsUrl = "";
      grid.dataset.pvcDataGridSearchParams = "";
      grid.dataset.pvcDataGridPageSize = "0";
      grid.dataset.pvcDataGridRowOffset = "-1";

      expect(paginationContract(grid, 75)).toEqual({
        mode: "offset",
        nextCursor: null,
        knownTotal: null,
        totalRows: 0,
        rowsUrl: null,
        searchParams: null,
        rowOffset: 0,
        pageSize: 75,
      });
    });

    it("handles absent numeric dataset fields", () => {
      const grid = document.createElement("div");

      expect(paginationContract(grid, 50)).toEqual({
        mode: "offset",
        nextCursor: null,
        knownTotal: null,
        totalRows: 0,
        rowsUrl: null,
        searchParams: null,
        rowOffset: 0,
        pageSize: 50,
      });
    });

    it("distinguishes a known empty cursor total from an unknown or invalid total", () => {
      const grid = document.createElement("div");
      grid.dataset.pvcDataGridPaginationMode = "cursor";
      expect(paginationContract(grid, 20).knownTotal).toBeNull();
      grid.dataset.pvcDataGridTotalCount = "0";
      expect(paginationContract(grid, 20).knownTotal).toBe(0);
      grid.dataset.pvcDataGridTotalCount = "-1";
      expect(paginationContract(grid, 20).knownTotal).toBeNull();
    });
  });

  describe("setPaginationBusy", () => {
    it("returns early when grid is missing", () => {
      expect(() =>
        setPaginationBusy(
          {
            grid: null,
            status: null,
            loadingMoreText: "Loading…",
            loadedText: "Loaded",
          },
          true,
        ),
      ).not.toThrow();
    });

    it("sets busy state and status text while loading", () => {
      const grid = document.createElement("div");
      const status = document.createElement("p");
      status.hidden = true;

      setPaginationBusy(
        {
          grid,
          status,
          loadingMoreText: "Loading more rows",
          loadedText: "Loaded rows",
        },
        true,
      );

      expect(grid.getAttribute("aria-busy")).toBe("true");
      expect(status.textContent).toBe("Loading more rows");
      expect(status.hidden).toBe(false);
    });

    it("sets busy state when status element is missing", () => {
      const grid = document.createElement("div");

      setPaginationBusy(
        {
          grid,
          status: null,
          loadingMoreText: "Loading more rows",
          loadedText: "Loaded rows",
        },
        true,
      );

      expect(grid.getAttribute("aria-busy")).toBe("true");
    });

    it("keeps status untouched while busy when loading text is unavailable", () => {
      const grid = document.createElement("div");
      const status = document.createElement("p");
      status.textContent = "Original";
      status.hidden = true;

      setPaginationBusy(
        {
          grid,
          status,
          loadingMoreText: "",
          loadedText: "Loaded rows",
        },
        true,
      );

      expect(grid.getAttribute("aria-busy")).toBe("true");
      expect(status.textContent).toBe("Original");
      expect(status.hidden).toBe(true);
    });

    it("clears busy state and updates status text after loading", () => {
      const grid = document.createElement("div");
      const status = document.createElement("p");
      status.hidden = false;

      setPaginationBusy(
        {
          grid,
          status,
          loadingMoreText: "Loading more rows",
          loadedText: "Rows loaded",
        },
        false,
      );

      expect(grid.getAttribute("aria-busy")).toBe("false");
      expect(status.textContent).toBe("Rows loaded");
      expect(status.hidden).toBe(true);
    });

    it("still clears busy state when status element is missing", () => {
      const grid = document.createElement("div");

      setPaginationBusy(
        {
          grid,
          status: null,
          loadingMoreText: "Loading more rows",
          loadedText: "Rows loaded",
        },
        false,
      );

      expect(grid.getAttribute("aria-busy")).toBe("false");
    });
  });

  describe("cachedVirtualCells", () => {
    it("returns an empty array when grid is missing", () => {
      expect(cachedVirtualCells({ grid: null, rows: [], cellSelector: CELL_SELECTOR })).toEqual([]);
    });

    it("uses a custom row resolver and prefers explicit header row class", () => {
      const grid = document.createElement("div");

      const headerRow = document.createElement("div");
      headerRow.className = "pvc-data-grid__row--header";
      headerRow.setAttribute("role", "row");
      const headerCell = buildCell({ label: "header", rowIndex: 0, columnIndex: 0 });
      headerRow.append(headerCell);
      grid.append(headerRow);

      const rowOne = document.createElement("div");
      const rowOneCell = buildCell({ label: "row-1", rowIndex: 1, columnIndex: 0 });
      rowOne.append(rowOneCell);

      const rowTwo = document.createElement("div");
      const rowTwoCell = buildCell({ label: "row-2", rowIndex: 2, columnIndex: 0 });
      rowTwo.append(rowTwoCell);

      const allCellsForRow = vi.fn((row) => Array.from(row.querySelectorAll(CELL_SELECTOR)));

      const cells = cachedVirtualCells({
        grid,
        rows: [rowOne, rowTwo],
        cellSelector: CELL_SELECTOR,
        allCellsForRow,
      });

      expect(cells.map((cell) => cell.textContent)).toEqual(["header", "row-1", "row-2"]);
      expect(allCellsForRow).toHaveBeenCalledTimes(3);
      expect(allCellsForRow).toHaveBeenNthCalledWith(1, headerRow);
    });

    it("falls back to aria-rowindex header row when classed header is absent", () => {
      const grid = document.createElement("div");

      const headerRow = document.createElement("div");
      headerRow.setAttribute("role", "row");
      headerRow.setAttribute("aria-rowindex", "1");
      const headerCell = buildCell({ label: "aria-header", rowIndex: 0, columnIndex: 0 });
      headerRow.append(headerCell);
      grid.append(headerRow);

      const row = document.createElement("div");
      const bodyCell = buildCell({ label: "body", rowIndex: 1, columnIndex: 0 });
      row.append(bodyCell);

      const cells = cachedVirtualCells({
        grid,
        rows: [row],
        cellSelector: CELL_SELECTOR,
      });

      expect(cells).toEqual([headerCell, bodyCell]);
    });

    it("uses row-index 0 query fallback when no header row exists", () => {
      const grid = document.createElement("div");
      const detachedHeaderCell = buildCell({ label: "query-header", rowIndex: 0, columnIndex: 0 });
      grid.append(detachedHeaderCell);

      const row = document.createElement("div");
      const bodyCell = buildCell({ label: "body", rowIndex: 1, columnIndex: 0 });
      row.append(bodyCell);

      const cells = cachedVirtualCells({
        grid,
        rows: [row],
        cellSelector: CELL_SELECTOR,
      });

      expect(cells).toEqual([detachedHeaderCell, bodyCell]);
    });
  });
});
