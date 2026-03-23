// Cell navigation — pure functions that operate on cells and maps.
// All functions take explicit arguments; none rely on controller state.

const CELL_SELECTOR = '[data-pathogen--data-grid-target~="cell"]';
const FIRST_DATA_CELL_SELECTOR = `${CELL_SELECTOR}[data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="0"]`;

export function columnIndexOf(cell) {
  const value = Number(cell.getAttribute("data-pathogen--data-grid-column-index"));
  return Number.isNaN(value) ? null : value;
}

export function rowIndexOf(cell) {
  const value = Number(cell.getAttribute("data-pathogen--data-grid-row-index"));
  return Number.isNaN(value) ? null : value;
}

export function buildCellMap(cells) {
  const map = new Map();

  cells.forEach((cell) => {
    const row = rowIndexOf(cell);
    if (row === null) return;

    const col = columnIndexOf(cell);
    if (col === null) return;

    if (!map.has(row)) map.set(row, []);
    map.get(row).push(cell);
  });

  map.forEach((rowCells) => {
    rowCells.sort((a, b) => columnIndexOf(a) - columnIndexOf(b));
  });

  return map;
}

function lowerBoundColumnIndex(rowCells, targetColumnIndex) {
  let low = 0;
  let high = rowCells.length;

  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (columnIndexOf(rowCells[mid]) < targetColumnIndex) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

export function firstDataCell(cells) {
  return cells.find((cell) => cell.matches(FIRST_DATA_CELL_SELECTOR)) || null;
}

export function lastDataRowIndex(map) {
  return Math.max(...Array.from(map.keys()).filter((r) => r > 0), 0);
}

export function cellAt(rowIndex, columnIndex, map) {
  const rowCells = map.get(rowIndex);
  if (!rowCells || rowCells.length === 0) return null;

  const lowerBound = lowerBoundColumnIndex(rowCells, columnIndex);
  if (lowerBound < rowCells.length && columnIndexOf(rowCells[lowerBound]) === columnIndex) {
    return rowCells[lowerBound];
  }

  const fallbackIndex = lowerBound - 1;
  return fallbackIndex >= 0 ? rowCells[fallbackIndex] : rowCells[0];
}

export function lastCellInRow(map, rowIndex) {
  const rowCells = map.get(rowIndex);
  if (!rowCells || rowCells.length === 0) return null;
  return rowCells[rowCells.length - 1];
}

export function lastDataCell(map, lastRow) {
  return lastCellInRow(map, lastRow);
}

export function nextRowWithCells(map, startRow, direction) {
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

export function nextHorizontalCell(map, rowIndex, columnIndex, direction) {
  const rowCells = map.get(rowIndex);
  if (!rowCells || rowCells.length === 0) return null;

  const currentPos = lowerBoundColumnIndex(rowCells, columnIndex);
  if (currentPos >= rowCells.length || columnIndexOf(rowCells[currentPos]) !== columnIndex) return null;

  const nextPos = currentPos + direction;
  if (nextPos >= 0 && nextPos < rowCells.length) return rowCells[nextPos];

  return null;
}

export function nextVerticalCell(map, rowIndex, columnIndex, direction, lastRow) {
  if (direction < 0 && rowIndex === 0) return null;

  if (direction > 0) {
    if (rowIndex >= lastRow) return null;
    const nextRow = nextRowWithCells(map, rowIndex + 1, 1);
    return nextRow === null ? null : cellAt(nextRow, columnIndex, map);
  }

  const prevRow = nextRowWithCells(map, rowIndex - 1, -1);
  return prevRow === null ? null : cellAt(prevRow, columnIndex, map);
}

export function pageCell(map, rowIndex, columnIndex, direction, pageSize) {
  const lastRow = lastDataRowIndex(map);
  if (lastRow < 1) return null;
  const normalizedPageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 1;

  if (direction > 0) {
    const baseline = rowIndex === 0 ? 1 : rowIndex;
    const clamped = Math.min(lastRow, baseline + normalizedPageSize);
    const targetRow = nextRowWithCells(map, clamped, -1);
    return targetRow === null ? null : cellAt(targetRow, columnIndex, map);
  }

  if (rowIndex === 0) return null;

  const clamped = Math.max(1, rowIndex - normalizedPageSize);
  const targetRow = nextRowWithCells(map, clamped, 1);
  return targetRow === null ? null : cellAt(targetRow, columnIndex, map);
}

/**
 * Returns the next cell for an arrow/Home/End/Page keyboard event.
 * @param {HTMLElement} activeCell
 * @param {KeyboardEvent} event
 * @param {Map} map  - from buildCellMap()
 * @param {number} pageSize - visible rows
 * @returns {HTMLElement|null}
 */
export function nextCellForKey(activeCell, event, map, pageSize) {
  if (map.size === 0) return null;

  const row = rowIndexOf(activeCell);
  const col = columnIndexOf(activeCell);
  const lastRow = lastDataRowIndex(map);

  if (row === null || col === null) return null;

  if ((event.ctrlKey || event.metaKey) && event.key === "Home") return cellAt(0, 0, map);
  if ((event.ctrlKey || event.metaKey) && event.key === "End") return lastDataCell(map, lastRow);

  switch (event.key) {
    case "ArrowRight":
      return nextHorizontalCell(map, row, col, 1);
    case "ArrowLeft":
      return nextHorizontalCell(map, row, col, -1);
    case "ArrowDown":
      return nextVerticalCell(map, row, col, 1, lastRow);
    case "ArrowUp":
      return nextVerticalCell(map, row, col, -1, lastRow);
    case "Home":
      return cellAt(row, 0, map);
    case "End":
      return lastCellInRow(map, row);
    case "PageDown":
      return pageCell(map, row, col, 1, pageSize);
    case "PageUp":
      return pageCell(map, row, col, -1, pageSize);
    default:
      return null;
  }
}
