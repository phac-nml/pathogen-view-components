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

import { computeVisibleColumnRange, measureRowHeight } from "pathogen_view_components/data_grid_controller/virtualizer";

import {
  buildPaginationMode,
  cachedVirtualCells,
  paginationContract,
  setPaginationBusy,
} from "pathogen_view_components/data_grid_controller/pagination_mode";
import { CenterColumnWindow } from "pathogen_view_components/data_grid_controller/virtual_columns";
import {
  ensureVirtualCellVisible,
  renderVirtualWindow,
} from "pathogen_view_components/data_grid_controller/virtual_window";

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
const DEFAULT_VIRTUAL_ROW_HEIGHT = 40;
const DEFAULT_VIRTUAL_ROW_OVERSCAN = 10;
const DEFAULT_VIRTUAL_PAGE_SIZE = 20;

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
  #virtualRowOverscan = DEFAULT_VIRTUAL_ROW_OVERSCAN;
  #virtualAllCells = null;
  #centerColumnWindow = new CenterColumnWindow({
    pinnedCount: () => this.#virtualPinnedCount,
    cellSelector: CELL_SELECTOR,
  });

  #virtualRows = null;

  #pagination = null;

  #allCellsCache = null;
  #cellSetCache = null;
  #cellIndexCache = new WeakMap();
  #coordinateCellCache = null;
  #navigationCellMapCache = null;

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
    this.#virtualRowOverscan = DEFAULT_VIRTUAL_ROW_OVERSCAN;
    this.#visibleColumnStartIndex = -1;
    this.#visibleColumnEndIndex = -1;
    this.#centerColumnWindow.reset();
    this.#virtualRows = null;
    this.#pagination?.disconnect();
    this.#pagination = null;
    this.#invalidateCellCaches();
    this.element.removeAttribute("data-virtual-ready");
  }

  cellTargetConnected() {
    this.#invalidateCellCaches();
  }

  cellTargetDisconnected() {
    this.#invalidateCellCaches();
  }

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
    const nextCell = this.#absoluteVirtualEdgeCell(event) || nextCellForKey(activeCell, event, map, this.#pageSize());
    if (!nextCell) return;

    event.preventDefault();
    this.#focusCell(nextCell);

    if ((event.ctrlKey || event.metaKey) && event.key === "Home" && this.hasScrollContainerTarget) {
      this.scrollContainerTarget.scrollTop = 0;
      this.scrollContainerTarget.scrollLeft = 0;
      if (this.#isVirtual()) {
        this.#visibleStartIndex = -1;
        this.#renderVisibleRows();
        this.#flushPageFetches(this.#visibleStartIndex, this.#visibleEndIndex);
      }
    }
  }

  handleErrorEvent(event) {
    const detail = event instanceof CustomEvent ? event.detail : null;
    const message =
      typeof detail?.message === "string" && detail.message.trim().length > 0 ? detail.message.trim() : null;
    this.#showErrorState(message);
  }

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
    if (this.#isPaginatedVirtual() && this.#pagination) {
      const headerCells = this.hasGridTarget
        ? Array.from(this.gridTarget.querySelectorAll(`${CELL_SELECTOR}[data-pathogen--data-grid-row-index="0"]`))
        : [];
      const cachedBodyCells = cachedVirtualCells({
        grid: null,
        rows: this.#pagination.getCachedRows(),
        cellSelector: CELL_SELECTOR,
      });
      const renderedBodyCells = this.hasViewportTarget
        ? Array.from(this.viewportTarget.querySelectorAll(CELL_SELECTOR))
        : [];
      cells = [...headerCells, ...cachedBodyCells, ...renderedBodyCells];
    } else if (this.#isVirtual() && this.#virtualAllCells) {
      // Virtual mode must use stable logical ordering (row-major across all rows),
      // not current DOM window ordering, so interactive traversal is deterministic.
      cells = [...this.#virtualAllCells];
    } else if (this.#isVirtual() && this.#allRowElements) {
      const headerCells = this.hasGridTarget
        ? Array.from(this.gridTarget.querySelectorAll(`${CELL_SELECTOR}[data-pathogen--data-grid-row-index="0"]`))
        : [];
      const bodyCells = [];
      this.#allRowElements.forEach((row) => {
        row.querySelectorAll(CELL_SELECTOR).forEach((cell) => {
          bodyCells.push(cell);
        });
      });
      cells = [...headerCells, ...bodyCells];
    } else {
      cells = this.hasCellTarget ? [...this.cellTargets] : [];
    }

    this.#primeCellCaches(cells);
    return cells;
  }

  #absoluteVirtualEdgeCell(event) {
    if (!this.#isVirtual() || !(event.ctrlKey || event.metaKey) || event.key !== "End") return null;
    if (!this.#virtualRows || this.#virtualRows.totalRows < 1) return null;

    const rowIndex = this.#virtualRows.totalRows;
    const columnIndex = this.#lastColumnIndex();
    if (columnIndex < 0) return null;

    this.#ensureVirtualRowVisible(rowIndex - 1, columnIndex);
    this.#invalidateCellCaches();

    return (
      this.viewportTarget.querySelector(
        `${CELL_SELECTOR}[data-pathogen--data-grid-row-index="${rowIndex}"][data-pathogen--data-grid-column-index="${columnIndex}"]`,
      ) || this.#cellByCoordinate(rowIndex, columnIndex)
    );
  }

  #lastColumnIndex() {
    if (this.#virtualColumnWidths.length > 0) return this.#virtualColumnWidths.length - 1;

    const ariaColumnCount = Number.parseInt(this.gridTarget?.getAttribute("aria-colcount") || "", 10);
    return Number.isFinite(ariaColumnCount) && ariaColumnCount > 0 ? ariaColumnCount - 1 : -1;
  }

  #focusCell(cell) {
    let targetCell = cell;
    const rowIndex = rowIndexOf(cell);
    const columnIndex = columnIndexOf(cell);

    if (this.#isVirtual()) {
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
        const rowIndex = rowIndexOf(candidate);
        const columnIndex = columnIndexOf(candidate);
        this.#focusCell(candidate);

        let focusCandidate = candidate;
        if (rowIndex !== null && columnIndex !== null) {
          const mappedCell = this.#cellByCoordinate(rowIndex, columnIndex);
          if (mappedCell) focusCandidate = mappedCell;
        }
        if (!focusCandidate.isConnected) {
          index += direction;
          continue;
        }

        focusInteractiveElement(
          focusCandidate,
          direction < 0 ? this.#lastInteractiveElement(focusCandidate) : null,
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

    const hasStickyHeader = this.hasGridTarget && this.gridTarget.querySelector('[role="columnheader"]') !== null;
    const headerAdjustment = hasStickyHeader ? 1 : 0;

    if (
      this.hasScrollContainerTarget &&
      this.scrollContainerTarget.clientHeight !== this.scrollContainerTarget.scrollHeight
    ) {
      return Math.max(1, Math.floor(this.scrollContainerTarget.clientHeight / rowHeight) - headerAdjustment);
    }

    return Math.max(1, Math.floor(window.innerHeight / rowHeight) - headerAdjustment);
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
      const prev = this.#lastActiveCell;
      prev.removeAttribute("data-pathogen--data-grid-active");
      prev.tabIndex = -1;
      prev.querySelectorAll("a, button, input, select, textarea").forEach((el) => {
        el.tabIndex = -1;
      });
    }

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
      const scrollContainer = this.scrollContainerTarget;

      scrollContainer.addEventListener(
        "scroll",
        () => {
          if (this.#isVirtual()) {
            this.#onScroll();
          } else {
            this.#syncScrollAffordance();
          }
        },
        {
          signal,
          passive: true,
        },
      );

      scrollContainer.addEventListener(
        "scrollend",
        () => {
          if (this.#isPaginatedVirtual()) {
            this.#onScrollEnd();
          }
        },
        {
          signal,
          passive: true,
        },
      );
    }

    window.addEventListener(
      "resize",
      () => {
        if (this.#isVirtual()) {
          this.#onResize();
        } else {
          this.#syncScrollAffordance();
        }
      },
      {
        signal,
        passive: true,
      },
    );
  }

  #isVirtual() {
    return this.hasViewportTarget;
  }

  #isPaginatedVirtual() {
    if (!this.hasGridTarget) return false;

    const totalCount = Number.parseInt(this.gridTarget.dataset.pvcDataGridTotalCount || "", 10);
    const rowsUrl = this.gridTarget.dataset.pvcDataGridRowsUrl || "";

    return Number.isFinite(totalCount) && totalCount > 0 && rowsUrl.length > 0;
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
    const spacer = viewport.querySelector(".pvc-data-grid__spacer");

    const rows = Array.from(viewport.querySelectorAll('[role="row"]'));

    if (this.#isPaginatedVirtual()) {
      this.#initPaginatedVirtualMode(rows, spacer, viewport, loadedText);
      return;
    }

    this.#allRowElements = rows;
    this.#virtualRows = {
      totalRows: rows.length,
      rowAt: (index) => this.#allRowElements[index],
    };
    this.#virtualAllCells = this.hasGridTarget ? Array.from(this.gridTarget.querySelectorAll(CELL_SELECTOR)) : null;
    this.#readVirtualColumnContract();
    this.#invalidateCellCaches();

    this.#rowHeight = measureRowHeight(viewport) || this.#rowHeight || DEFAULT_VIRTUAL_ROW_HEIGHT;

    const totalHeight = rows.length * this.#rowHeight;
    if (spacer) spacer.style.height = `${totalHeight}px`;

    rows.forEach((row) => row.remove());

    this.#renderVisibleRows();

    this.#revealVirtualMode(loadedText);
  }

  #initPaginatedVirtualMode(rows, spacer, viewport, loadedText) {
    const contract = paginationContract(this.gridTarget, DEFAULT_VIRTUAL_PAGE_SIZE);
    this.#readVirtualColumnContract();

    const mode = buildPaginationMode({
      rows,
      contract,
      cellSelector: CELL_SELECTOR,
      rowHeight: () => this.#rowHeight,
      visibleRange: () => ({ startIndex: this.#visibleStartIndex, endIndex: this.#visibleEndIndex }),
      onRowsChanged: () => {
        this.#updateVirtualAllCellsFromCache();
        this.#invalidateCellCaches();
      },
      onVisibleRowsChanged: () => {
        this.#visibleStartIndex = -1;
        this.#visibleEndIndex = -1;
        this.#scheduleVirtualRender();
      },
      setBusy: (isBusy) => this.#setPaginationBusy(isBusy),
      handleError: (error) => this.#handlePaginationError(error),
    });
    this.#pagination = mode.pagination;
    this.#allRowElements = null;
    this.#virtualRows = mode.virtualRows;

    this.#rowHeight = measureRowHeight(viewport) || this.#rowHeight || DEFAULT_VIRTUAL_ROW_HEIGHT;
    if (spacer) spacer.style.height = `${contract.totalRows * this.#rowHeight}px`;

    rows.forEach((row) => row.remove());
    this.#updateVirtualAllCellsFromCache();
    this.#invalidateCellCaches();
    this.#renderVisibleRows();
    this.#revealVirtualMode(loadedText);
    this.#flushPageFetches(this.#visibleStartIndex, this.#visibleEndIndex);
  }

  #revealVirtualMode(loadedText) {
    this.element.setAttribute("data-virtual-ready", "");
    if (this.hasGridTarget) {
      this.gridTarget.setAttribute("aria-busy", "false");
    }
    if (this.hasVirtualStatusTarget && loadedText) {
      this.virtualStatusTarget.textContent = loadedText;
    }
  }

  #onScroll() {
    this.#syncScrollAffordance();
    this.#scheduleVirtualRender();

    if (this.#pagination) this.#pagination.handleScroll();
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
    if (!this.#isVirtual()) return;
    if (!this.#isPaginatedVirtual() && !this.#allRowElements) return;

    this.#rowHeight = measureRowHeight(this.viewportTarget) || this.#rowHeight;

    const spacer = this.viewportTarget.querySelector(".pvc-data-grid__spacer");
    if (spacer) {
      const totalRows = this.#virtualRows ? this.#virtualRows.totalRows : this.#allRowElements.length;
      spacer.style.height = `${totalRows * this.#rowHeight}px`;
    }

    this.#visibleStartIndex = -1;
    this.#visibleEndIndex = -1;
    this.#visibleColumnStartIndex = -1;
    this.#visibleColumnEndIndex = -1;
  }

  #renderVisibleRows() {
    renderVirtualWindow({
      rowSource: this.#virtualRows,
      rowHeight: this.#rowHeight,
      rowOverscan: this.#virtualRowOverscan,
      scrollContainer: this.hasScrollContainerTarget ? this.scrollContainerTarget : null,
      viewport: this.viewportTarget,
      currentRange: {
        rowStart: this.#visibleStartIndex,
        rowEnd: this.#visibleEndIndex,
        columnStart: this.#visibleColumnStartIndex,
        columnEnd: this.#visibleColumnEndIndex,
      },
      setCurrentRange: ({ rowStart, rowEnd, columnStart, columnEnd }) => {
        this.#visibleStartIndex = rowStart;
        this.#visibleEndIndex = rowEnd;
        this.#visibleColumnStartIndex = columnStart;
        this.#visibleColumnEndIndex = columnEnd;
      },
      computeColumnRange: () => this.#computeVisibleColumnRange(),
      applyColumnWindow: (row, columnRange) => this.#centerColumnWindow.apply(row, columnRange),
      headerRow: () => this.#virtualHeaderRow(),
      resolveCell: (target) => this.#resolveCell(target),
      cellByCoordinate: (rowIndex, columnIndex) => this.#cellByCoordinate(rowIndex, columnIndex),
      setActiveCell: (cell) => this.#setActiveCell(cell),
      ensureFocusableCell: () => this.#ensureRenderedFocusableCell(),
    });
  }
  #onScrollEnd() {
    this.#pagination?.handleScrollEnd();
  }

  #flushPageFetches(startIndex, endIndex) {
    this.#pagination?.flushRange(startIndex, endIndex);
  }

  #setPaginationBusy(isBusy) {
    setPaginationBusy(
      {
        grid: this.hasGridTarget ? this.gridTarget : null,
        status: this.hasVirtualStatusTarget ? this.virtualStatusTarget : null,
        loadingMoreText: this.#virtualStatusMessage("loadingMoreText", null),
        loadedText: this.#virtualStatusMessage("loadedText", null),
      },
      isBusy,
    );
  }

  #handlePaginationError(error) {
    console.error("[pathogen--data-grid] Pagination fetch error", error);

    const fetchErrorText = this.#virtualStatusMessage("fetchErrorText", null);
    if (fetchErrorText) this.#showErrorState(fetchErrorText);
    else this.#reportError(error);
  }

  #updateVirtualAllCellsFromCache() {
    if (!this.hasGridTarget || !this.#pagination) return;

    this.#virtualAllCells = cachedVirtualCells({
      grid: this.gridTarget,
      rows: this.#pagination.getCachedRows(),
      cellSelector: CELL_SELECTOR,
    });
  }

  #ensureRenderedFocusableCell() {
    if (this.viewportTarget.querySelector(FOCUSABLE_CELL_SELECTOR)) return;

    const fallbackCell = this.viewportTarget.querySelector(CELL_SELECTOR);
    if (fallbackCell) this.#setActiveCell(fallbackCell);
  }

  /**
   * Ensures a virtual cell's logical row/column are rendered before focusing.
   * @param {number|null} rowIndex - 0-based virtual row index
   * @param {number|null} columnIndex - absolute logical column index
   */
  #ensureVirtualRowVisible(rowIndex, columnIndex = null) {
    if (!this.#isVirtual()) return;
    if (!this.#isPaginatedVirtual() && !this.#allRowElements) return;

    ensureVirtualCellVisible({
      rowIndex,
      columnIndex,
      rowHeight: this.#rowHeight,
      scrollContainer: this.hasScrollContainerTarget ? this.scrollContainerTarget : null,
      visibleRange: { startIndex: this.#visibleStartIndex, endIndex: this.#visibleEndIndex },
      pinnedCount: this.#virtualPinnedCount,
      columnWidths: this.#virtualColumnWidths,
      columnOffsets: this.#virtualColumnOffsets,
      pinnedWidth: this.#virtualPinnedWidth,
      isColumnRendered: (index) => this.#isColumnRendered(index),
      prefetchRow: (index) => {
        if (this.#isPaginatedVirtual()) this.#pagination?.ensureRowLoaded(index);
      },
      cancelScheduledRender: () => {
        if (this.#rafId) {
          cancelAnimationFrame(this.#rafId);
          this.#rafId = null;
        }
      },
      renderNow: () => this.#renderVisibleRows(),
      reportError: (error) => this.#reportError(error),
    });
  }
  #readVirtualColumnContract() {
    if (!this.hasGridTarget) return;

    const widthsValue = this.gridTarget.dataset.pvcDataGridColumnWidths || "";
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
    const pinnedCountValue = Number.parseInt(this.gridTarget.dataset.pvcDataGridPinnedCount || "0", 10);
    this.#virtualPinnedCount =
      Number.isFinite(pinnedCountValue) && totalColumns > 0 ? Math.max(0, Math.min(totalColumns, pinnedCountValue)) : 0;

    const overscanValue = Number.parseInt(this.gridTarget.dataset.pvcDataGridColumnOverscan || "", 10);
    this.#virtualColumnOverscan =
      Number.isFinite(overscanValue) && overscanValue >= 0 ? overscanValue : DEFAULT_VIRTUAL_COLUMN_OVERSCAN;

    const rowHeightValue = Number.parseFloat(this.gridTarget.dataset.pvcDataGridRowHeight || "");
    if (Number.isFinite(rowHeightValue) && rowHeightValue > 0) {
      this.#rowHeight = rowHeightValue;
    }

    const rowOverscanValue = Number.parseInt(this.gridTarget.dataset.pvcDataGridRowOverscan || "", 10);
    this.#virtualRowOverscan =
      Number.isFinite(rowOverscanValue) && rowOverscanValue >= 0 ? rowOverscanValue : DEFAULT_VIRTUAL_ROW_OVERSCAN;

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
    return this.gridTarget.querySelector('.pvc-data-grid__row--header[role="row"]');
  }

  #syncScrollAffordance() {
    if (!this.hasScrollContainerTarget) return;

    const scrollContainer = this.scrollContainerTarget;
    const horizontalOverflow = scrollContainer.scrollWidth - scrollContainer.clientWidth > 1;

    if (!horizontalOverflow) {
      delete this.element.dataset.pvcDataGridOverflowing;
      delete this.element.dataset.pvcDataGridScrollPosition;
      if (this.hasScrollHintTarget) this.scrollHintTarget.hidden = true;
      return;
    }

    this.element.dataset.pvcDataGridOverflowing = "true";

    const atStart = scrollContainer.scrollLeft <= 1;
    const atEnd = scrollContainer.scrollLeft + scrollContainer.clientWidth >= scrollContainer.scrollWidth - 1;
    this.element.dataset.pvcDataGridScrollPosition = atStart ? "start" : atEnd ? "end" : "middle";

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

    this.element.dataset.pvcDataGridState = "error";
    this.errorStateTarget.hidden = false;
  }

  #hideErrorState() {
    if (!this.hasErrorStateTarget) return;

    delete this.element.dataset.pvcDataGridState;
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
