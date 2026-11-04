import {
  PageCache,
  pagesForRowRange,
  pagesForRowRangeWithPrefetch,
} from "pathogen_view_components/data_grid_controller/page_cache";

const ROW_SELECTOR = '[role="row"]';
const DEFAULT_PREFETCH_PAGES = 2;

/**
 * Parses fetched row HTML fragments into global-indexed row elements.
 * @param {object} payload
 * @param {Array<{ index: number, html: string }>} payload.rows
 * @returns {Map<number, HTMLElement>}
 */
export function parseRows(payload) {
  const rows = new Map();
  if (!payload || !Array.isArray(payload.rows)) return rows;

  const entries = payload.rows.filter((entry) => {
    const globalIndex = Number(entry?.index);
    const html = entry?.html;
    return Number.isFinite(globalIndex) && typeof html === "string" && html.trim().length > 0;
  });

  if (entries.length === 0) return rows;

  const container = document.createElement("div");
  container.innerHTML = entries.map((entry) => entry.html).join("");
  const parsedRows = container.querySelectorAll(ROW_SELECTOR);

  entries.forEach((entry, index) => {
    const row = parsedRows[index];
    if (!row) return;
    rows.set(Number(entry.index), row);
  });

  return rows;
}

// Builds a rows request URL: caller search params are overlaid first, then
// pagination params win (a null-valued param is deleted rather than set).
export function buildRowsUrl({ url, origin = window.location.origin, searchParams, params }) {
  const requestUrl = new URL(url, origin);
  const base = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams || undefined);
  new Set(base.keys()).forEach((key) => {
    requestUrl.searchParams.delete(key);
    base.getAll(key).forEach((value) => requestUrl.searchParams.append(key, value));
  });
  for (const [key, value] of Object.entries(params)) {
    requestUrl.searchParams.delete(key);
    if (value !== null && value !== undefined) requestUrl.searchParams.set(key, String(value));
  }
  return requestUrl;
}

// Deduplicates concurrent requests for the same key, clearing the entry once settled.
export function trackInFlight(map, key, start) {
  if (map.has(key)) return map.get(key);
  const request = start().finally(() => map.delete(key));
  map.set(key, request);
  return request;
}

export class PaginatedRowSource {
  #cache;
  #inFlight = new Map();
  #fetchFn;
  #origin;
  #parseRows;
  #prefetchPages;
  #retainedRowIndex;
  #searchParams;
  #totalRows;
  #url;
  #pageSize;

  constructor({
    url,
    pageSize,
    totalRows,
    searchParams = null,
    prefetchPages = DEFAULT_PREFETCH_PAGES,
    retainedRowIndex = () => null,
    cache = new PageCache(),
    fetchFn = (...args) => fetch(...args),
    origin = window.location.origin,
    rowParser = parseRows,
  }) {
    this.#cache = cache;
    this.#fetchFn = fetchFn;
    this.#origin = origin;
    this.#parseRows = rowParser;
    this.#prefetchPages = prefetchPages;
    this.#retainedRowIndex = retainedRowIndex;
    this.#searchParams = new URLSearchParams(searchParams || undefined);
    this.#totalRows = totalRows;
    this.#url = url;
    this.#pageSize = pageSize;
  }

  get totalRows() {
    return this.#totalRows;
  }

  get pageSize() {
    return this.#pageSize;
  }

  get isFetching() {
    return this.#inFlight.size > 0;
  }

  get hasMore() {
    return false;
  }

  seedFromRows(rows) {
    this.#cache.seedFromRows(rows);
  }

  getRow(globalIndex) {
    return this.#cache.getRow(globalIndex);
  }

  getCachedRows() {
    return this.#cache.getCachedRows();
  }

  needsRow(globalIndex) {
    if (!Number.isFinite(globalIndex) || globalIndex < 0 || globalIndex >= this.#totalRows) return false;

    return this.#cache.getRow(globalIndex) === null;
  }

  evictOutsideRange(startIndex, endIndex, bufferRows) {
    // Retain the rows we intentionally prefetch (see #prefetchPages) so scrolling
    // does not re-request pages that were just fetched and evicted. This matters
    // most for horizontal scrolling, which never changes the visible row range yet
    // still triggers a scroll-settled fetch. The extra page absorbs the visible
    // range's offset from a page boundary so every prefetched page is kept whole.
    const prefetchBuffer = (this.#prefetchPages + 1) * this.#pageSize;
    const retainRows = Math.max(bufferRows, prefetchBuffer);
    return this.#cache.evictOutsideRange(startIndex, endIndex, retainRows, this.#totalRows, this.#retainedRowIndex());
  }

  missingPagesForRange(startIndex, endIndex) {
    if (startIndex < 0 || endIndex <= startIndex) return [];

    const pages = pagesForRowRangeWithPrefetch(
      startIndex,
      endIndex,
      this.#pageSize,
      this.#prefetchPages,
      this.#totalRows,
    );
    const visiblePages = new Set(pagesForRowRange(startIndex, endIndex, this.#pageSize));

    return pages
      .filter((page) => this.#needsPage(page))
      .sort((left, right) => {
        const leftVisible = visiblePages.has(left) ? 0 : 1;
        const rightVisible = visiblePages.has(right) ? 0 : 1;
        return leftVisible - rightVisible;
      });
  }

  fetchPage(page, { signal } = {}) {
    return trackInFlight(this.#inFlight, page, () => this.#requestPage(page, signal));
  }

  #needsPage(page) {
    if (this.#inFlight.has(page)) return false;

    return this.#cache.needsPage(page, this.#pageSize, this.#totalRows);
  }

  async #requestPage(page, signal) {
    const requestUrl = buildRowsUrl({
      url: this.#url,
      origin: this.#origin,
      searchParams: this.#searchParams,
      params: { page, limit: this.#pageSize },
    });

    try {
      const response = await this.#fetchFn(requestUrl.toString(), {
        headers: { Accept: "application/json" },
        signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch virtual grid rows (status ${response.status})`);
      }

      const payload = await response.json();
      if (signal?.aborted) return { rows: new Map(), aborted: true };

      const rows = this.#parseRows(payload);
      const cacheChanged = this.#cache.storeRows(rows, this.#retainedRowIndex());

      return { rows, aborted: false, cacheChanged };
    } catch (error) {
      if (signal?.aborted || error.name === "AbortError") {
        return { rows: new Map(), aborted: true };
      }

      throw error;
    }
  }
}
