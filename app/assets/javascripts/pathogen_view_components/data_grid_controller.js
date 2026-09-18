import { Controller } from "@hotwired/stimulus";

import {
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
  interactiveElements,
  resolveInteractiveTarget,
} from "pathogen_view_components/data_grid_controller/widget_mode";

import { setPaginationBusy } from "pathogen_view_components/data_grid_controller/pagination_mode";
import { VirtualViewport } from "pathogen_view_components/data_grid_controller/virtual_viewport";
import { CellIndex } from "pathogen_view_components/data_grid_controller/cell_index";

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
  #pendingFocusCoordinate = null;

  #virtualViewport = null;

  #cellIndex = new CellIndex(() => this.#readCells());

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
    this.#teardown();
  }

  #teardown() {
    this.#abortController?.abort();
    this.#abortController = null;
    this.#virtualViewport?.disconnect();
    this.#virtualViewport = null;
    this.#pendingFocusCoordinate = null;
    this.#lastActiveCell = null;
    this.#invalidateCellCaches();
    this.element.removeAttribute("data-virtual-ready");
  }

  cellTargetConnected() {
    if (!this.#virtualViewport) this.#invalidateCellCaches();
  }

  cellTargetDisconnected() {
    if (!this.#virtualViewport) this.#invalidateCellCaches();
  }

  handleFocusin(event) {
    const cell = this.#resolveCell(event.target);
    if (!cell) return;

    this.#pendingFocusCoordinate = null;
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

    const targetCell = this.#resolveCell(event.target);
    if (!targetCell) return;

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
      if (focusInteractiveElement(activeCell, null, (cell) => this.#scrollCellIntoView(cell))) {
        event.preventDefault();
      }
      return;
    }

    if (!NAVIGATION_KEYS.has(event.key)) return;

    const map = this.#navigationCellMap();
    const nextCell = this.#absoluteVirtualEdgeCell(event) || nextCellForKey(activeCell, event, map, this.#pageSize());
    if (!nextCell) return;

    event.preventDefault();
    this.#focusCell(nextCell);

    if ((event.ctrlKey || event.metaKey) && event.key === "Home" && this.hasScrollContainerTarget) {
      if (this.#virtualViewport) {
        this.#virtualViewport.resetScroll();
      } else {
        this.scrollContainerTarget.scrollTop = 0;
        this.scrollContainerTarget.scrollLeft = 0;
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
    /* v8 ignore next -- defensive: handleKeydown verifies hasGridTarget before resolving the active cell */
    if (!this.hasGridTarget) return null;

    if (this.#lastActiveCell && this.#hasCachedCell(this.#lastActiveCell)) return this.#lastActiveCell;

    const cells = this.#allCells();
    const fromFocused = this.#resolveCell(document.activeElement);
    if (fromFocused && this.#hasCachedCell(fromFocused)) {
      const rowIndex = rowIndexOf(fromFocused);
      const columnIndex = columnIndexOf(fromFocused);
      if (rowIndex !== null && columnIndex !== null) {
        const mappedCell = this.#cellByCoordinate(rowIndex, columnIndex);
        /* v8 ignore next -- defensive: a cached focused cell always resolves to a mapped coordinate */
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
    return this.#cellIndex.cells;
  }

  #readCells() {
    if (this.#virtualViewport) return this.#virtualViewport.cells;
    /* v8 ignore next -- defensive: a keyboard target only resolves when cell targets exist */
    return this.hasCellTarget ? [...this.cellTargets] : [];
  }

  #absoluteVirtualEdgeCell(event) {
    if (!this.#isVirtual() || !(event.ctrlKey || event.metaKey) || event.key !== "End") return null;
    /* v8 ignore next -- defensive: virtual mode always has a viewport with at least one row here */
    if (!this.#virtualViewport || this.#virtualViewport.totalRows < 1) return null;

    const rowIndex = this.#virtualViewport.totalRows;
    const columnIndex = this.#lastColumnIndex();
    /* v8 ignore next -- defensive: a virtual grid always exposes at least one column */
    if (columnIndex < 0) return null;

    this.#virtualViewport.ensureVisible(rowIndex - 1, columnIndex);

    /* v8 ignore next 5 -- defensive: ensureVisible renders the requested edge cell before this lookup */
    return (
      this.viewportTarget.querySelector(
        `${CELL_SELECTOR}[data-pathogen--data-grid-row-index="${rowIndex}"][data-pathogen--data-grid-column-index="${columnIndex}"]`,
      ) || this.#cellByCoordinate(rowIndex, columnIndex)
    );
  }

  #lastColumnIndex() {
    /* v8 ignore start -- defensive: only reached from the virtual edge-cell path; the non-virtual fallback is unused */
    if (this.#virtualViewport) return this.#virtualViewport.lastColumnIndex;
    const ariaColumnCount = Number.parseInt(this.gridTarget?.getAttribute("aria-colcount") || "", 10);
    return Number.isFinite(ariaColumnCount) && ariaColumnCount > 0 ? ariaColumnCount - 1 : -1;
    /* v8 ignore stop */
  }

  #focusCell(cell) {
    const rowIndex = rowIndexOf(cell);
    const columnIndex = columnIndexOf(cell);

    if (rowIndex !== null && columnIndex !== null) {
      this.#pendingFocusCoordinate = { rowIndex, columnIndex };
    }

    if (this.#isVirtual()) {
      /* v8 ignore next -- defensive: navigation always targets a cell with a numeric row index */
      const virtualRowIndex = rowIndex === null ? null : rowIndex - 1;
      this.#virtualViewport?.ensureVisible(virtualRowIndex, columnIndex);
    }

    const targetCell =
      rowIndex !== null && columnIndex !== null ? this.#resolveConnectedCellByCoordinate(rowIndex, columnIndex) : cell;

    /* v8 ignore next -- defensive: the resolved coordinate cell is connected when navigation reaches it */
    if (!targetCell?.isConnected) return;

    this.#pendingFocusCoordinate = null;
    this.#setActiveCell(targetCell);
    targetCell.focus({ preventScroll: true });
    this.#scrollCellIntoView(targetCell);
  }

  #scrollCellIntoView(cell) {
    ensureCellFullyVisible(
      cell,
      this.hasScrollContainerTarget ? this.scrollContainerTarget : null,
      /* v8 ignore next -- defensive: the grid target is always present when a cell is scrolled into view */
      this.hasGridTarget ? this.gridTarget : null,
      {
        pinnedWidth: this.#virtualViewport?.pinnedWidth ?? null,
      },
    );
  }

  #focusAdjacentInteractiveCell(cell, direction) {
    const cells = this.#allCells();
    const startIndex = this.#cellPosition(cell);
    /* v8 ignore next -- defensive: the active cell is always present in the cell index */
    if (startIndex === -1) return false;

    let index = startIndex + direction;
    while (index >= 0 && index < cells.length) {
      const candidate = cells[index];
      if (hasInteractiveElements(candidate) && interactiveElements(candidate).length > 0) {
        const rowIndex = rowIndexOf(candidate);
        const columnIndex = columnIndexOf(candidate);
        this.#focusCell(candidate);

        let focusCandidate = candidate;
        /* v8 ignore next 3 -- defensive: interactive candidates carry numeric coordinates and stay mapped */
        if (rowIndex !== null && columnIndex !== null) {
          const mappedCell = this.#cellByCoordinate(rowIndex, columnIndex);
          if (mappedCell) focusCandidate = mappedCell;
        }
        /* v8 ignore next 4 -- defensive: guards a candidate detached by a re-render triggered while focusing */
        if (!focusCandidate.isConnected) {
          index += direction;
          continue;
        }

        // Rendering a detached candidate can change widget visibility. Check
        // the connected cell once, then share that list with focus placement.
        const elements = interactiveElements(focusCandidate);
        const focused = focusInteractiveElement(
          focusCandidate,
          direction < 0 ? elements.at(-1) : null,
          (activeCandidate) => this.#scrollCellIntoView(activeCandidate),
          elements,
        );
        if (focused) return true;
      }
      index += direction;
    }

    return false;
  }

  #pageSize() {
    const rowHeight = this.#isVirtual()
      ? /* v8 ignore next -- defensive: the virtual viewport always reports a positive row height */
        this.#virtualViewport?.rowHeight || 40
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
    const cell = target.closest(CELL_SELECTOR);
    return cell && this.element.contains(cell) ? cell : null;
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

  #invalidateCellCaches() {
    this.#cellIndex.invalidate();
  }

  #navigationCellMap() {
    return this.#cellIndex.rows;
  }

  #hasCachedCell(cell) {
    return this.#cellIndex.has(cell);
  }

  #cellByCoordinate(rowIndex, columnIndex) {
    return this.#cellIndex.at(rowIndex, columnIndex);
  }

  #resolveConnectedCellByCoordinate(rowIndex, columnIndex) {
    if (this.hasViewportTarget) {
      const viewportCell = this.viewportTarget.querySelector(
        `${CELL_SELECTOR}[data-pathogen--data-grid-row-index="${rowIndex}"][data-pathogen--data-grid-column-index="${columnIndex}"]`,
      );
      if (viewportCell) return viewportCell;
    }

    if (this.hasGridTarget && rowIndex === 0) {
      const headerCell = this.gridTarget.querySelector(
        `${CELL_SELECTOR}[data-pathogen--data-grid-row-index="0"][data-pathogen--data-grid-column-index="${columnIndex}"]`,
      );
      /* v8 ignore next -- defensive: a header row always exposes the requested column cell */
      if (headerCell) return headerCell;
    }

    const cachedCell = this.#cellByCoordinate(rowIndex, columnIndex);
    /* v8 ignore next -- defensive: cached coordinate cells are connected during focus resolution */
    return cachedCell?.isConnected ? cachedCell : null;
  }

  #restorePendingFocus() {
    if (!this.#pendingFocusCoordinate) return;

    const { rowIndex, columnIndex } = this.#pendingFocusCoordinate;
    const cell = this.#resolveConnectedCellByCoordinate(rowIndex, columnIndex);
    /* v8 ignore next -- defensive: pending focus is cleared before its cell can disconnect */
    if (!cell?.isConnected) return;

    this.#pendingFocusCoordinate = null;
    this.#setActiveCell(cell);
    cell.focus({ preventScroll: true });
  }

  #cellPosition(cell) {
    return this.#cellIndex.indexOf(cell);
  }

  #bindEvents(signal) {
    document.addEventListener("turbo:before-cache", () => this.#teardown(), { signal });
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
          this.#syncScrollAffordance();
          this.#virtualViewport?.handleScroll();
        },
        {
          signal,
          passive: true,
        },
      );

      scrollContainer.addEventListener(
        "scrollend",
        () => {
          this.#virtualViewport?.handleScrollEnd();
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
          this.#virtualViewport?.handleResize();
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

  #initVirtualMode() {
    const loadingText = this.#virtualStatusMessage(
      "loadingText",
      this.hasVirtualStatusTarget ? this.virtualStatusTarget.textContent.trim() : null,
    );
    const loadedText = this.#virtualStatusMessage("loadedText", null);
    this.gridTarget.setAttribute("aria-busy", "true");
    if (this.hasVirtualStatusTarget && loadingText) this.virtualStatusTarget.textContent = loadingText;

    this.#virtualViewport = new VirtualViewport({
      element: this.element,
      grid: this.gridTarget,
      viewport: this.viewportTarget,
      scrollContainer: this.hasScrollContainerTarget ? this.scrollContainerTarget : null,
      cellSelector: CELL_SELECTOR,
      focus: {
        resolveCell: (target) => this.#resolveCell(target),
        resolveFocusCell: (row, column) => this.#resolveConnectedCellByCoordinate(row, column),
        getPendingFocusCoordinate: () => this.#pendingFocusCoordinate,
        setActiveCell: (cell) => this.#setActiveCell(cell),
        ensureFocusableCell: () => this.#ensureRenderedFocusableCell(),
        restorePendingFocus: () => this.#restorePendingFocus(),
      },
      onCellsChanged: () => this.#invalidateCellCaches(),
      /* v8 ignore next -- defensive: forwards asynchronous virtual render errors to the shared error surface */
      onError: (error) => this.#reportError(error),
      syncScrollAffordance: () => this.#syncScrollAffordance(),
      setBusy: (busy) => this.#setPaginationBusy(busy),
      onPageError: (error) => this.#handlePaginationError(error),
      onPageSuccess: (hasPageErrors) => {
        if (!hasPageErrors) this.#hideErrorState();
      },
    });
    this.#virtualViewport.connect();
    this.element.setAttribute("data-virtual-ready", "");
    this.gridTarget.setAttribute("aria-busy", "false");
    if (this.hasVirtualStatusTarget && loadedText) this.virtualStatusTarget.textContent = loadedText;
    this.#virtualViewport.fetchVisiblePages();
  }

  #ensureRenderedFocusableCell() {
    if (this.viewportTarget.querySelector(FOCUSABLE_CELL_SELECTOR)) return;
    const fallbackCell = this.viewportTarget.querySelector(CELL_SELECTOR);
    /* v8 ignore next -- defensive: a rendered virtual window always contains at least one cell */
    if (fallbackCell) this.#setActiveCell(fallbackCell);
  }

  #setPaginationBusy(isBusy) {
    setPaginationBusy(
      {
        /* v8 ignore next -- defensive: pagination only runs when the grid target is present */
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
    const message = this.#virtualStatusMessage("fetchErrorText", null);
    if (message) this.#showErrorState(message);
    else this.#reportError(error);
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
