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

export class PaginatedRowSource {
  #cache;
  #inFlight = new Map();
  #fetchFn;
  #origin;
  #parseRows;
  #prefetchPages;
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
    this.#cache.evictOutsideRange(startIndex, endIndex, bufferRows, this.#totalRows);
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

  async fetchPage(page, { signal } = {}) {
    const cacheKey = this.#generateCacheKey(page);
    if (this.#inFlight.has(cacheKey)) return this.#inFlight.get(cacheKey);

    const request = this.#requestPage(page, signal).finally(() => {
      this.#inFlight.delete(cacheKey);
    });

    this.#inFlight.set(cacheKey, request);
    return request;
  }

  #generateCacheKey(page) {
    return `${page}:${this.#pageSize}`;
  }

  #needsPage(page) {
    if (this.#inFlight.has(this.#generateCacheKey(page))) return false;

    return this.#cache.needsPage(page, this.#pageSize, this.#totalRows);
  }

  #buildRequestUrl(page) {
    const requestUrl = new URL(this.#url, this.#origin);

    new Set(this.#searchParams.keys()).forEach((key) => {
      requestUrl.searchParams.delete(key);
      this.#searchParams.getAll(key).forEach((value) => {
        requestUrl.searchParams.append(key, value);
      });
    });

    // Pagination controls always win over caller-supplied duplicates.
    requestUrl.searchParams.set("page", String(page));
    requestUrl.searchParams.set("limit", String(this.#pageSize));

    return requestUrl;
  }

  async #requestPage(page, signal) {
    const requestUrl = this.#buildRequestUrl(page);

    try {
      const response = await this.#fetchFn(requestUrl.toString(), {
        headers: { Accept: "application/json" },
        signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch virtual grid rows (status ${response.status})`);
      }

      const payload = await response.json();
      const rows = this.#parseRows(payload);
      this.#cache.storeRows(rows);

      return { rows, aborted: false };
    } catch (error) {
      if (error.name === "AbortError") {
        return { rows: new Map(), aborted: true };
      }

      throw error;
    }
  }
}
