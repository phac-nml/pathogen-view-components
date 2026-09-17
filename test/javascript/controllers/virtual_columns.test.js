import { describe, expect, it, vi } from "vitest";

import { CenterColumnWindow } from "pathogen_view_components/data_grid_controller/virtual_columns";

const CELL_SELECTOR = '[data-pathogen--data-grid-target~="cell"]';

function buildCell({ label, columnIndex }) {
  const cell = document.createElement("div");
  cell.textContent = label;
  cell.setAttribute("data-pathogen--data-grid-target", "cell");
  if (columnIndex !== undefined) {
    cell.setAttribute("data-pathogen--data-grid-column-index", String(columnIndex));
  }
  return cell;
}

function buildLane(name, cells) {
  const lane = document.createElement("div");
  lane.setAttribute("data-pvc-data-grid-lane", name);
  lane.append(...cells);
  return lane;
}

function buildRowWithLanes({ pinned = [], center = [] }) {
  const row = document.createElement("div");

  if (pinned.length > 0) {
    row.append(buildLane("pinned", pinned));
  }

  if (center.length > 0) {
    row.append(buildLane("center", center));
  }

  return row;
}

describe("data_grid_controller/virtual_columns", () => {
  it("returns an empty array when row is missing", () => {
    const window = new CenterColumnWindow({
      pinnedCount: () => 0,
      cellSelector: CELL_SELECTOR,
    });

    expect(window.allCellsForRow(null)).toEqual([]);
  });

  it("falls back to querying the row when lanes are not present", () => {
    const window = new CenterColumnWindow({
      pinnedCount: () => 0,
      cellSelector: CELL_SELECTOR,
    });

    const row = document.createElement("div");
    const first = buildCell({ label: "fallback-1", columnIndex: 0 });
    const second = buildCell({ label: "fallback-2", columnIndex: 1 });
    row.append(first, second);

    expect(window.allCellsForRow(row)).toEqual([first, second]);
  });

  it("returns pinned cells first, then center cells", () => {
    const window = new CenterColumnWindow({
      pinnedCount: () => 1,
      cellSelector: CELL_SELECTOR,
    });

    const pinnedCell = buildCell({ label: "pinned", columnIndex: 0 });
    const centerOne = buildCell({ label: "center-1", columnIndex: 1 });
    const centerTwo = buildCell({ label: "center-2", columnIndex: 2 });
    const row = buildRowWithLanes({
      pinned: [pinnedCell],
      center: [centerOne, centerTwo],
    });

    expect(window.allCellsForRow(row)).toEqual([pinnedCell, centerOne, centerTwo]);
  });

  it("supports rows with only one lane present", () => {
    const window = new CenterColumnWindow({
      pinnedCount: () => 1,
      cellSelector: CELL_SELECTOR,
    });

    const pinnedOnly = buildRowWithLanes({
      pinned: [buildCell({ label: "pinned-only", columnIndex: 0 })],
    });
    const centerOnlyCell = buildCell({ label: "center-only", columnIndex: 1 });
    const centerOnly = buildRowWithLanes({ center: [centerOnlyCell] });

    expect(window.allCellsForRow(pinnedOnly).map((cell) => cell.textContent)).toEqual(["pinned-only"]);
    expect(window.allCellsForRow(centerOnly)).toEqual([centerOnlyCell]);
  });

  it("caches center lane cells and refreshes cache after reset", () => {
    const window = new CenterColumnWindow({
      pinnedCount: () => 1,
      cellSelector: CELL_SELECTOR,
    });

    const row = buildRowWithLanes({
      pinned: [buildCell({ label: "pinned", columnIndex: 0 })],
      center: [buildCell({ label: "center-1", columnIndex: 1 }), buildCell({ label: "center-2", columnIndex: 2 })],
    });

    const centerLane = row.querySelector('[data-pvc-data-grid-lane="center"]');
    const querySpy = vi.spyOn(centerLane, "querySelectorAll");

    window.allCellsForRow(row);
    window.allCellsForRow(row);
    window.reset();
    window.allCellsForRow(row);

    expect(querySpy).toHaveBeenCalledTimes(2);
  });

  it("treats invalid apply inputs and missing center lane as no-ops", () => {
    const window = new CenterColumnWindow({
      pinnedCount: () => 0,
      cellSelector: CELL_SELECTOR,
    });

    const rowWithoutCenter = buildRowWithLanes({
      pinned: [buildCell({ label: "pinned", columnIndex: 0 })],
    });

    const rowWithEmptyCenter = document.createElement("div");
    rowWithEmptyCenter.append(buildLane("center", []));

    expect(() => window.apply(null, { startIndex: 0, endIndex: 1 })).not.toThrow();
    expect(() => window.apply(rowWithoutCenter, { startIndex: 0, endIndex: 1 })).not.toThrow();
    expect(() => window.apply(rowWithEmptyCenter, { startIndex: 0, endIndex: 1 })).not.toThrow();
    expect(() => window.apply(rowWithEmptyCenter, null)).not.toThrow();
  });

  it("updates grid columns and only renders visible center cells", () => {
    const window = new CenterColumnWindow({
      pinnedCount: () => 2,
      cellSelector: CELL_SELECTOR,
    });

    const columnZero = buildCell({ label: "col-0", columnIndex: 0 });
    const columnOne = buildCell({ label: "col-1", columnIndex: 1 });
    const columnTwo = buildCell({ label: "col-2", columnIndex: 2 });
    const columnThree = buildCell({ label: "col-3", columnIndex: 3 });
    const columnFour = buildCell({ label: "col-4", columnIndex: 4 });
    const unknownColumn = buildCell({ label: "col-na", columnIndex: "not-a-number" });

    const row = buildRowWithLanes({
      center: [columnZero, columnOne, columnTwo, columnThree, columnFour, unknownColumn],
    });

    const centerLane = row.querySelector('[data-pvc-data-grid-lane="center"]');

    window.apply(row, { startIndex: 1, endIndex: 4 });

    expect(Array.from(centerLane.children).map((cell) => cell.textContent)).toEqual(["col-1", "col-2", "col-3"]);
    expect(columnZero.style.gridColumn).toBe("");
    expect(columnOne.style.gridColumn).toBe("");
    expect(columnTwo.style.gridColumn).toBe("1");
    expect(columnThree.style.gridColumn).toBe("2");
    expect(columnFour.style.gridColumn).toBe("3");
    expect(unknownColumn.style.gridColumn).toBe("");
  });
});
