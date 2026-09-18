import { buildCellMap, cellAt, columnIndexOf } from "pathogen_view_components/data_grid_controller/navigation";

// Index logical cells, including detached virtual cells. Focus changes do not
// change membership; callers invalidate only when the underlying cells change.
export class CellIndex {
  #readCells;
  #cells = null;
  #positions = new WeakMap();
  #rows = null;

  constructor(readCells) {
    this.#readCells = readCells;
  }

  get cells() {
    if (!this.#cells) {
      this.#cells = this.#readCells();
      this.#cells.forEach((cell, index) => this.#positions.set(cell, index));
    }
    return this.#cells;
  }

  get rows() {
    this.#rows ||= buildCellMap(this.cells);
    return this.#rows;
  }

  has(cell) {
    return this.indexOf(cell) !== -1;
  }

  indexOf(cell) {
    this.cells;
    return this.#positions.get(cell) ?? -1;
  }

  at(rowIndex, columnIndex) {
    const cell = cellAt(rowIndex, columnIndex, this.rows);
    return cell && columnIndexOf(cell) === columnIndex ? cell : null;
  }

  invalidate() {
    this.#cells = null;
    this.#rows = null;
    this.#positions = new WeakMap();
  }
}
