import { Controller } from "@hotwired/stimulus";

import {
  buildCellMap,
  columnIndexOf,
  firstDataCell,
  nextCellForKey,
  rowIndexOf,
} from "pathogen_view_components/data_grid_controller/navigation";

import { ensureCellFullyVisible } from "pathogen_view_components/data_grid_controller/scroll";

import {
  activateInteractiveElement,
  focusInteractiveElement,
  handleInteractiveKeydown,
  hasInteractiveElements,
  resolveInteractiveTarget,
} from "pathogen_view_components/data_grid_controller/widget_mode";

import {
  computeVisibleColumnRange,
  computeVisibleRange,
  measureRowHeight,
  scrollLeftForColumn,
  scrollTopForRow,
} from "pathogen_view_components/data_grid_controller/virtualizer";

const CELL_SELECTOR = '[data-pathogen--data-grid-target~="cell"]';
const ACTIVE_CELL_SELECTOR = `${CELL_SELECTOR}[data-pathogen--data-grid-active="true"]`;
const FOCUSABLE_CELL_SELECTOR = `${CELL_SELECTOR}[tabindex="0"]`;

const NAVIGATION_KEYS = new Set([
  "ArrowRight",
  "ArrowLeft",
  "ArrowDown",
  "ArrowUp",
  "Home",
  "End",
  "PageDown",
  "PageUp",
]);

const ENTER_WIDGET_MODE_KEYS = new Set(["Enter", "F2"]);
const GRID_EDGE_SHORTCUT_KEYS = new Set(["Home", "End"]);
const RESIZE_DEBOUNCE_MS = 120;
const DEFAULT_VIRTUAL_COLUMN_OVERSCAN = 2;
const DEFAULT_VIRTUAL_COLUMN_WIDTH = 120;

export default class extends Controller {
  static targets = [
    "cell",
    "grid",
    "scrollContainer",
    "viewport",
    "scrollHint",
    "virtualStatus",
    "errorState",
    "errorMessage",
  ];
  #abortController = null;
  // Tracks the previously-active cell so #setActiveCell only touches two cells per call.
  #lastActiveCell = null;

  // Virtual mode state
  #allRowElements = null; // Detached row elements (only in virtual mode)
  #rowHeight = 0;
  #visibleStartIndex = -1;
  #visibleEndIndex = -1;
  #visibleColumnStartIndex = -1;
  #visibleColumnEndIndex = -1;
  #rafId = null;
  #resizeTimerId = null;
  #virtualColumnWidths = [];
  #virtualColumnOffsets = [];
  #virtualPinnedCount = 0;
  #virtualPinnedWidth = 0;
  #virtualColumnOverscan = DEFAULT_VIRTUAL_COLUMN_OVERSCAN;
  #virtualAllCells = null;
  #centerLaneCellCache = new WeakMap();

  // Cell caches for keyboard hot paths
  #allCellsCache = null;
  #cellSetCache = null;
  #cellIndexCache = new WeakMap();
  #coordinateCellCache = null;
  #navigationCellMapCache = null;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  connect() {
    this.#abortController?.abort();
    this.#abortController = new AbortController();
    this.#bindEvents(this.#abortController.signal);
    this.#hideErrorState();

    try {
      if (this.#isVirtual()) {
        this.#initVirtualMode();
      }

      this.#syncScrollAffordance();
    } catch (error) {
      this.#reportError(error);
    }
  }

  disconnect() {
    this.#abortController?.abort();
    this.#abortController = null;
    if (this.#rafId) cancelAnimationFrame(this.#rafId);
    this.#rafId = null;
    if (this.#resizeTimerId) clearTimeout(this.#resizeTimerId);
    this.#resizeTimerId = null;
    this.#allRowElements = null;
    this.#virtualAllCells = null;
    this.#virtualColumnWidths = [];
    this.#virtualColumnOffsets = [];
    this.#virtualPinnedCount = 0;
    this.#virtualPinnedWidth = 0;
    this.#virtualColumnOverscan = DEFAULT_VIRTUAL_COLUMN_OVERSCAN;
    this.#visibleColumnStartIndex = -1;
    this.#visibleColumnEndIndex = -1;
    this.#centerLaneCellCache = new WeakMap();
    this.#invalidateCellCaches();
    this.element.removeAttribute("data-virtual-ready");
  }

  // Stimulus target callbacks — invalidate caches when Turbo morphs or
  // reconnects modify the cell set underneath us.
  cellTargetConnected() {
    this.#invalidateCellCaches();
  }

  cellTargetDisconnected() {
    this.#invalidateCellCaches();
  }

  // ── DOM event handlers ────────────────────────────────────────────────────

  handleFocusin(event) {
    const cell = this.#resolveCell(event.target);
    if (!cell) return;

    this.#setActiveCell(cell);

    const interactiveTarget = resolveInteractiveTarget(event.target, cell);
    if (interactiveTarget) {
      activateInteractiveElement(cell, interactiveTarget);
    }
  }

  handleClick(event) {
    const cell = this.#resolveCell(event.target);
    if (!cell) return;

    const interactiveTarget = resolveInteractiveTarget(event.target, cell);
    if (interactiveTarget) {
      this.#setActiveCell(cell);
      activateInteractiveElement(cell, interactiveTarget);
      return;
    }

    // Prevent default to avoid text-selection flicker when clicking to focus a plain cell.
    event.preventDefault();
    this.#focusCell(cell);
  }

  handleKeydown(event) {
    if (!this.hasGridTarget) return;

    const activeCell = this.#activeCell();
    if (!activeCell) return;

    if (event.defaultPrevented) return;

    const isInteractiveTarget = resolveInteractiveTarget(event.target, activeCell) !== null;
    const isGridEdge = (event.ctrlKey || event.metaKey) && GRID_EDGE_SHORTCUT_KEYS.has(event.key);

    if (isInteractiveTarget && !isGridEdge) {
      handleInteractiveKeydown(event, activeCell, {
        exitWidgetMode: (cell) => this.#focusCell(cell),
        moveToInteractiveCell: (cell, direction) => this.#focusAdjacentInteractiveCell(cell, direction),
      });
      return;
    }

    if (hasInteractiveElements(activeCell) && ENTER_WIDGET_MODE_KEYS.has(event.key)) {
      event.preventDefault();
      focusInteractiveElement(activeCell, null, (cell) => this.#scrollCellIntoView(cell));
      return;
    }

    if (!NAVIGATION_KEYS.has(event.key)) return;

    const map = this.#navigationCellMap();
    const nextCell = nextCellForKey(activeCell, event, map, this.#pageSize());
    if (!nextCell) return;

    event.preventDefault();
    this.#focusCell(nextCell);

    // ctrl+Home: snap scroll to origin so the top-left corner is fully visible.
    // ensureCellFullyVisible skips sticky cells (they appear always visible),
    // so we must reset both axes explicitly.
    if ((event.ctrlKey || event.metaKey) && event.key === "Home" && this.hasScrollContainerTarget) {
      this.scrollContainerTarget.scrollTop = 0;
      this.scrollContainerTarget.scrollLeft = 0;
    }
  }

  handleErrorEvent(event) {
    const detail = event instanceof CustomEvent ? event.detail : null;
    const message =
      typeof detail?.message === "string" && detail.message.trim().length > 0 ? detail.message.trim() : null;
    this.#showErrorState(message);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  #activeCell() {
    if (!this.hasGridTarget) return null;

    if (this.#lastActiveCell && this.#hasCachedCell(this.#lastActiveCell)) return this.#lastActiveCell;

    const cells = this.#allCells();
    const fromFocused = this.#resolveCell(document.activeElement);
    if (fromFocused && this.#hasCachedCell(fromFocused)) {
      const rowIndex = rowIndexOf(fromFocused);
      const columnIndex = columnIndexOf(fromFocused);
      if (rowIndex !== null && columnIndex !== null) {
        const mappedCell = this.#cellByCoordinate(rowIndex, columnIndex);
        return mappedCell || fromFocused;
      }
      return fromFocused;
    }

    return (
      cells.find((cell) => cell.matches(ACTIVE_CELL_SELECTOR)) ||
      cells.find((cell) => cell.matches(FOCUSABLE_CELL_SELECTOR)) ||
      firstDataCell(cells)
    );
  }

  #allCells() {
    if (this.#allCellsCache) return this.#allCellsCache;

    let cells;
    if (this.#isVirtual() && this.#virtualAllCells) {
      const domCells = this.hasCellTarget ? [...this.cellTargets] : [];
      const domCellSet = new Set(domCells);
      const virtualCells = this.#virtualAllCells.filter((cell) => !domCellSet.has(cell));
      cells = [...domCells, ...virtualCells];
    } else if (this.#isVirtual() && this.#allRowElements) {
      // In virtual mode, include cells from ALL rows (including detached ones)
      // so navigation can operate on the full virtual coordinate space.
      const domCells = this.hasCellTarget ? [...this.cellTargets] : [];
      const domCellSet = new Set(domCells);
      const virtualCells = [];
      this.#allRowElements.forEach((row) => {
        row.querySelectorAll(CELL_SELECTOR).forEach((cell) => {
          if (!domCellSet.has(cell)) virtualCells.push(cell);
        });
      });
      cells = [...domCells, ...virtualCells];
    } else {
      cells = this.hasCellTarget ? [...this.cellTargets] : [];
    }

    this.#primeCellCaches(cells);
    return cells;
  }

  #focusCell(cell) {
    let targetCell = cell;
    const rowIndex = rowIndexOf(cell);
    const columnIndex = columnIndexOf(cell);

    if (this.#isVirtual()) {
      // In virtual mode, reveal target logical coordinates before focusing.
      const virtualRowIndex = rowIndex === null ? null : rowIndex - 1;
      this.#ensureVirtualRowVisible(virtualRowIndex, columnIndex);

      if (rowIndex !== null && columnIndex !== null) {
        const mappedCell = this.#cellByCoordinate(rowIndex, columnIndex);
        if (mappedCell) targetCell = mappedCell;
      }
    }

    if (!targetCell.isConnected) return;

    this.#setActiveCell(targetCell);
    targetCell.focus({ preventScroll: true });
    this.#scrollCellIntoView(targetCell);
  }

  #scrollCellIntoView(cell) {
    ensureCellFullyVisible(
      cell,
      this.hasScrollContainerTarget ? this.scrollContainerTarget : null,
      this.hasGridTarget ? this.gridTarget : null,
      {
        pinnedWidth: this.#isVirtual() ? this.#virtualPinnedWidth : null,
      },
    );
  }

  #focusAdjacentInteractiveCell(cell, direction) {
    const cells = this.#allCells();
    const startIndex = this.#cellIndex(cell);
    if (startIndex === -1) return false;

    let index = startIndex + direction;
    while (index >= 0 && index < cells.length) {
      const candidate = cells[index];
      if (hasInteractiveElements(candidate)) {
        this.#setActiveCell(candidate);
        focusInteractiveElement(
          candidate,
          direction < 0 ? this.#lastInteractiveElement(candidate) : null,
          (activeCandidate) => this.#scrollCellIntoView(activeCandidate),
        );
        return true;
      }
      index += direction;
    }

    return false;
  }

  #pageSize() {
    const rowHeight = this.#isVirtual()
      ? this.#rowHeight || 40
      : this.gridTarget.querySelector("tbody tr")?.offsetHeight || 1;

    if (
      this.hasScrollContainerTarget &&
      this.scrollContainerTarget.clientHeight !== this.scrollContainerTarget.scrollHeight
    ) {
      return Math.max(1, Math.floor(this.scrollContainerTarget.clientHeight / rowHeight));
    }

    return Math.max(1, Math.floor(window.innerHeight / rowHeight));
  }

  #resolveCell(target) {
    if (!(target instanceof HTMLElement)) return null;
    return target.closest(CELL_SELECTOR);
  }

  #setActiveCell(cell) {
    if (this.#lastActiveCell === null) {
      // First call: normalize server-rendered initial state.
      // In virtual mode, only sweep DOM-connected cells to avoid touching
      // every detached row element (can be thousands in large datasets).
      const targets = this.#isVirtual() && this.hasCellTarget ? this.cellTargets : this.#allCells();
      targets.forEach((node) => {
        node.removeAttribute("data-pathogen--data-grid-active");
        node.tabIndex = -1;
        node.querySelectorAll("a, button, input, select, textarea").forEach((el) => {
          el.tabIndex = -1;
        });
      });
    } else if (this.#lastActiveCell !== cell) {
      // Different cell: deactivate only the previous one (O(1)).
      const prev = this.#lastActiveCell;
      prev.removeAttribute("data-pathogen--data-grid-active");
      prev.tabIndex = -1;
      prev.querySelectorAll("a, button, input, select, textarea").forEach((el) => {
        el.tabIndex = -1;
      });
    }

    // Always reset the active cell — handles both navigation and widget-mode exit.
    cell.tabIndex = 0;
    cell.querySelectorAll("a, button, input, select, textarea").forEach((el) => {
      el.tabIndex = -1;
    });
    cell.setAttribute("data-pathogen--data-grid-active", "true");
    this.#lastActiveCell = cell;
  }

  #primeCellCaches(cells) {
    this.#allCellsCache = cells;
    this.#cellSetCache = new Set(cells);
    this.#coordinateCellCache = new Map();
    this.#navigationCellMapCache = buildCellMap(cells);
    this.#cellIndexCache = new WeakMap();

    cells.forEach((cell, index) => {
      this.#cellIndexCache.set(cell, index);

      const rowIndex = rowIndexOf(cell);
      const columnIndex = columnIndexOf(cell);
      if (rowIndex === null || columnIndex === null) return;

      this.#coordinateCellCache.set(`${rowIndex}:${columnIndex}`, cell);
    });
  }

  #invalidateCellCaches() {
    this.#allCellsCache = null;
    this.#cellSetCache = null;
    this.#coordinateCellCache = null;
    this.#navigationCellMapCache = null;
    this.#cellIndexCache = new WeakMap();
  }

  #navigationCellMap() {
    if (this.#navigationCellMapCache) return this.#navigationCellMapCache;

    this.#allCells();
    return this.#navigationCellMapCache || new Map();
  }

  #hasCachedCell(cell) {
    if (!this.#cellSetCache) this.#allCells();
    return this.#cellSetCache ? this.#cellSetCache.has(cell) : false;
  }

  #cellByCoordinate(rowIndex, columnIndex) {
    if (!this.#coordinateCellCache) this.#allCells();
    if (!this.#coordinateCellCache) return null;
    return this.#coordinateCellCache.get(`${rowIndex}:${columnIndex}`) || null;
  }

  #cellIndex(cell) {
    if (this.#cellIndexCache.has(cell)) return this.#cellIndexCache.get(cell);

    this.#allCells();
    return this.#cellIndexCache.has(cell) ? this.#cellIndexCache.get(cell) : -1;
  }

  #lastInteractiveElement(cell) {
    const interactiveElements = cell.querySelectorAll("a, button, input, select, textarea");
    return interactiveElements[interactiveElements.length - 1] || null;
  }

  #bindEvents(signal) {
    this.element.addEventListener("keydown", (event) => this.handleKeydown(event), {
      signal,
      capture: true,
    });

    this.element.addEventListener("focusin", (event) => this.handleFocusin(event), {
      signal,
    });

    this.element.addEventListener("click", (event) => this.handleClick(event), {
      signal,
    });

    this.element.addEventListener("pathogen:data-grid:error", (event) => this.handleErrorEvent(event), {
      signal,
    });

    this.element.addEventListener("pathogen:data-grid:clear-error", () => this.#hideErrorState(), {
      signal,
    });

    if (this.hasScrollContainerTarget) {
      this.scrollContainerTarget.addEventListener("scroll", () => this.#syncScrollAffordance(), {
        signal,
        passive: true,
      });
    }

    window.addEventListener("resize", () => this.#syncScrollAffordance(), {
      signal,
      passive: true,
    });
  }

  // ── Virtual mode ────────────────────────────────────────────────────────

  #isVirtual() {
    return this.hasViewportTarget;
  }

  #initVirtualMode() {
    const loadingText = this.#virtualStatusMessage(
      "loadingText",
      this.virtualStatusTarget?.textContent?.trim() || null,
    );
    const loadedText = this.#virtualStatusMessage("loadedText", null);

    if (this.hasGridTarget) {
      this.gridTarget.setAttribute("aria-busy", "true");
    }
    if (this.hasVirtualStatusTarget && loadingText) {
      this.virtualStatusTarget.textContent = loadingText;
    }

    const viewport = this.viewportTarget;
    const spacer = viewport.querySelector(".pathogen-data-grid__spacer");

    // Collect all body rows (skip the spacer)
    const rows = Array.from(viewport.querySelectorAll('[role="row"]'));
    this.#allRowElements = rows;
    this.#virtualAllCells = this.hasGridTarget ? Array.from(this.gridTarget.querySelectorAll(CELL_SELECTOR)) : null;
    this.#readVirtualColumnContract();
    this.#invalidateCellCaches();

    // Measure row height from the first rendered row
    this.#rowHeight = measureRowHeight(viewport);

    // Set spacer to represent total content height
    const totalHeight = rows.length * this.#rowHeight;
    if (spacer) spacer.style.height = `${totalHeight}px`;

    // Detach all rows — we'll render only the visible range
    rows.forEach((row) => row.remove());

    // Render initial visible range
    this.#renderVisibleRows();

    // Reveal viewport now that only visible rows are in the DOM (prevents FOUC)
    this.element.setAttribute("data-virtual-ready", "");
    if (this.hasGridTarget) {
      this.gridTarget.setAttribute("aria-busy", "false");
    }
    if (this.hasVirtualStatusTarget && loadedText) {
      this.virtualStatusTarget.textContent = loadedText;
    }

    // Listen for scroll on the scroll container
    if (this.hasScrollContainerTarget) {
      this.scrollContainerTarget.addEventListener("scroll", () => this.#onScroll(), {
        signal: this.#abortController.signal,
        passive: true,
      });
    }

    window.addEventListener("resize", () => this.#onResize(), {
      signal: this.#abortController.signal,
      passive: true,
    });
  }

  #onScroll() {
    this.#syncScrollAffordance();
    this.#scheduleVirtualRender();
  }

  #onResize() {
    if (this.#resizeTimerId) clearTimeout(this.#resizeTimerId);
    this.#resizeTimerId = setTimeout(() => {
      this.#resizeTimerId = null;
      this.#refreshVirtualMeasurements();
      this.#syncScrollAffordance();
      this.#scheduleVirtualRender();
    }, RESIZE_DEBOUNCE_MS);
  }

  #scheduleVirtualRender() {
    if (this.#rafId) return;
    this.#rafId = requestAnimationFrame(() => {
      this.#rafId = null;
      try {
        this.#renderVisibleRows();
      } catch (error) {
        this.#reportError(error);
      }
    });
  }

  #refreshVirtualMeasurements() {
    if (!this.#allRowElements) return;

    this.#rowHeight = measureRowHeight(this.viewportTarget) || this.#rowHeight;

    const spacer = this.viewportTarget.querySelector(".pathogen-data-grid__spacer");
    if (spacer) {
      spacer.style.height = `${this.#allRowElements.length * this.#rowHeight}px`;
    }

    // Force re-render after resize even if indices did not change.
    this.#visibleStartIndex = -1;
    this.#visibleEndIndex = -1;
    this.#visibleColumnStartIndex = -1;
    this.#visibleColumnEndIndex = -1;
  }

  #renderVisibleRows() {
    if (!this.#allRowElements) return;

    const scrollTop = this.hasScrollContainerTarget ? this.scrollContainerTarget.scrollTop : 0;
    const containerHeight = this.hasScrollContainerTarget ? this.scrollContainerTarget.clientHeight : 0;
    const viewportHeight = containerHeight > 0 ? containerHeight : window.innerHeight;
    const columnRange = this.#computeVisibleColumnRange();

    const { startIndex, endIndex } = computeVisibleRange({
      scrollTop,
      viewportHeight,
      rowHeight: this.#rowHeight,
      totalRows: this.#allRowElements.length,
    });

    const rowRangeUnchanged = startIndex === this.#visibleStartIndex && endIndex === this.#visibleEndIndex;
    const columnRangeUnchanged =
      (columnRange === null && this.#visibleColumnStartIndex === -1 && this.#visibleColumnEndIndex === -1) ||
      (columnRange !== null &&
        columnRange.startIndex === this.#visibleColumnStartIndex &&
        columnRange.endIndex === this.#visibleColumnEndIndex);
    if (rowRangeUnchanged && columnRangeUnchanged) return;

    this.#visibleStartIndex = startIndex;
    this.#visibleEndIndex = endIndex;
    this.#visibleColumnStartIndex = columnRange ? columnRange.startIndex : -1;
    this.#visibleColumnEndIndex = columnRange ? columnRange.endIndex : -1;

    const viewport = this.viewportTarget;
    const spacer = viewport.querySelector(".pathogen-data-grid__spacer");

    // Preserve logical focus coordinates across virtual re-renders.
    // If widget mode was active, restore focus to the owning cell so Enter/F2 is
    // required to re-enter widget mode after a render boundary.
    const focusedCell = this.#resolveCell(document.activeElement);
    const focusedRowIndex = focusedCell ? rowIndexOf(focusedCell) : null;
    const focusedColumnIndex = focusedCell ? columnIndexOf(focusedCell) : null;
    const shouldRestoreCellFocus = focusedRowIndex !== null && focusedColumnIndex !== null;

    // Remove current body rows (keep the spacer)
    const currentRows = viewport.querySelectorAll('[role="row"]');
    currentRows.forEach((row) => row.remove());

    // Insert visible rows after the spacer, positioned absolutely at their virtual coordinate
    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
      const row = this.#allRowElements[i];
      row.style.top = `${i * this.#rowHeight}px`;
      this.#applyCenterColumnWindow(row, columnRange);
      fragment.appendChild(row);
    }

    if (spacer) {
      spacer.after(fragment);
    } else {
      viewport.appendChild(fragment);
    }

    this.#applyCenterColumnWindow(this.#virtualHeaderRow(), columnRange);

    if (shouldRestoreCellFocus) {
      const mappedCell = this.#cellByCoordinate(focusedRowIndex, focusedColumnIndex);
      if (mappedCell && mappedCell.isConnected) {
        this.#setActiveCell(mappedCell);
        mappedCell.focus({ preventScroll: true });
      }
    }

    // Cell caches built from #allRowElements cover all rows (in- and out-of-DOM)
    // and remain valid across window slides — no invalidation needed here.
  }

  /**
   * Ensures a virtual cell's logical row/column are rendered before focusing.
   * @param {number|null} rowIndex - 0-based virtual row index
   * @param {number|null} columnIndex - absolute logical column index
   */
  #ensureVirtualRowVisible(rowIndex, columnIndex = null) {
    if (!this.#isVirtual() || !this.#allRowElements) return;

    const scrollContainer = this.hasScrollContainerTarget ? this.scrollContainerTarget : null;
    if (!scrollContainer) return;

    let didAdjustScroll = false;

    if (typeof rowIndex === "number" && rowIndex >= 0) {
      const newScrollTop = scrollTopForRow({
        rowIndex,
        scrollTop: scrollContainer.scrollTop,
        viewportHeight: scrollContainer.clientHeight,
        rowHeight: this.#rowHeight,
      });

      if (newScrollTop !== null) {
        scrollContainer.scrollTop = newScrollTop;
        didAdjustScroll = true;
      }
    }

    if (
      columnIndex !== null &&
      columnIndex >= this.#virtualPinnedCount &&
      this.#virtualColumnWidths.length > 0 &&
      this.#virtualColumnOffsets.length === this.#virtualColumnWidths.length
    ) {
      const newScrollLeft = scrollLeftForColumn({
        columnIndex,
        scrollLeft: scrollContainer.scrollLeft,
        viewportWidth: scrollContainer.clientWidth,
        pinnedWidth: this.#virtualPinnedWidth,
        columnOffsets: this.#virtualColumnOffsets,
        columnWidths: this.#virtualColumnWidths,
      });

      if (newScrollLeft !== null) {
        scrollContainer.scrollLeft = newScrollLeft;
        didAdjustScroll = true;
      }
    }

    const rowRendered =
      rowIndex === null || rowIndex < 0 || (rowIndex >= this.#visibleStartIndex && rowIndex < this.#visibleEndIndex);
    const columnRendered = this.#isColumnRendered(columnIndex);

    // Synchronize render before focus if a scroll move happened or target coords are not mounted.
    if (didAdjustScroll || !rowRendered || !columnRendered) {
      if (this.#rafId) {
        cancelAnimationFrame(this.#rafId);
        this.#rafId = null;
      }
      try {
        this.#renderVisibleRows();
      } catch (error) {
        this.#reportError(error);
      }
    }
  }

  #readVirtualColumnContract() {
    if (!this.hasGridTarget) return;

    const widthsValue = this.gridTarget.dataset.pathogenDataGridColumnWidths || "";
    let widths = widthsValue
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (widths.length === 0 && this.#virtualAllCells) {
      const maxColumnIndex = this.#virtualAllCells.reduce((maxIndex, cell) => {
        const columnIndex = columnIndexOf(cell);
        return columnIndex === null ? maxIndex : Math.max(maxIndex, columnIndex);
      }, -1);
      if (maxColumnIndex >= 0) {
        widths = Array.from({ length: maxColumnIndex + 1 }, () => DEFAULT_VIRTUAL_COLUMN_WIDTH);
      }
    }

    this.#virtualColumnWidths = widths;

    const totalColumns = this.#virtualColumnWidths.length;
    const pinnedCountValue = Number.parseInt(this.gridTarget.dataset.pathogenDataGridPinnedCount || "0", 10);
    this.#virtualPinnedCount =
      Number.isFinite(pinnedCountValue) && totalColumns > 0 ? Math.max(0, Math.min(totalColumns, pinnedCountValue)) : 0;

    const overscanValue = Number.parseInt(this.gridTarget.dataset.pathogenDataGridColumnOverscan || "", 10);
    this.#virtualColumnOverscan =
      Number.isFinite(overscanValue) && overscanValue >= 0 ? overscanValue : DEFAULT_VIRTUAL_COLUMN_OVERSCAN;

    this.#virtualColumnOffsets = [];
    let runningOffset = 0;
    this.#virtualColumnWidths.forEach((width) => {
      this.#virtualColumnOffsets.push(runningOffset);
      runningOffset += width;
    });

    this.#virtualPinnedWidth = this.#virtualColumnWidths
      .slice(0, this.#virtualPinnedCount)
      .reduce((sum, width) => sum + width, 0);
  }

  #computeVisibleColumnRange() {
    if (
      !this.hasScrollContainerTarget ||
      this.#virtualColumnWidths.length === 0 ||
      this.#virtualPinnedCount >= this.#virtualColumnWidths.length
    ) {
      return null;
    }

    const viewportWidth =
      this.scrollContainerTarget.clientWidth > 0 ? this.scrollContainerTarget.clientWidth : window.innerWidth;
    return computeVisibleColumnRange({
      scrollLeft: this.scrollContainerTarget.scrollLeft,
      viewportWidth,
      columnWidths: this.#virtualColumnWidths,
      pinnedCount: this.#virtualPinnedCount,
      overscan: this.#virtualColumnOverscan,
    });
  }

  #isColumnRendered(columnIndex) {
    if (columnIndex === null || columnIndex < this.#virtualPinnedCount) return true;
    if (this.#visibleColumnStartIndex === -1 && this.#visibleColumnEndIndex === -1) return true;

    return columnIndex >= this.#visibleColumnStartIndex && columnIndex < this.#visibleColumnEndIndex;
  }

  #virtualHeaderRow() {
    if (!this.hasGridTarget) return null;
    return this.gridTarget.querySelector('.pathogen-data-grid__row--header[role="row"]');
  }

  #centerLaneCells(centerLane) {
    if (!centerLane) return [];

    const cachedCells = this.#centerLaneCellCache.get(centerLane);
    if (cachedCells) return cachedCells;

    const cells = Array.from(centerLane.querySelectorAll(CELL_SELECTOR));
    this.#centerLaneCellCache.set(centerLane, cells);
    return cells;
  }

  #applyCenterColumnWindow(row, columnRange) {
    if (!row || !columnRange) return;

    const centerLane = row.querySelector('[data-pathogen-data-grid-lane="center"]');
    if (!centerLane) return;

    const allCenterCells = this.#centerLaneCells(centerLane);
    if (allCenterCells.length === 0) return;

    const visibleCells = allCenterCells.filter((cell) => {
      const columnIndex = columnIndexOf(cell);
      if (columnIndex === null) return false;
      return columnIndex >= columnRange.startIndex && columnIndex < columnRange.endIndex;
    });

    centerLane.replaceChildren(...visibleCells);
  }

  #syncScrollAffordance() {
    if (!this.hasScrollContainerTarget) return;

    const scrollContainer = this.scrollContainerTarget;
    const horizontalOverflow = scrollContainer.scrollWidth - scrollContainer.clientWidth > 1;

    if (!horizontalOverflow) {
      delete this.element.dataset.pathogenDataGridOverflowing;
      delete this.element.dataset.pathogenDataGridScrollPosition;
      if (this.hasScrollHintTarget) this.scrollHintTarget.hidden = true;
      return;
    }

    this.element.dataset.pathogenDataGridOverflowing = "true";

    const atStart = scrollContainer.scrollLeft <= 1;
    const atEnd = scrollContainer.scrollLeft + scrollContainer.clientWidth >= scrollContainer.scrollWidth - 1;
    this.element.dataset.pathogenDataGridScrollPosition = atStart ? "start" : atEnd ? "end" : "middle";

    if (this.hasScrollHintTarget) this.scrollHintTarget.hidden = !atStart;
  }

  #virtualStatusMessage(datasetKey, fallback = null) {
    if (!this.hasVirtualStatusTarget) return fallback;

    const datasetValue = this.virtualStatusTarget.dataset[datasetKey];
    if (typeof datasetValue === "string" && datasetValue.trim().length > 0) {
      return datasetValue;
    }

    return fallback;
  }

  #errorStateMessage(fallback = null) {
    if (!this.hasErrorStateTarget) return fallback;

    const datasetValue = this.errorStateTarget.dataset.defaultMessage;
    if (typeof datasetValue === "string" && datasetValue.trim().length > 0) {
      return datasetValue;
    }

    return fallback;
  }

  #showErrorState(message = null) {
    if (!this.hasErrorStateTarget) return;

    const resolvedMessage =
      typeof message === "string" && message.trim().length > 0 ? message.trim() : this.#errorStateMessage(null);

    if (resolvedMessage && this.hasErrorMessageTarget) {
      this.errorMessageTarget.textContent = resolvedMessage;
    }

    if (this.hasGridTarget) {
      this.gridTarget.setAttribute("aria-busy", "false");
    }

    this.element.dataset.pathogenDataGridState = "error";
    this.errorStateTarget.hidden = false;
  }

  #hideErrorState() {
    if (!this.hasErrorStateTarget) return;

    delete this.element.dataset.pathogenDataGridState;
    this.errorStateTarget.hidden = true;

    const defaultMessage = this.#errorStateMessage(null);
    if (defaultMessage && this.hasErrorMessageTarget) {
      this.errorMessageTarget.textContent = defaultMessage;
    }
  }

  #reportError(error) {
    console.error("[pathogen--data-grid] Runtime error", error);

    this.element.dispatchEvent(
      new CustomEvent("pathogen:data-grid:error", {
        bubbles: true,
        detail: {
          message: this.#errorStateMessage("Something went wrong while rendering this grid. Refresh or try again."),
        },
      }),
    );
  }
}
