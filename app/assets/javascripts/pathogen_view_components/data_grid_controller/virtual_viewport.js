import { columnIndexOf, rowIndexOf } from "pathogen_view_components/data_grid_controller/navigation";
import { cachedVirtualCells, paginationContract } from "pathogen_view_components/data_grid_controller/pagination_mode";
import { PaginatedVirtualRows } from "pathogen_view_components/data_grid_controller/paginated_virtual_rows";
import { horizontalStickyEnabled } from "pathogen_view_components/data_grid_controller/scroll";
import { CenterColumnWindow } from "pathogen_view_components/data_grid_controller/virtual_columns";
import {
  ensureVirtualCellVisible,
  renderVirtualWindow,
} from "pathogen_view_components/data_grid_controller/virtual_window";
import { computeVisibleColumnRange, measureRowHeight } from "pathogen_view_components/data_grid_controller/virtualizer";

const EMPTY_RANGE = { rowStart: -1, rowEnd: -1, columnStart: -1, columnEnd: -1 };
const RESIZE_DEBOUNCE_MS = 120;

// Owns virtual rows, column measurements and rendering. Keyboard focus and UI
// messages stay with the controller; the page provider owns request state.
export class VirtualViewport {
  #element;
  #grid;
  #viewport;
  #scroll;
  #cellSelector;
  #focus;
  #onCellsChanged;
  #onError;
  #syncScrollAffordance;
  #paginationOptions;
  #onPositionChanged;
  #pagination = null;
  #rows = null;
  #initialCursorRows = null;
  #knownTotal = null;
  #rowSource = null;
  #cells = null;
  #rowHeight = 40;
  #rowOverscan = 10;
  #columns = { widths: [], offsets: [], pinnedCount: 0, pinnedWidth: 0, overscan: 2 };
  #columnWindow;
  #range = EMPTY_RANGE;
  #frame = null;
  #fetchAfterRender = false;
  #resizeTimer = null;
  #resizeObserver = null;

  constructor({
    element,
    grid,
    viewport,
    scrollContainer,
    cellSelector,
    focus,
    onCellsChanged,
    onError,
    syncScrollAffordance,
    setBusy,
    onPageError,
    onPageSuccess,
    onPositionChanged = () => {},
  }) {
    this.#onPositionChanged = onPositionChanged;
    this.#element = element;
    this.#grid = grid;
    this.#viewport = viewport;
    this.#scroll = scrollContainer;
    this.#cellSelector = cellSelector;
    this.#focus = focus;
    this.#onCellsChanged = onCellsChanged;
    this.#onError = onError;
    this.#syncScrollAffordance = syncScrollAffordance;
    this.#paginationOptions = { setBusy, handleError: onPageError, onPageSuccess };
    this.#columnWindow = new CenterColumnWindow({ pinnedCount: () => this.#columns.pinnedCount, cellSelector });
  }

  get rowHeight() {
    return this.#rowHeight;
  }
  get pinnedWidth() {
    return horizontalStickyEnabled(this.#scroll) ? this.#columns.pinnedWidth : 0;
  }
  get totalRows() {
    return this.#rowSource?.totalRows ?? 0;
  }
  get totalCount() {
    return this.hasMore ? this.#knownTotal : this.totalRows;
  }
  get cursorMode() {
    return this.#pagination?.cursorMode === true;
  }
  get hasMore() {
    return this.#pagination?.hasMore === true;
  }
  loadNext() {
    return this.#pagination.loadNext();
  }
  retry() {
    return this.#pagination?.retry();
  }

  get lastColumnIndex() {
    return this.#columns.widths.length - 1;
  }

  get cells() {
    if (!this.#cells && this.#pagination) {
      const cached = cachedVirtualCells({
        grid: this.#grid,
        rows: this.#pagination.getCachedRows(),
        cellSelector: this.#cellSelector,
        allCellsForRow: (row) => this.#columnWindow.allCellsForRow(row),
      });
      const known = new Set(cached);
      const placeholders = Array.from(this.#viewport.querySelectorAll(this.#cellSelector)).filter(
        (cell) => !known.has(cell),
      );
      this.#cells = [...cached, ...placeholders];
    }
    return this.#cells || [];
  }

  connect() {
    const rows = Array.from(this.#viewport.querySelectorAll('[role="row"]'));
    const config = paginationContract(this.#grid, 20);
    this.#knownTotal = config.knownTotal;
    this.#cells = Array.from(this.#grid.querySelectorAll(this.#cellSelector));
    if (config.mode === "cursor") this.#initialCursorRows = rows.map((row) => row.cloneNode(true));
    this.#readColumns();
    this.#rowHeight = measureRowHeight(this.#viewport) || this.#rowHeight;

    if (config.rowsUrl && (config.mode === "cursor" || config.totalRows > 0)) {
      this.#pagination = new PaginatedVirtualRows({
        rows,
        contract: config,
        cellSelector: this.#cellSelector,
        rowHeight: () => this.#rowHeight,
        visibleRange: () => ({ startIndex: this.#range.rowStart, endIndex: this.#range.rowEnd }),
        retainedRowIndex: () => {
          const cell = this.#focus.resolveCell(document.activeElement);
          const index = cell ? rowIndexOf(cell) : null;
          return index === null || index < 1 ? null : index - 1;
        },
        onCacheChanged: () => this.#invalidateCells(),
        onRowsChanged: ({ hasPageErrors }) => {
          this.#resizeSpacer();
          this.#updateRowCount();
          this.#paginationOptions.onPageSuccess(hasPageErrors);
          this.#focus.restorePendingFocus();
        },
        onVisibleRowsChanged: () => {
          this.#range = EMPTY_RANGE;
          this.#scheduleRender();
        },
        setBusy: this.#paginationOptions.setBusy,
        handleError: this.#paginationOptions.handleError,
      });
      this.#rowSource = this.#pagination;
      this.#cells = null;
      if (config.rowOffset > 0 && rows.length > 0 && this.#scroll && this.#scroll.scrollTop === 0) {
        this.#scroll.scrollTop = config.rowOffset * this.#rowHeight;
      }
    } else {
      this.#rows = rows;
      this.#rowSource = { totalRows: rows.length, rowAt: (index) => rows[index] };
    }

    this.#resizeSpacer();
    this.#updateRowCount();
    this.#onCellsChanged();
    rows.forEach((row) => row.remove());
    this.render();
    if (this.#scroll instanceof Element && typeof ResizeObserver !== "undefined") {
      this.#resizeObserver = new ResizeObserver(() => this.handleResize());
      this.#resizeObserver.observe(this.#scroll);
    }
  }

  fetchVisiblePages() {
    this.#pagination?.flushRange(this.#range.rowStart, this.#range.rowEnd);
  }

  handleScroll() {
    this.#scheduleRender();
    this.#pagination?.handleScroll();
  }

  handleScrollEnd() {
    this.#pagination?.handleScrollEnd();
  }

  handleResize() {
    if (this.#resizeTimer) clearTimeout(this.#resizeTimer);
    this.#resizeTimer = setTimeout(() => {
      this.#resizeTimer = null;
      this.#rowHeight = measureRowHeight(this.#viewport) || this.#rowHeight;
      this.#resizeSpacer();
      this.#range = EMPTY_RANGE;
      this.#syncScrollAffordance();
      this.#scheduleRender(true);
    }, RESIZE_DEBOUNCE_MS);
  }

  resetScroll() {
    if (!this.#scroll) return;
    this.#scroll.scrollTop = 0;
    this.#scroll.scrollLeft = 0;
    this.#range = EMPTY_RANGE;
    this.render();
    this.fetchVisiblePages();
  }

  ensureVisible(rowIndex, columnIndex) {
    const pinnedWidth = this.pinnedWidth;
    ensureVirtualCellVisible({
      rowIndex,
      columnIndex,
      rowHeight: this.#rowHeight,
      scrollContainer: this.#scroll,
      visibleRange: { startIndex: this.#range.rowStart, endIndex: this.#range.rowEnd },
      pinnedCount: pinnedWidth > 0 ? this.#columns.pinnedCount : 0,
      columnWidths: this.#columns.widths,
      columnOffsets: this.#columns.offsets,
      pinnedWidth,
      isColumnRendered: (index) =>
        index === null ||
        index < this.#columns.pinnedCount ||
        this.#range.columnStart === -1 ||
        (index >= this.#range.columnStart && index < this.#range.columnEnd),
      prefetchRow: (index) => this.#pagination?.ensureRowLoaded(index),
      cancelScheduledRender: () => this.#cancelFrame(),
      renderNow: () => this.render(),
      reportError: this.#onError,
    });
  }

  render() {
    renderVirtualWindow({
      rowSource: this.#rowSource,
      rowHeight: this.#rowHeight,
      rowOverscan: this.#rowOverscan,
      scrollContainer: this.#scroll,
      viewport: this.#viewport,
      currentRange: this.#range,
      setCurrentRange: (range) => {
        this.#range = range;
      },
      computeColumnRange: () => this.#columnRange(),
      applyColumnWindow: (row, range, retainedCell) => this.#columnWindow.apply(row, range, retainedCell),
      headerRow: () => this.#headerRow(),
      onCellsChanged: () => {
        if (this.#pagination) this.#invalidateCells();
      },
      ...this.#focus,
    });
    this.#focus.restorePendingFocus();
    this.#updatePosition();
    if (this.#fetchAfterRender) {
      this.#fetchAfterRender = false;
      this.fetchVisiblePages();
    }
  }

  disconnect() {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#cancelFrame();
    this.#fetchAfterRender = false;
    if (this.#resizeTimer) clearTimeout(this.#resizeTimer);
    this.#resizeTimer = null;
    this.#pagination?.disconnect();

    // Turbo snapshots restart from the server-rendered seed. A partial cache
    // cannot seed a fresh cursor session because it may contain disjoint ranges.
    let rows = this.#initialCursorRows || (this.#pagination ? this.#pagination.getCachedRows() : this.#rows);
    if (this.#initialCursorRows) {
      if (this.#scroll) this.#scroll.scrollTop = 0;
      this.#grid.dataset.pvcDataGridLoadedCount = String(rows.length);
      const total = this.#grid.dataset.pvcDataGridNextCursor ? this.#knownTotal : rows.length;
      this.#grid.setAttribute("aria-rowcount", total === null ? "-1" : String(total + 1));
      const spacer = this.#viewport.querySelector(".pvc-data-grid__spacer");
      if (spacer) spacer.style.height = `${rows.length * this.#rowHeight}px`;
    }
    if (!rows) return;
    if (rows.length === 0 && this.#pagination) rows = Array.from(this.#viewport.querySelectorAll('[role="row"]'));
    this.#columnWindow.restore(this.#headerRow());
    const fragment = document.createDocumentFragment();
    rows.forEach((row) => {
      this.#columnWindow.restore(row);
      fragment.appendChild(row);
    });
    this.#viewport.querySelectorAll('[role="row"]').forEach((row) => row.remove());
    this.#viewport.appendChild(fragment);
    this.#element.removeAttribute("data-virtual-ready");
  }

  #invalidateCells() {
    this.#cells = null;
    this.#onCellsChanged();
  }

  #cancelFrame() {
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#frame = null;
  }

  #scheduleRender(fetchPages = false) {
    this.#fetchAfterRender ||= fetchPages;
    if (this.#frame) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = null;
      try {
        this.render();
      } catch (error) {
        this.#onError(error);
      }
    });
  }

  #updateRowCount() {
    if (this.cursorMode) {
      this.#grid.setAttribute("aria-rowcount", this.totalCount === null ? "-1" : String(this.totalCount + 1));
      this.#grid.dataset.pvcDataGridLoadedCount = String(this.totalRows);
    }
  }

  #updatePosition() {
    const start = Math.min(this.totalRows, Math.floor((this.#scroll?.scrollTop || 0) / this.#rowHeight) + 1);
    const height = this.#scroll?.clientHeight || window.innerHeight;
    const headerHeight = this.#headerRow()?.offsetHeight || 0;
    const end = Math.max(start, Math.ceil(((this.#scroll?.scrollTop || 0) + height - headerHeight) / this.#rowHeight));
    this.#onPositionChanged({
      start,
      end: Math.min(this.totalRows, end),
      count: this.totalRows,
      total: this.totalCount,
    });
  }

  #resizeSpacer() {
    const spacer = this.#viewport.querySelector(".pvc-data-grid__spacer");
    if (spacer) spacer.style.height = `${this.totalRows * this.#rowHeight}px`;
  }

  #headerRow() {
    return this.#grid.querySelector('.pvc-data-grid__row--header[role="row"]');
  }

  #columnRange() {
    const { widths, offsets, pinnedCount, overscan } = this.#columns;
    if (!this.#scroll || widths.length === 0 || pinnedCount >= widths.length) return null;
    return computeVisibleColumnRange({
      scrollLeft: this.#scroll.scrollLeft,
      viewportWidth: this.#scroll.clientWidth || window.innerWidth,
      columnWidths: widths,
      columnOffsets: offsets,
      pinnedCount,
      pinnedWidth: this.pinnedWidth,
      overscan,
    });
  }

  #readColumns() {
    const data = this.#grid.dataset;
    let widths = (data.pvcDataGridColumnWidths || "")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (widths.length === 0) {
      const lastColumn = this.#cells.reduce((max, cell) => Math.max(max, columnIndexOf(cell) ?? -1), -1);
      widths = Array.from({ length: lastColumn + 1 }, () => 120);
    }
    const pinned = Number.parseInt(data.pvcDataGridPinnedCount || "0", 10);
    const pinnedCount = Number.isFinite(pinned) ? Math.max(0, Math.min(widths.length, pinned)) : 0;
    const overscan = Number.parseInt(data.pvcDataGridColumnOverscan || "", 10);
    const rowOverscan = Number.parseInt(data.pvcDataGridRowOverscan || "", 10);
    const rowHeight = Number.parseFloat(data.pvcDataGridRowHeight || "");
    if (Number.isFinite(rowHeight) && rowHeight > 0) this.#rowHeight = rowHeight;
    if (Number.isFinite(rowOverscan) && rowOverscan >= 0) this.#rowOverscan = rowOverscan;
    let offset = 0;
    const offsets = widths.map((width) => {
      const start = offset;
      offset += width;
      return start;
    });
    this.#columns = {
      widths,
      offsets,
      pinnedCount,
      pinnedWidth: offsets[pinnedCount] ?? offset,
      overscan: Number.isFinite(overscan) && overscan >= 0 ? overscan : 2,
    };
  }
}
