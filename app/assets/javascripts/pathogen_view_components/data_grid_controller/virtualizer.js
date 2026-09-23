// Row virtualizer — computes visible row ranges and manages virtual scroll state.
// All functions take explicit arguments; none rely on controller state.

/**
 * Computes which rows should be rendered given the current scroll position.
 * Assumes uniform row height — variable-height rows are not supported.
 * @param {object} options
 * @param {number} options.scrollTop - Current scroll position of the viewport
 * @param {number} options.viewportHeight - Visible height of the viewport
 * @param {number} options.rowHeight - Uniform height of each row (px)
 * @param {number} options.totalRows - Total number of data rows
 * @param {number} [options.buffer=10] - Number of extra rows to render above and below
 * @returns {{ startIndex: number, endIndex: number, offsetY: number, totalHeight: number }}
 */
export function computeVisibleRange({ scrollTop, viewportHeight, rowHeight, totalRows, buffer = 10 }) {
  if (totalRows === 0 || rowHeight <= 0 || viewportHeight <= 0) {
    return { startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 0 };
  }

  const totalHeight = totalRows * rowHeight;
  const firstVisible = Math.floor(scrollTop / rowHeight);
  const visibleCount = Math.ceil(viewportHeight / rowHeight);

  const startIndex = Math.max(0, firstVisible - buffer);
  const endIndex = Math.min(totalRows, firstVisible + visibleCount + buffer);
  const offsetY = startIndex * rowHeight;

  return { startIndex, endIndex, offsetY, totalHeight };
}

/**
 * Computes the scroll position needed to bring a given row into view.
 * Returns null if the row is already visible.
 * @param {object} options
 * @param {number} options.rowIndex - The 0-based row index to scroll to
 * @param {number} options.scrollTop - Current scroll position
 * @param {number} options.viewportHeight - Visible height of the viewport
 * @param {number} options.rowHeight - Height of each row
 * @returns {number|null} The new scrollTop value, or null if already visible
 */
export function scrollTopForRow({ rowIndex, scrollTop, viewportHeight, rowHeight }) {
  const rowTop = rowIndex * rowHeight;
  const rowBottom = rowTop + rowHeight;

  // Already visible — no scroll needed
  if (rowTop >= scrollTop && rowBottom <= scrollTop + viewportHeight) {
    return null;
  }

  // Row is above the viewport — scroll up
  if (rowTop < scrollTop) {
    return rowTop;
  }

  // Row is below the viewport — scroll down
  return rowBottom - viewportHeight;
}

/**
 * Computes the rendered center-column window, excluding pinned columns.
 * Returned indexes are absolute and endIndex is exclusive.
 * @param {object} options
 * @param {number} options.scrollLeft - Current horizontal center-lane scroll offset
 * @param {number} options.viewportWidth - Total visible viewport width
 * @param {number[]} options.columnWidths - Width of every column in order
 * @param {number[]} [options.columnOffsets] - Precomputed absolute left offsets for all columns
 * @param {number} options.pinnedCount - Number of pinned columns at the start of the grid
 * @param {number} [options.pinnedWidth] - Precomputed total width of pinned columns
 * @param {number} [options.overscan=2] - Extra center columns to include on both sides
 * @returns {{ startIndex: number, endIndex: number, pinnedCount: number }}
 */
export function computeVisibleColumnRange({
  scrollLeft,
  viewportWidth,
  columnWidths,
  columnOffsets,
  pinnedCount,
  pinnedWidth,
  overscan = 2,
}) {
  const totalColumns = columnWidths.length;
  const pinned = Math.max(0, Math.min(totalColumns, pinnedCount));

  if (totalColumns === 0 || viewportWidth <= 0 || pinned >= totalColumns) {
    return { startIndex: pinned, endIndex: pinned, pinnedCount: pinned };
  }

  const offsets = columnOffsets ?? offsetsForColumns(columnWidths);
  const resolvedPinnedWidth = pinnedWidth ?? offsets[pinned];
  const viewStart = resolvedPinnedWidth + Math.max(0, scrollLeft);
  const viewEnd = viewStart + Math.max(0, viewportWidth - resolvedPinnedWidth);

  // Find the first column whose right edge crosses into the viewport.
  let low = pinned;
  let high = totalColumns;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (offsets[middle] + columnWidths[middle] <= viewStart) low = middle + 1;
    else high = middle;
  }
  const firstVisible = Math.min(low, totalColumns - 1);

  // The first column starting beyond the viewport is the exclusive end.
  low = firstVisible;
  high = totalColumns;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (offsets[middle] < viewEnd) low = middle + 1;
    else high = middle;
  }
  const endVisible = Math.max(firstVisible + 1, low);

  return {
    startIndex: Math.max(pinned, firstVisible - overscan),
    endIndex: Math.min(totalColumns, endVisible + overscan),
    pinnedCount: pinned,
  };
}

function offsetsForColumns(columnWidths) {
  const offsets = new Array(columnWidths.length);
  let offset = 0;
  for (let index = 0; index < columnWidths.length; index += 1) {
    offsets[index] = offset;
    offset += columnWidths[index];
  }
  return offsets;
}

/**
 * Computes the minimal horizontal scroll needed to fully reveal a column.
 * Returns null if the target is already fully visible in the center lane.
 * @param {object} options
 * @param {number} options.columnIndex - Absolute target column index
 * @param {number} options.scrollLeft - Current horizontal center-lane scroll offset
 * @param {number} options.viewportWidth - Total visible viewport width
 * @param {number} options.pinnedWidth - Total width of pinned columns
 * @param {number[]} options.columnOffsets - Absolute left offsets for all columns
 * @param {number[]} options.columnWidths - Width of every column in order
 * @returns {number|null} New scrollLeft or null when no movement is needed
 */
export function scrollLeftForColumn({
  columnIndex,
  scrollLeft,
  viewportWidth,
  pinnedWidth,
  columnOffsets,
  columnWidths,
}) {
  if (
    columnIndex < 0 ||
    columnIndex >= columnWidths.length ||
    columnOffsets[columnIndex] === undefined ||
    viewportWidth <= pinnedWidth
  ) {
    return null;
  }

  const centerViewportWidth = viewportWidth - pinnedWidth;
  const columnStart = Math.max(0, columnOffsets[columnIndex] - pinnedWidth);
  const columnEnd = columnStart + columnWidths[columnIndex];
  const viewportStart = Math.max(0, scrollLeft);
  const viewportEnd = viewportStart + centerViewportWidth;

  if (columnStart >= viewportStart && columnEnd <= viewportEnd) {
    return null;
  }

  if (columnStart < viewportStart) {
    return columnStart;
  }

  return columnEnd - centerViewportWidth;
}

/**
 * Measures the actual row height from the first rendered body row.
 * @param {HTMLElement} viewport - The viewport element containing body rows
 * @returns {number|null} Measured row height, or null when measurement fails
 */
export function measureRowHeight(viewport) {
  if (!viewport) return null;

  const firstRow = viewport.querySelector('[role="row"]');
  if (!firstRow) return null;

  return firstRow.offsetHeight > 0 ? firstRow.offsetHeight : null;
}
