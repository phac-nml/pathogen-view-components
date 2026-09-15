import { columnIndexOf } from "pathogen_view_components/data_grid_controller/navigation";

export class CenterColumnWindow {
  #cache = new WeakMap();
  #pinnedCount;
  #cellSelector;

  constructor({ pinnedCount, cellSelector }) {
    this.#pinnedCount = pinnedCount;
    this.#cellSelector = cellSelector;
  }

  reset() {
    this.#cache = new WeakMap();
  }

  restore(row) {
    const centerLane = row?.querySelector('[data-pvc-data-grid-lane="center"]');
    if (!centerLane) return;

    const state = this.#centerLaneState(centerLane);
    this.#reconcileCells(centerLane, state.cells);
    state.range = null;
  }

  allCellsForRow(row) {
    if (!row) return [];

    const pinnedLane = row.querySelector('[data-pvc-data-grid-lane="pinned"]');
    const centerLane = row.querySelector('[data-pvc-data-grid-lane="center"]');
    if (!pinnedLane && !centerLane) {
      return Array.from(row.querySelectorAll(this.#cellSelector));
    }

    const cells = [];
    if (pinnedLane) {
      cells.push(...pinnedLane.querySelectorAll(this.#cellSelector));
    }
    if (centerLane) {
      cells.push(...this.#centerLaneState(centerLane).cells);
    }

    return cells;
  }

  apply(row, columnRange, retainedCell = null) {
    if (!row || !columnRange) return;

    const centerLane = row.querySelector('[data-pvc-data-grid-lane="center"]');
    if (!centerLane) return;

    const state = this.#centerLaneState(centerLane);
    if (state.cells.length === 0) return;

    const retainedIndex = state.indexes.get(retainedCell);
    const retained = retainedIndex === undefined ? null : retainedCell;
    if (
      state.range?.startIndex === columnRange.startIndex &&
      state.range?.endIndex === columnRange.endIndex &&
      state.retainedCell === retained
    )
      return;

    const visibleCells = [];
    for (let index = columnRange.startIndex; index < columnRange.endIndex; index += 1) {
      const cell = state.columns.get(index);
      if (cell) visibleCells.push(cell);
    }
    if (retained && retainedIndex < columnRange.startIndex) visibleCells.unshift(retained);
    else if (retained && retainedIndex >= columnRange.endIndex) visibleCells.push(retained);

    this.#reconcileCells(centerLane, visibleCells);
    state.range = columnRange;
    state.retainedCell = retained;
  }

  #reconcileCells(centerLane, visibleCells) {
    const desired = new Set(visibleCells);
    Array.from(centerLane.children).forEach((cell) => {
      if (!desired.has(cell)) cell.remove();
    });
    let nextCell = centerLane.firstElementChild;
    visibleCells.forEach((cell) => {
      if (cell === nextCell) nextCell = cell.nextElementSibling;
      else centerLane.insertBefore(cell, nextCell);
    });
  }

  #centerLaneState(centerLane) {
    const cached = this.#cache.get(centerLane);
    if (cached) return cached;

    const cells = Array.from(centerLane.querySelectorAll(this.#cellSelector));
    const columns = new Map();
    const indexes = new Map();
    const pinnedCount = this.#pinnedCount();
    cells.forEach((cell) => {
      const index = columnIndexOf(cell);
      if (index === null) return;

      columns.set(index, cell);
      indexes.set(cell, index);
      const track = index - pinnedCount + 1;
      if (track > 0) cell.style.gridColumn = `${track}`;
    });
    const state = { cells, columns, indexes, range: null, retainedCell: null };
    this.#cache.set(centerLane, state);
    return state;
  }
}
