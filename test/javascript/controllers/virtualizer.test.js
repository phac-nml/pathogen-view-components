import { describe, expect, it } from "vitest";

import {
  computeVisibleRange,
  computeVisibleColumnRange,
  scrollTopForRow,
  scrollLeftForColumn,
  measureRowHeight,
} from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller/virtualizer";

describe("computeVisibleRange", () => {
  it("returns empty range when there are no rows", () => {
    const result = computeVisibleRange({
      scrollTop: 0,
      viewportHeight: 400,
      rowHeight: 40,
      totalRows: 0,
    });

    expect(result).toEqual({ startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 0 });
  });

  it("returns full range when total rows fit in viewport with buffer", () => {
    const result = computeVisibleRange({
      scrollTop: 0,
      viewportHeight: 400,
      rowHeight: 40,
      totalRows: 5,
      buffer: 10,
    });

    expect(result.startIndex).toBe(0);
    expect(result.endIndex).toBe(5); // All 5 rows, clamped to totalRows
    expect(result.offsetY).toBe(0);
    expect(result.totalHeight).toBe(200); // 5 × 40
  });

  it("returns correct range when scrolled partway through a large dataset", () => {
    const result = computeVisibleRange({
      scrollTop: 2000, // row 50 (2000/40)
      viewportHeight: 400, // 10 visible rows
      rowHeight: 40,
      totalRows: 1000,
      buffer: 10,
    });

    expect(result.startIndex).toBe(40); // 50 - 10 buffer
    expect(result.endIndex).toBe(70); // 50 + 10 visible + 10 buffer
    expect(result.offsetY).toBe(1600); // 40 × 40
    expect(result.totalHeight).toBe(40000); // 1000 × 40
  });

  it("clamps start to 0 when buffer exceeds scroll position", () => {
    const result = computeVisibleRange({
      scrollTop: 80, // row 2
      viewportHeight: 400,
      rowHeight: 40,
      totalRows: 100,
      buffer: 10,
    });

    expect(result.startIndex).toBe(0); // max(0, 2 - 10)
  });

  it("clamps end to totalRows when near bottom", () => {
    const result = computeVisibleRange({
      scrollTop: 3800, // row 95
      viewportHeight: 400,
      rowHeight: 40,
      totalRows: 100,
      buffer: 10,
    });

    expect(result.endIndex).toBe(100); // min(100, 95 + 10 + 10)
  });

  it("uses default buffer of 10 when not specified", () => {
    const result = computeVisibleRange({
      scrollTop: 2000,
      viewportHeight: 400,
      rowHeight: 40,
      totalRows: 1000,
    });

    expect(result.startIndex).toBe(40); // 50 - 10
    expect(result.endIndex).toBe(70); // 50 + 10 + 10
  });

  it("returns empty for zero viewport height", () => {
    const result = computeVisibleRange({
      scrollTop: 0,
      viewportHeight: 0,
      rowHeight: 40,
      totalRows: 100,
    });

    expect(result).toEqual({ startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 0 });
  });
});

describe("scrollTopForRow", () => {
  it("returns null when row is already visible", () => {
    const result = scrollTopForRow({
      rowIndex: 5,
      scrollTop: 160, // rows 4-13 visible
      viewportHeight: 400,
      rowHeight: 40,
    });

    expect(result).toBeNull();
  });

  it("scrolls up when row is above viewport", () => {
    const result = scrollTopForRow({
      rowIndex: 2,
      scrollTop: 200, // viewport starts at row 5
      viewportHeight: 400,
      rowHeight: 40,
    });

    expect(result).toBe(80); // row 2 top = 2 × 40 = 80
  });

  it("scrolls down when row is below viewport", () => {
    const result = scrollTopForRow({
      rowIndex: 15,
      scrollTop: 0, // viewport shows rows 0-9
      viewportHeight: 400,
      rowHeight: 40,
    });

    expect(result).toBe(240); // rowBottom(640) - viewportHeight(400) = 240
  });

  it("returns null for first row when scrolled to top", () => {
    const result = scrollTopForRow({
      rowIndex: 0,
      scrollTop: 0,
      viewportHeight: 400,
      rowHeight: 40,
    });

    expect(result).toBeNull();
  });
});

describe("computeVisibleColumnRange", () => {
  it("computes center-lane range from scrollLeft and pinned width", () => {
    const result = computeVisibleColumnRange({
      scrollLeft: 50,
      viewportWidth: 450,
      columnWidths: [100, 120, 140, 160, 180, 200],
      pinnedCount: 2,
      overscan: 1,
    });

    expect(result).toEqual({
      startIndex: 2,
      endIndex: 6,
      pinnedCount: 2,
    });
  });

  it("returns only pinned lane when there are no center columns", () => {
    const result = computeVisibleColumnRange({
      scrollLeft: 0,
      viewportWidth: 300,
      columnWidths: [100, 120],
      pinnedCount: 2,
      overscan: 2,
    });

    expect(result).toEqual({
      startIndex: 2,
      endIndex: 2,
      pinnedCount: 2,
    });
  });

  it("excludes pinned columns from center windowing", () => {
    const result = computeVisibleColumnRange({
      scrollLeft: 0,
      viewportWidth: 360,
      columnWidths: [80, 90, 100, 110, 120],
      pinnedCount: 2,
      overscan: 0,
    });

    expect(result.startIndex).toBe(2);
    expect(result.endIndex).toBe(5);
  });
});

describe("scrollLeftForColumn", () => {
  const columnWidths = [100, 120, 140, 160, 180];
  const columnOffsets = [0, 100, 220, 360, 520];

  it("returns null when target center column is already fully visible", () => {
    const result = scrollLeftForColumn({
      columnIndex: 2,
      scrollLeft: 20,
      viewportWidth: 500,
      pinnedWidth: 220,
      columnOffsets,
      columnWidths,
    });

    expect(result).toBeNull();
  });

  it("returns minimal leftward scroll when target is left of viewport", () => {
    const result = scrollLeftForColumn({
      columnIndex: 2,
      scrollLeft: 200,
      viewportWidth: 500,
      pinnedWidth: 220,
      columnOffsets,
      columnWidths,
    });

    expect(result).toBe(0);
  });

  it("returns minimal rightward scroll when target is right of viewport", () => {
    const result = scrollLeftForColumn({
      columnIndex: 4,
      scrollLeft: 0,
      viewportWidth: 500,
      pinnedWidth: 220,
      columnOffsets,
      columnWidths,
    });

    expect(result).toBe(200);
  });
});

describe("measureRowHeight", () => {
  it("returns fallback when viewport is null", () => {
    expect(measureRowHeight(null)).toBe(40);
  });

  it("returns fallback when no rows exist", () => {
    const div = document.createElement("div");
    expect(measureRowHeight(div)).toBe(40);
  });

  it("returns offsetHeight of the first row", () => {
    const div = document.createElement("div");
    const row = document.createElement("div");
    row.setAttribute("role", "row");
    // jsdom doesn't compute layout, so offsetHeight is 0
    div.appendChild(row);
    // With jsdom, offsetHeight is always 0, so fallback to 40
    expect(measureRowHeight(div)).toBe(40);
  });
});
