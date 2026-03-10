import { Controller } from "@hotwired/stimulus";

const NAVIGATION_KEYS = new Set([
  "ArrowRight",
  "ArrowLeft",
  "ArrowDown",
  "ArrowUp",
  "Home",
  "End",
  "PageDown",
  "PageUp",
]);

export default class extends Controller {
  static targets = ["grid", "scrollContainer"];

  connect() {
    this.#ensureActiveCell();
  }

  handleFocusin(event) {
    const cell = this.#resolveCell(event.target);
    if (!cell) return;

    this.#setActiveCell(cell);
  }

  handleKeydown(event) {
    if (!this.hasGridTarget) return;
    if (!NAVIGATION_KEYS.has(event.key)) return;

    const activeCell = this.#activeCell();
    if (!activeCell) return;

    const nextCell = this.#nextCellForEvent(activeCell, event);
    if (!nextCell) return;

    event.preventDefault();
    this.#focusCell(nextCell);
  }

  #activeCell() {
    if (!this.hasGridTarget) return null;

    return (
      this.gridTarget.querySelector(
        '[data-pathogen--data-grid-target~="cell"][tabindex="0"]',
      ) || this.#firstDataCell()
    );
  }

  #allCells() {
    if (!this.hasGridTarget) return [];

    return Array.from(
      this.gridTarget.querySelectorAll(
        '[data-pathogen--data-grid-target~="cell"]',
      ),
    );
  }

  #buildCellMap() {
    const map = new Map();

    this.#allCells().forEach((cell) => {
      const rowIndex = this.#rowIndex(cell);
      if (rowIndex === null) return;

      if (!map.has(rowIndex)) {
        map.set(rowIndex, []);
      }

      map.get(rowIndex).push(cell);
    });

    map.forEach((cells) => {
      cells.sort((a, b) => this.#columnIndex(a) - this.#columnIndex(b));
    });

    return map;
  }

  #cellAt(rowIndex, columnIndex, map) {
    const rowCells = map.get(rowIndex);
    if (!rowCells || rowCells.length === 0) return null;

    const safeColumn = Math.max(0, Math.min(columnIndex, rowCells.length - 1));
    return rowCells[safeColumn];
  }

  #columnIndex(cell) {
    return Number(cell.dataset.pathogenDataGridColumnIndex);
  }

  #firstDataCell() {
    if (!this.hasGridTarget) return null;

    return this.gridTarget.querySelector(
      '[data-pathogen--data-grid-target~="cell"][data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="0"]',
    );
  }

  #focusCell(cell) {
    this.#setActiveCell(cell);
    cell.focus({ preventScroll: true });
    cell.scrollIntoView({ block: "nearest" });
  }

  #lastDataRowIndex(map) {
    return Math.max(
      ...Array.from(map.keys()).filter((rowIndex) => rowIndex > 0),
      0,
    );
  }

  #nextCellForEvent(activeCell, event) {
    const map = this.#buildCellMap();
    if (map.size === 0) return null;

    const rowIndex = this.#rowIndex(activeCell);
    const columnIndex = this.#columnIndex(activeCell);
    const lastDataRow = this.#lastDataRowIndex(map);

    if (rowIndex === null || Number.isNaN(columnIndex)) return null;

    if ((event.ctrlKey || event.metaKey) && event.key === "Home") {
      return this.#cellAt(0, 0, map);
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "End") {
      return this.#lastDataCell(map, lastDataRow);
    }

    switch (event.key) {
      case "ArrowRight":
        return this.#nextHorizontalCell(map, rowIndex, columnIndex, 1);
      case "ArrowLeft":
        return this.#nextHorizontalCell(map, rowIndex, columnIndex, -1);
      case "ArrowDown":
        return this.#nextVerticalCell(map, rowIndex, columnIndex, 1, lastDataRow);
      case "ArrowUp":
        return this.#nextVerticalCell(map, rowIndex, columnIndex, -1, lastDataRow);
      case "Home":
        return this.#cellAt(rowIndex, 0, map);
      case "End":
        return this.#lastCellInRow(map, rowIndex);
      case "PageDown":
        return this.#pageCell(map, rowIndex, columnIndex, 1, lastDataRow);
      case "PageUp":
        return this.#pageCell(map, rowIndex, columnIndex, -1, lastDataRow);
      default:
        return null;
    }
  }

  #lastCellInRow(map, rowIndex) {
    const rowCells = map.get(rowIndex);
    if (!rowCells || rowCells.length === 0) return null;

    return rowCells[rowCells.length - 1];
  }

  #lastDataCell(map, lastDataRow) {
    const rowCells = map.get(lastDataRow);
    if (!rowCells || rowCells.length === 0) return null;

    return rowCells[rowCells.length - 1];
  }

  #nextHorizontalCell(map, rowIndex, columnIndex, direction) {
    const rowCells = map.get(rowIndex);
    if (!rowCells || rowCells.length === 0) return null;

    const nextColumnIndex = columnIndex + direction;
    if (nextColumnIndex >= 0 && nextColumnIndex < rowCells.length) {
      return this.#cellAt(rowIndex, nextColumnIndex, map);
    }

    if (direction > 0) {
      const nextRow = this.#nextRowWithCells(map, rowIndex + 1, 1);
      return nextRow === null ? null : this.#cellAt(nextRow, 0, map);
    }

    const previousRow = this.#nextRowWithCells(map, rowIndex - 1, -1);
    return previousRow === null ? null : this.#lastCellInRow(map, previousRow);
  }

  #nextRowWithCells(map, startRow, direction) {
    const rows = Array.from(map.keys());
    const limit = direction > 0 ? Math.max(...rows) : Math.min(...rows);

    let row = startRow;
    while (direction > 0 ? row <= limit : row >= limit) {
      const rowCells = map.get(row);
      if (rowCells && rowCells.length > 0) return row;
      row += direction;
    }

    return null;
  }

  #nextVerticalCell(map, rowIndex, columnIndex, direction, lastDataRow) {
    if (direction < 0 && rowIndex === 0) return null;

    if (direction > 0) {
      if (rowIndex >= lastDataRow) return null;
      const nextRow = rowIndex + 1;
      return this.#cellAt(nextRow, columnIndex, map);
    }

    const previousRow = rowIndex - 1;
    return this.#cellAt(previousRow, columnIndex, map);
  }

  #pageCell(map, rowIndex, columnIndex, direction, lastDataRow) {
    if (lastDataRow < 1) return null;

    const pageSize = this.#pageSize();
    if (direction > 0) {
      const baselineRow = rowIndex === 0 ? 1 : rowIndex;
      const targetRow = Math.min(lastDataRow, baselineRow + pageSize);
      return this.#cellAt(targetRow, columnIndex, map);
    }

    if (rowIndex === 0) return null;

    const targetRow = Math.max(1, rowIndex - pageSize);
    return this.#cellAt(targetRow, columnIndex, map);
  }

  #pageSize() {
    const firstDataRow = this.gridTarget.querySelector("tbody tr");
    const rowHeight = firstDataRow?.offsetHeight || 1;

    if (
      this.hasScrollContainerTarget &&
      this.scrollContainerTarget.clientHeight !== this.scrollContainerTarget.scrollHeight
    ) {
      return Math.max(1, Math.floor(this.scrollContainerTarget.clientHeight / rowHeight));
    }

    return Math.max(1, Math.floor(window.innerHeight / rowHeight));
  }

  #resolveCell(target) {
    if (!(target instanceof HTMLElement)) return null;

    return target.closest('[data-pathogen--data-grid-target~="cell"]');
  }

  #rowIndex(cell) {
    const value = Number(cell.dataset.pathogenDataGridRowIndex);
    return Number.isNaN(value) ? null : value;
  }

  #setActiveCell(cell) {
    this.#allCells().forEach((node) => {
      node.tabIndex = node === cell ? 0 : -1;
    });
  }

  #ensureActiveCell() {
    const activeCell = this.#activeCell();
    if (!activeCell) return;

    this.#setActiveCell(activeCell);
  }
}
