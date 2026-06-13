// Paginated virtual row cache and page-range math.

/**
 * Maps a zero-based global row range to 1-based page numbers.
 * @param {number} startIndex - Inclusive global row index
 * @param {number} endIndex - Exclusive global row index
 * @param {number} pageSize
 * @returns {number[]}
 */
export function maxPageForCount(totalRows, pageSize) {
  if (!Number.isFinite(totalRows) || totalRows <= 0 || !Number.isFinite(pageSize) || pageSize <= 0) {
    return 0;
  }

  return Math.ceil(totalRows / pageSize);
}

export function pagesForRowRange(startIndex, endIndex, pageSize) {
  if (!Number.isFinite(pageSize) || pageSize <= 0 || endIndex <= startIndex) return [];

  const firstPage = Math.floor(startIndex / pageSize) + 1;
  const lastPage = Math.floor(Math.max(startIndex, endIndex - 1) / pageSize) + 1;
  return Array.from({ length: lastPage - firstPage + 1 }, (_, offset) => firstPage + offset);
}

/**
 * Expands a visible row range to include neighboring pages for prefetch.
 * @param {number} startIndex - Inclusive global row index
 * @param {number} endIndex - Exclusive global row index
 * @param {number} pageSize
 * @param {number} [prefetchPages=2] - Extra pages to include on each side
 * @returns {number[]}
 */
export function pagesForRowRangeWithPrefetch(startIndex, endIndex, pageSize, prefetchPages = 2, totalRows = null) {
  const pages = pagesForRowRange(startIndex, endIndex, pageSize);
  if (pages.length === 0 || prefetchPages <= 0) return pages;

  const maxPage = totalRows === null ? null : maxPageForCount(totalRows, pageSize);
  const firstPage = Math.max(1, pages[0] - prefetchPages);
  const lastPage = Math.min(
    pages[pages.length - 1] + prefetchPages,
    maxPage === null ? pages[pages.length - 1] + prefetchPages : maxPage,
  );
  const expanded = [];

  for (let page = firstPage; page <= lastPage; page += 1) {
    expanded.push(page);
  }

  return expanded;
}

export class PageCache {
  #rowsByIndex = new Map();
  get size() {
    return this.#rowsByIndex.size;
  }

  getRow(globalIndex) {
    return this.#rowsByIndex.get(globalIndex) ?? null;
  }

  getCachedRows() {
    return Array.from(this.#rowsByIndex.values());
  }

  seedFromRows(rowElements) {
    rowElements.forEach((row) => {
      const globalIndex = Number.parseInt(row.dataset.pvcDataGridGlobalRowIndex ?? "", 10);
      if (!Number.isFinite(globalIndex)) return;
      this.#rowsByIndex.set(globalIndex, row);
    });
  }

  storeRows(rows) {
    rows.forEach((row, globalIndex) => {
      this.#rowsByIndex.set(globalIndex, row);
    });
  }

  hasAllRowsForPage(page, pageSize, totalRows) {
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, totalRows);
    if (start >= totalRows) return false;

    for (let index = start; index < end; index += 1) {
      if (!this.#rowsByIndex.has(index)) return false;
    }

    return true;
  }

  isPageWithinRange(page, pageSize, totalRows) {
    const start = (page - 1) * pageSize;
    return start < totalRows;
  }

  needsPage(page, pageSize, totalRows) {
    if (!this.isPageWithinRange(page, pageSize, totalRows)) return false;

    return !this.hasAllRowsForPage(page, pageSize, totalRows);
  }

  /**
   * Drops cached rows outside the buffered visible range.
   * @param {number} startIndex - Inclusive global row index
   * @param {number} endIndex - Exclusive global row index
   * @param {number} bufferRows - Extra rows to retain on each side
   * @param {number} totalRows
   */
  evictOutsideRange(startIndex, endIndex, bufferRows, totalRows) {
    const retainStart = Math.max(0, startIndex - bufferRows);
    const retainEnd = Math.min(totalRows, endIndex + bufferRows);

    this.#rowsByIndex.forEach((_, globalIndex) => {
      if (globalIndex < retainStart || globalIndex >= retainEnd) {
        this.#rowsByIndex.delete(globalIndex);
      }
    });
  }
}
