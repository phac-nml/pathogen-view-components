import { PaginatedRowSource } from "pathogen_view_components/data_grid_controller/page_source";

const DEFAULT_PAGE_SIZE = 20;
const SCROLL_SETTLE_MS = 150;

export class PaginatedVirtualRows {
  #source;
  #placeholderTemplate;
  #fetchAbort = null;
  #fetchTimerId = null;
  #scrolling = false;
  #cellSelector;
  #rowHeight;
  #visibleRange;
  #onRowsChanged;
  #onVisibleRowsChanged;
  #setBusy;
  #handleError;

  constructor({
    rows,
    contract,
    cellSelector,
    rowHeight,
    visibleRange,
    onRowsChanged,
    onVisibleRowsChanged,
    setBusy,
    handleError,
  }) {
    this.#source = new PaginatedRowSource({
      url: contract.rowsUrl,
      pageSize: contract.pageSize,
      totalRows: contract.totalRows,
    });
    this.#source.seedFromRows(rows);
    this.#placeholderTemplate = rows[0]?.cloneNode(true) ?? null;
    this.#cellSelector = cellSelector;
    this.#rowHeight = rowHeight;
    this.#visibleRange = visibleRange;
    this.#onRowsChanged = onRowsChanged;
    this.#onVisibleRowsChanged = onVisibleRowsChanged;
    this.#setBusy = setBusy;
    this.#handleError = handleError;
  }

  get totalRows() {
    return this.#source.totalRows;
  }

  get pageSize() {
    return this.#source.pageSize || DEFAULT_PAGE_SIZE;
  }

  getCachedRows() {
    return this.#source.getCachedRows();
  }

  rowAt(globalIndex) {
    return this.#source.getRow(globalIndex) || this.#createPlaceholderRow(globalIndex);
  }

  afterRender(startIndex, endIndex, bufferRows) {
    this.#source.evictOutsideRange(startIndex, endIndex, bufferRows);
  }

  handleScroll() {
    this.#scrolling = true;
    this.#scheduleScrollSettledFetch();
  }

  handleScrollEnd() {
    this.#scrolling = false;
    if (this.#fetchTimerId) {
      clearTimeout(this.#fetchTimerId);
      this.#fetchTimerId = null;
    }

    this.#flushCurrentRange();
  }

  ensureRowLoaded(rowIndex) {
    if (!this.#source.needsRow(rowIndex)) return;

    const pageStart = Math.floor(rowIndex / this.pageSize) * this.pageSize;
    this.flushRange(pageStart, pageStart + this.pageSize);
  }

  flushRange(startIndex, endIndex) {
    if (startIndex < 0 || endIndex <= startIndex) return;

    const missingPages = this.#source.missingPagesForRange(startIndex, endIndex);
    if (missingPages.length === 0) return;

    if (!this.#fetchAbort) {
      this.#fetchAbort = new AbortController();
    }

    const signal = this.#fetchAbort.signal;
    this.#setBusy(true);

    let completed = 0;
    const total = missingPages.length;

    missingPages.forEach((page) => {
      this.#source
        .fetchPage(page, { signal })
        .then((result) => {
          if (result.aborted) return;

          this.#onRowsChanged();

          const pageStart = (page - 1) * this.pageSize;
          const pageEnd = pageStart + this.pageSize;
          const { startIndex: visibleStart, endIndex: visibleEnd } = this.#visibleRange();
          const overlapsVisible = pageEnd > visibleStart && pageStart < visibleEnd;

          if (overlapsVisible) this.#onVisibleRowsChanged();
        })
        .catch((error) => {
          if (error.name === "AbortError") return;
          this.#handleError(error);
        })
        .finally(() => {
          completed += 1;
          if (completed >= total) this.#setBusy(false);
        });
    });
  }

  disconnect() {
    if (this.#fetchAbort) this.#fetchAbort.abort();
    this.#fetchAbort = null;
    if (this.#fetchTimerId) clearTimeout(this.#fetchTimerId);
    this.#fetchTimerId = null;
    this.#scrolling = false;
  }

  #scheduleScrollSettledFetch() {
    if (this.#fetchTimerId) clearTimeout(this.#fetchTimerId);
    this.#fetchTimerId = setTimeout(() => {
      this.#fetchTimerId = null;
      if (!this.#scrolling) return;

      this.#scrolling = false;
      this.#flushCurrentRange();
    }, SCROLL_SETTLE_MS);
  }

  #flushCurrentRange() {
    const { startIndex, endIndex } = this.#visibleRange();
    this.flushRange(startIndex, endIndex);
  }

  #createPlaceholderRow(globalIndex) {
    const dataRowIndex = globalIndex + 1;
    const ariaRowIndex = globalIndex + 2;
    const rowHeight = this.#rowHeight();

    if (this.#placeholderTemplate) {
      const row = this.#placeholderTemplate.cloneNode(true);
      row.dataset.pvcDataGridGlobalRowIndex = String(globalIndex);
      row.setAttribute("aria-rowindex", String(ariaRowIndex));
      row.setAttribute("aria-busy", "true");
      row.style.height = `${rowHeight}px`;
      row.style.minHeight = `${rowHeight}px`;
      row.querySelectorAll(this.#cellSelector).forEach((cell) => {
        cell.textContent = "";
        cell.setAttribute("tabindex", "-1");
        cell.setAttribute("data-pathogen--data-grid-row-index", String(dataRowIndex));
        cell.removeAttribute("data-pathogen--data-grid-active");
      });
      return row;
    }

    const row = document.createElement("div");
    row.className = "pvc-data-grid__row flex min-w-max";
    row.setAttribute("role", "row");
    row.setAttribute("aria-rowindex", String(ariaRowIndex));
    row.setAttribute("aria-busy", "true");
    row.dataset.pvcDataGridGlobalRowIndex = String(globalIndex);
    row.style.height = `${rowHeight}px`;
    row.style.minHeight = `${rowHeight}px`;
    return row;
  }
}
