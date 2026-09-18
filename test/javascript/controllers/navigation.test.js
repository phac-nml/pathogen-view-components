import { describe, expect, it } from "vitest";

import {
  buildCellMap,
  cellAt,
  columnIndexOf,
  firstDataCell,
  lastCellInRow,
  lastDataCell,
  lastDataRowIndex,
  nextCellForKey,
  nextHorizontalCell,
  nextRowWithCells,
  nextVerticalCell,
  pageCell,
  rowIndexOf,
} from "pathogen_view_components/data_grid_controller/navigation";

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

describe("data_grid_controller/navigation full coverage", () => {
  const grid = () => {
    const cells = [];
    for (let r = 0; r <= 3; r += 1) {
      for (let c = 0; c <= 2; c += 1) {
        cells.push(buildCell({ rowIndex: r, columnIndex: c, label: `r${r}c${c}` }));
      }
    }
    return { cells, map: buildCellMap(cells) };
  };

  const cellFor = (map, row, col) => map.get(row).find((cell) => columnIndexOf(cell) === col);

  it("columnIndexOf / rowIndexOf return null for non-numeric attributes", () => {
    const bad = document.createElement("div");
    bad.setAttribute("data-pathogen--data-grid-target", "cell");
    bad.setAttribute("data-pathogen--data-grid-row-index", "abc");
    bad.setAttribute("data-pathogen--data-grid-column-index", "abc");
    expect(rowIndexOf(bad)).toBeNull();
    expect(columnIndexOf(bad)).toBeNull();

    const good = buildCell({ rowIndex: 2, columnIndex: 1, label: "x" });
    expect(rowIndexOf(good)).toBe(2);
    expect(columnIndexOf(good)).toBe(1);
  });

  it("buildCellMap skips cells with invalid row or column indexes", () => {
    const good0 = buildCell({ rowIndex: 1, columnIndex: 0, label: "g0" });
    const good1 = buildCell({ rowIndex: 1, columnIndex: 1, label: "g1" });
    const noRow = buildCell({ rowIndex: 1, columnIndex: 2, label: "noRow" });
    noRow.setAttribute("data-pathogen--data-grid-row-index", "abc");
    const noCol = buildCell({ rowIndex: 1, columnIndex: 2, label: "noCol" });
    noCol.setAttribute("data-pathogen--data-grid-column-index", "abc");

    const map = buildCellMap([good0, good1, noRow, noCol]);

    expect(map.get(1)).toEqual([good0, good1]);
  });

  it("firstDataCell finds the row 1 / column 0 cell or null", () => {
    const { cells } = grid();
    expect(firstDataCell(cells)?.textContent).toBe("r1c0");
    expect(firstDataCell([buildCell({ rowIndex: 2, columnIndex: 2, label: "x" })])).toBeNull();
  });

  it("lastDataRowIndex ignores the header row", () => {
    const { map } = grid();
    expect(lastDataRowIndex(map)).toBe(3);
    expect(lastDataRowIndex(new Map([[0, []]]))).toBe(0);
  });

  it("cellAt returns null for empty or missing rows", () => {
    const { map } = grid();
    expect(cellAt(99, 0, map)).toBeNull();
  });

  it("nextHorizontalCell returns null for empty or missing rows", () => {
    const { map } = grid();
    expect(nextHorizontalCell(map, 99, 0, 1)).toBeNull();
    expect(nextHorizontalCell(new Map([[1, []]]), 1, 0, 1)).toBeNull();
  });

  it("lastCellInRow / lastDataCell return the trailing cell or null", () => {
    const { map } = grid();
    expect(lastCellInRow(map, 2)?.textContent).toBe("r2c2");
    expect(lastCellInRow(map, 99)).toBeNull();
    expect(lastDataCell(map, 3)?.textContent).toBe("r3c2");
  });

  it("nextRowWithCells scans past gaps in the requested direction", () => {
    const { map } = grid();
    expect(nextRowWithCells(map, 1, 1)).toBe(1);

    const sparse = new Map(map);
    sparse.delete(2);
    expect(nextRowWithCells(sparse, 2, 1)).toBe(3);
    expect(nextRowWithCells(sparse, 2, -1)).toBe(1);

    expect(nextRowWithCells(new Map([[1, []]]), 1, 1)).toBeNull();
  });

  it("nextVerticalCell moves between rows and clamps at edges", () => {
    const { map } = grid();
    expect(nextVerticalCell(map, 0, 0, -1, 3)).toBeNull();
    expect(nextVerticalCell(map, 3, 0, 1, 3)).toBeNull();
    expect(nextVerticalCell(map, 1, 1, 1, 3)?.textContent).toBe("r2c1");
    expect(nextVerticalCell(map, 2, 1, -1, 3)?.textContent).toBe("r1c1");

    const only2 = buildCellMap([buildCell({ rowIndex: 2, columnIndex: 0, label: "only" })]);
    expect(nextVerticalCell(only2, 2, 0, 1, 5)).toBeNull();
    expect(nextVerticalCell(only2, 2, 0, -1, 2)).toBeNull();
  });

  it("pageCell pages down and up with clamping", () => {
    const { map } = grid();
    expect(pageCell(map, 1, 0, 1, 2)?.textContent).toBe("r3c0");
    expect(pageCell(map, 0, 0, 1, 2)?.textContent).toBe("r3c0");
    expect(pageCell(map, 1, 0, 1, 0)?.textContent).toBe("r2c0");
    expect(pageCell(map, 3, 0, -1, 2)?.textContent).toBe("r1c0");
    expect(pageCell(map, 0, 0, -1, 2)).toBeNull();
    expect(pageCell(new Map(), 0, 0, 1, 2)).toBeNull();

    const empties = new Map([
      [1, []],
      [2, []],
    ]);
    expect(pageCell(empties, 1, 0, 1, 2)).toBeNull();
    expect(pageCell(empties, 2, 0, -1, 1)).toBeNull();
  });

  it("nextCellForKey routes each key to the correct movement", () => {
    const { map } = grid();
    const active = cellFor(map, 1, 1);

    expect(nextCellForKey(active, { key: "ArrowRight" }, map, 2)?.textContent).toBe("r1c2");
    expect(nextCellForKey(active, { key: "ArrowLeft" }, map, 2)?.textContent).toBe("r1c0");
    expect(nextCellForKey(active, { key: "ArrowDown" }, map, 2)?.textContent).toBe("r2c1");
    expect(nextCellForKey(active, { key: "ArrowUp" }, map, 2)?.textContent).toBe("r0c1");
    expect(nextCellForKey(active, { key: "Home" }, map, 2)?.textContent).toBe("r1c0");
    expect(nextCellForKey(active, { key: "End" }, map, 2)?.textContent).toBe("r1c2");
    expect(nextCellForKey(active, { key: "PageDown" }, map, 2)?.textContent).toBe("r3c1");
    expect(nextCellForKey(active, { key: "PageUp" }, map, 2)?.textContent).toBe("r1c1");
    expect(nextCellForKey(active, { key: "Escape" }, map, 2)).toBeNull();

    expect(nextCellForKey(active, { key: "Home", ctrlKey: true }, map, 2)?.textContent).toBe("r0c0");
    expect(nextCellForKey(active, { key: "End", metaKey: true }, map, 2)?.textContent).toBe("r3c2");

    expect(nextCellForKey(active, { key: "ArrowRight" }, new Map(), 2)).toBeNull();

    const badCell = document.createElement("div");
    badCell.setAttribute("data-pathogen--data-grid-target", "cell");
    badCell.setAttribute("data-pathogen--data-grid-row-index", "abc");
    badCell.setAttribute("data-pathogen--data-grid-column-index", "abc");
    expect(nextCellForKey(badCell, { key: "ArrowRight" }, map, 2)).toBeNull();
  });
});
