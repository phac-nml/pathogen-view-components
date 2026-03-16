// Row virtualizer — computes visible row ranges and manages virtual scroll state.
// All functions take explicit arguments; none rely on controller state.

/**
 * Computes which rows should be rendered given the current scroll position.
 * @param {object} options
 * @param {number} options.scrollTop - Current scroll position of the viewport
 * @param {number} options.viewportHeight - Visible height of the viewport
 * @param {number} options.rowHeight - Height of each row
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
 * Measures the actual row height from the first rendered body row.
 * @param {HTMLElement} viewport - The viewport element containing body rows
 * @returns {number} Measured row height, or 40 as fallback
 */
export function measureRowHeight(viewport) {
  if (!viewport) return 40;

  const firstRow = viewport.querySelector('[role="row"]');
  if (!firstRow) return 40;

  return firstRow.offsetHeight || 40;
}
