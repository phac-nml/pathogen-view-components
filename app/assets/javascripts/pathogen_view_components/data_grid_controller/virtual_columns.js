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
      cells.push(...this.#centerLaneCells(centerLane));
    }

    return cells;
  }

  apply(row, columnRange) {
    if (!row || !columnRange) return;

    const centerLane = row.querySelector('[data-pvc-data-grid-lane="center"]');
    if (!centerLane) return;

    const allCenterCells = this.#centerLaneCells(centerLane);
    if (allCenterCells.length === 0) return;

    const pinnedCount = this.#pinnedCount();
    const visibleCells = [];
    allCenterCells.forEach((cell) => {
      const columnIndex = columnIndexOf(cell);
      if (columnIndex === null) return;

      const centerTrack = columnIndex - pinnedCount + 1;
      if (centerTrack > 0) cell.style.gridColumn = `${centerTrack}`;

      if (columnIndex >= columnRange.startIndex && columnIndex < columnRange.endIndex) {
        visibleCells.push(cell);
      }
    });

    centerLane.replaceChildren(...visibleCells);
  }

  #centerLaneCells(centerLane) {
    const cachedCells = this.#cache.get(centerLane);
    if (cachedCells) return cachedCells;

    const cells = Array.from(centerLane.querySelectorAll(this.#cellSelector));
    this.#cache.set(centerLane, cells);
    return cells;
  }
}
