import { PageCache } from "pathogen_view_components/data_grid_controller/page_cache";
import { parseRows } from "pathogen_view_components/data_grid_controller/page_source";

// Checkpoints keep only a cursor and range, never all the row content. Their
// logical indexes describe the UI; they are not sent as database offsets.
export class CursorRowSource {
  #cache = new PageCache();
  #checkpoints = [];
  #inFlight = new Map();
  #nextCursor;
  #totalRows = 0;
  #options;

  constructor(options) {
    this.#options = options;
    this.#nextCursor = options.nextCursor;
  }

  get totalRows() {
    return this.#totalRows;
  }
  get pageSize() {
    return this.#options.pageSize;
  }
  get hasMore() {
    return this.#nextCursor !== null;
  }
  get isFetching() {
    return this.#inFlight.size > 0;
  }
  get nextPage() {
    return this.#checkpoints.length + 1;
  }

  seedFromRows(rows) {
    this.#cache.seedFromRows(rows);
    this.#totalRows = rows.length;
    this.#checkpoints = [{ cursor: null, start: 0, count: rows.length }];
  }

  getRow(index) {
    return this.#cache.getRow(index);
  }
  getCachedRows() {
    return this.#cache.getCachedRows();
  }
  needsRow(index) {
    return index >= 0 && index < this.totalRows && !this.getRow(index);
  }

  evictOutsideRange(start, end, buffer) {
    return this.#cache.evictOutsideRange(
      start,
      end,
      Math.max(buffer, this.pageSize * 2),
      this.totalRows,
      this.#options.retainedRowIndex(),
    );
  }

  missingPagesForRange(start, end) {
    const pages = [];
    this.#checkpoints.forEach((checkpoint, index) => {
      const first = Math.max(start, checkpoint.start);
      const last = Math.min(end, checkpoint.start + checkpoint.count);
      for (let row = first; row < last; row += 1) {
        if (this.needsRow(row)) {
          pages.push(index + 1);
          break;
        }
      }
    });
    if (this.hasMore && end >= this.totalRows) pages.push(this.nextPage);
    return pages.filter((page) => !this.#inFlight.has(page));
  }

  fetchPage(page, { signal } = {}) {
    if (this.#inFlight.has(page)) return this.#inFlight.get(page);
    const checkpoint = this.#checkpoints[page - 1];
    // Serve only known checkpoints or the current frontier page while a cursor
    // continuation exists. Ignore requests that skip ahead or ask past exhaustion.
    if (!checkpoint && (page !== this.nextPage || !this.hasMore)) return Promise.resolve({ aborted: false });
    const request = this.#request(checkpoint, signal).finally(() => this.#inFlight.delete(page));
    this.#inFlight.set(page, request);
    return request;
  }

  async #request(checkpoint, signal) {
    const cursor = checkpoint ? checkpoint.cursor : this.#nextCursor;
    const start = checkpoint ? checkpoint.start : this.totalRows;
    const url = new URL(this.#options.url, window.location.origin);
    const params = new URLSearchParams(this.#options.searchParams || "");
    new Set(params.keys()).forEach((key) => {
      url.searchParams.delete(key);
      params.getAll(key).forEach((value) => url.searchParams.append(key, value));
    });
    url.searchParams.delete("page");
    url.searchParams.delete("cursor");
    if (cursor !== null) url.searchParams.set("cursor", cursor);
    url.searchParams.set("limit", String(this.pageSize));
    const response = await fetch(url.toString(), { headers: { Accept: "application/json" }, signal });
    if (!response.ok) {
      const error = new Error(`Failed to fetch virtual grid rows (status ${response.status})`);
      error.refreshRequired = [400, 409, 410, 422].includes(response.status);
      throw error;
    }
    const payload = await response.json();
    if (signal?.aborted) return { aborted: true };
    const rows = parseRows(payload);
    const next = payload.next_cursor;
    const validCursor = next === null || (typeof next === "string" && next.length > 0 && next !== cursor);
    const entries = payload.rows;
    const validRows =
      Array.isArray(entries) &&
      entries.length === rows.size &&
      rows.size <= this.pageSize &&
      entries.every(
        (entry, index) =>
          entry.index === start + index &&
          rows.get(entry.index)?.dataset.pvcDataGridGlobalRowIndex === String(entry.index) &&
          rows.get(entry.index)?.getAttribute("aria-rowindex") === String(entry.index + 2),
      );
    if (
      !validCursor ||
      !validRows ||
      (rows.size === 0 && next !== null) ||
      (checkpoint && checkpoint.count !== rows.size)
    ) {
      const error = new Error("The cursor response no longer matches this grid.");
      error.refreshRequired = true;
      throw error;
    }
    if (!checkpoint) {
      this.#checkpoints.push({ cursor, start, count: rows.size });
      this.#totalRows += rows.size;
      this.#nextCursor = next;
    }
    const cacheChanged = this.#cache.storeRows(rows, this.#options.retainedRowIndex());
    return { rows, cacheChanged, aborted: false };
  }
}
