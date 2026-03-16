import { describe, expect, it } from "vitest";

import { buildCellMap, cellAt, nextHorizontalCell } from "pathogen_view_components/data_grid_controller/navigation";

function buildCell({ rowIndex, columnIndex, label }) {
  const cell = document.createElement("div");
  cell.textContent = label;
  cell.setAttribute("data-pathogen--data-grid-target", "cell");
  cell.setAttribute("data-pathogen--data-grid-row-index", String(rowIndex));
  cell.setAttribute("data-pathogen--data-grid-column-index", String(columnIndex));
  return cell;
}

describe("data_grid_controller/navigation", () => {
  it("cellAt returns exact match when present", () => {
    const cells = [
      buildCell({ rowIndex: 1, columnIndex: 0, label: "c0" }),
      buildCell({ rowIndex: 1, columnIndex: 2, label: "c2" }),
      buildCell({ rowIndex: 1, columnIndex: 4, label: "c4" }),
    ];
    const map = buildCellMap(cells);

    const target = cellAt(1, 2, map);

    expect(target?.textContent).toBe("c2");
  });

  it("cellAt falls back to nearest lower column when exact match is missing", () => {
    const cells = [
      buildCell({ rowIndex: 1, columnIndex: 1, label: "c1" }),
      buildCell({ rowIndex: 1, columnIndex: 4, label: "c4" }),
      buildCell({ rowIndex: 1, columnIndex: 8, label: "c8" }),
    ];
    const map = buildCellMap(cells);

    const target = cellAt(1, 7, map);

    expect(target?.textContent).toBe("c4");
  });

  it("cellAt returns first cell when target column is before row start", () => {
    const cells = [
      buildCell({ rowIndex: 1, columnIndex: 3, label: "c3" }),
      buildCell({ rowIndex: 1, columnIndex: 5, label: "c5" }),
    ];
    const map = buildCellMap(cells);

    const target = cellAt(1, 1, map);

    expect(target?.textContent).toBe("c3");
  });

  it("nextHorizontalCell keeps edge behavior at row boundaries", () => {
    const left = buildCell({ rowIndex: 2, columnIndex: 0, label: "left" });
    const mid = buildCell({ rowIndex: 2, columnIndex: 1, label: "mid" });
    const right = buildCell({ rowIndex: 2, columnIndex: 2, label: "right" });
    const map = buildCellMap([left, mid, right]);

    expect(nextHorizontalCell(map, 2, 1, -1)).toBe(left);
    expect(nextHorizontalCell(map, 2, 1, 1)).toBe(right);
    expect(nextHorizontalCell(map, 2, 0, -1)).toBeNull();
    expect(nextHorizontalCell(map, 2, 2, 1)).toBeNull();
  });

  it("nextHorizontalCell returns null when current column is missing", () => {
    const cells = [
      buildCell({ rowIndex: 3, columnIndex: 0, label: "c0" }),
      buildCell({ rowIndex: 3, columnIndex: 2, label: "c2" }),
    ];
    const map = buildCellMap(cells);

    expect(nextHorizontalCell(map, 3, 1, 1)).toBeNull();
  });
});
