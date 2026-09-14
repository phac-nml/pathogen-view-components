import { PaginatedRowSource } from "pathogen_view_components/data_grid_controller/page_source";

const SCROLL_SETTLE_MS = 150;

export class PaginatedVirtualRows {
  #source;
  #placeholderTemplate;
  #fetchAbort = new AbortController();
  #failedPages = new Set();
  #fetchTimerId = null;
  #cellSelector;
  #rowHeight;
  #visibleRange;
  #renderedRange = null;
  #onCacheChanged;
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
    retainedRowIndex = () => null,
    onCacheChanged = () => {},
    onRowsChanged,
    onVisibleRowsChanged,
    setBusy,
    handleError,
  }) {
    this.#source = new PaginatedRowSource({
      url: contract.rowsUrl,
      pageSize: contract.pageSize,
      totalRows: contract.totalRows,
      searchParams: contract.searchParams,
      retainedRowIndex,
    });
    this.#source.seedFromRows(rows);
    this.#cellSelector = cellSelector;
    this.#placeholderTemplate = this.#createPlaceholderTemplate(rows[0]);
    this.#rowHeight = rowHeight;
    this.#visibleRange = visibleRange;
    this.#onCacheChanged = onCacheChanged;
    this.#onRowsChanged = onRowsChanged;
    this.#onVisibleRowsChanged = onVisibleRowsChanged;
    this.#setBusy = setBusy;
    this.#handleError = handleError;
  }

  get totalRows() {
    return this.#source.totalRows;
  }

  get pageSize() {
    return this.#source.pageSize;
  }

  getCachedRows() {
    return this.#source.getCachedRows();
  }

  rowAt(globalIndex) {
    return this.#source.getRow(globalIndex) || this.#createPlaceholderRow(globalIndex);
  }

  afterRender(startIndex, endIndex, bufferRows) {
    this.#renderedRange = { startIndex, endIndex, bufferRows };
    if (this.#evictRows()) this.#onCacheChanged();
  }

  handleScroll() {
    if (this.#fetchAbort.signal.aborted) return;

    this.#scheduleScrollSettledFetch();
  }

  handleScrollEnd() {
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
    if (this.#fetchAbort.signal.aborted || startIndex < 0 || endIndex <= startIndex) return;

    const missingPages = this.#source.missingPagesForRange(startIndex, endIndex);
    if (missingPages.length === 0) return;

    const signal = this.#fetchAbort.signal;
    if (!this.#source.isFetching) this.#setBusy(true);

    missingPages.forEach((page) => {
      const request = this.#source.fetchPage(page, { signal });

      request
        .then((result) => {
          if (signal.aborted || result.aborted) return;

          this.#failedPages.delete(page);
          const evicted = this.#evictRows();
          if (result.cacheChanged || evicted) this.#onCacheChanged();
          this.#onRowsChanged({ hasPageErrors: this.#failedPages.size > 0 });

          const pageStart = (page - 1) * this.pageSize;
          const pageEnd = pageStart + this.pageSize;
          const { startIndex: visibleStart, endIndex: visibleEnd } = this.#visibleRange();
          const overlapsVisible = pageEnd > visibleStart && pageStart < visibleEnd;

          if (overlapsVisible) this.#onVisibleRowsChanged();
        })
        .catch((error) => {
          if (signal.aborted || error.name === "AbortError") return;

          this.#failedPages.add(page);
          this.#handleError(error);
        })
        .finally(() => {
          if (signal.aborted) return;

          this.#setBusy(this.#source.isFetching);
        });
    });
  }

  disconnect() {
    if (this.#fetchAbort.signal.aborted) return;

    this.#fetchAbort.abort();
    if (this.#fetchTimerId) clearTimeout(this.#fetchTimerId);
    this.#fetchTimerId = null;
    this.#setBusy(false);
  }

  #evictRows() {
    if (!this.#renderedRange) return false;

    // Controller range indexes may be invalid while the next render is scheduled.
    const { startIndex, endIndex, bufferRows } = this.#renderedRange;
    return this.#source.evictOutsideRange(startIndex, endIndex, bufferRows);
  }

  #scheduleScrollSettledFetch() {
    if (this.#fetchTimerId) clearTimeout(this.#fetchTimerId);
    this.#fetchTimerId = setTimeout(() => {
      this.#fetchTimerId = null;
      this.#flushCurrentRange();
    }, SCROLL_SETTLE_MS);
  }

  #flushCurrentRange() {
    const { startIndex, endIndex } = this.#visibleRange();
    this.flushRange(startIndex, endIndex);
  }

  #createPlaceholderTemplate(firstRow) {
    if (!firstRow) return null;

    const template = firstRow.cloneNode(true);
    template.querySelectorAll(this.#cellSelector).forEach((cell) => {
      cell.textContent = "";
      cell.setAttribute("tabindex", "-1");
      cell.removeAttribute("data-pathogen--data-grid-active");
    });
    return template;
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
        cell.setAttribute("data-pathogen--data-grid-row-index", String(dataRowIndex));
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
