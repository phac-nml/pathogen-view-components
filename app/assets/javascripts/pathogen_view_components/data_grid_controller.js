import { Controller } from "@hotwired/stimulus";

import { buildCellMap, firstDataCell, nextCellForKey } from "pathogen_view_components/data_grid_controller/navigation";

import { ensureCellFullyVisible } from "pathogen_view_components/data_grid_controller/scroll";

import {
  activateInteractiveElement,
  focusInteractiveElement,
  handleInteractiveKeydown,
  hasInteractiveElements,
  resolveInteractiveTarget,
} from "pathogen_view_components/data_grid_controller/widget_mode";

import {
  computeVisibleRange,
  measureRowHeight,
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

export default class extends Controller {
  static targets = ["cell", "grid", "scrollContainer", "viewport"];
  #abortController = null;
  // Tracks the previously-active cell so #setActiveCell only touches two cells per call.
  #lastActiveCell = null;

  // Virtual mode state
  #allRowElements = null; // Detached row elements (only in virtual mode)
  #rowHeight = 0;
  #visibleStartIndex = -1;
  #visibleEndIndex = -1;
  #rafId = null;
  #resizeTimerId = null;

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

    if (this.#isVirtual()) {
      this.#initVirtualMode();
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
    this.#invalidateCellCaches();
    this.element.removeAttribute("data-virtual-ready");
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

  // ── Private helpers ───────────────────────────────────────────────────────

  #activeCell() {
    if (!this.hasGridTarget) return null;

    if (this.#lastActiveCell && this.#hasCachedCell(this.#lastActiveCell)) return this.#lastActiveCell;

    const cells = this.#allCells();
    const fromFocused = this.#resolveCell(document.activeElement);
    if (fromFocused && this.#hasCachedCell(fromFocused)) {
      const rowIndex = Number(fromFocused.getAttribute("data-pathogen--data-grid-row-index"));
      const columnIndex = Number(fromFocused.getAttribute("data-pathogen--data-grid-column-index"));
      const mappedCell = this.#cellByCoordinate(rowIndex, columnIndex);
      return mappedCell || fromFocused;
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
    if (this.#isVirtual() && this.#allRowElements) {
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
    if (this.#isVirtual()) {
      // In virtual mode, ensure the target row is in the DOM before focusing
      const rowIndex = Number(cell.getAttribute("data-pathogen--data-grid-row-index"));
      if (!Number.isNaN(rowIndex) && rowIndex > 0) {
        // rowIndex is 1-based in data attributes, convert to 0-based for virtualizer
        this.#ensureVirtualRowVisible(rowIndex - 1);
      }
    }

    this.#setActiveCell(cell);
    cell.focus({ preventScroll: true });
    this.#scrollCellIntoView(cell);
  }

  #scrollCellIntoView(cell) {
    ensureCellFullyVisible(
      cell,
      this.hasScrollContainerTarget ? this.scrollContainerTarget : null,
      this.hasGridTarget ? this.gridTarget : null,
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
      // First call: sweep all cells to normalize the server-rendered initial state.
      this.#allCells().forEach((node) => {
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

      const rowIndex = Number(cell.getAttribute("data-pathogen--data-grid-row-index"));
      const columnIndex = Number(cell.getAttribute("data-pathogen--data-grid-column-index"));
      if (Number.isNaN(rowIndex) || Number.isNaN(columnIndex)) return;

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
  }

  // ── Virtual mode ────────────────────────────────────────────────────────

  #isVirtual() {
    return this.element.classList.contains("pathogen-data-grid--virtual");
  }

  #initVirtualMode() {
    const viewport = this.viewportTarget;
    const spacer = viewport.querySelector(".pathogen-data-grid__spacer");

    // Collect all body rows (skip the spacer)
    const rows = Array.from(viewport.querySelectorAll('[role="row"]'));
    this.#allRowElements = rows;
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
    this.#scheduleVirtualRender();
  }

  #onResize() {
    if (this.#resizeTimerId) clearTimeout(this.#resizeTimerId);
    this.#resizeTimerId = setTimeout(() => {
      this.#resizeTimerId = null;
      this.#refreshVirtualMeasurements();
      this.#scheduleVirtualRender();
    }, RESIZE_DEBOUNCE_MS);
  }

  #scheduleVirtualRender() {
    if (this.#rafId) return;
    this.#rafId = requestAnimationFrame(() => {
      this.#rafId = null;
      this.#renderVisibleRows();
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
  }

  #renderVisibleRows() {
    if (!this.#allRowElements) return;

    const scrollTop = this.hasScrollContainerTarget ? this.scrollContainerTarget.scrollTop : 0;
    const containerHeight = this.hasScrollContainerTarget ? this.scrollContainerTarget.clientHeight : 0;
    const viewportHeight = containerHeight > 0 ? containerHeight : window.innerHeight;

    const { startIndex, endIndex } = computeVisibleRange({
      scrollTop,
      viewportHeight,
      rowHeight: this.#rowHeight,
      totalRows: this.#allRowElements.length,
    });

    // Skip re-render if range hasn't changed
    if (startIndex === this.#visibleStartIndex && endIndex === this.#visibleEndIndex) return;

    this.#visibleStartIndex = startIndex;
    this.#visibleEndIndex = endIndex;

    const viewport = this.viewportTarget;
    const spacer = viewport.querySelector(".pathogen-data-grid__spacer");

    // Preserve focus across DOM removal/reinsertion.
    // Removing a focused element causes the browser to move focus to <body>.
    // We save the active element and restore it after reinsertion so keyboard
    // navigation stays on the intended cell even when a RAF re-render fires after
    // #focusCell() (e.g. buffer rows that scroll into view trigger a range shift).
    const focusedElement = document.activeElement;
    const focusInViewport = focusedElement instanceof HTMLElement && viewport.contains(focusedElement);

    // Remove current body rows (keep the spacer)
    const currentRows = viewport.querySelectorAll('[role="row"]');
    currentRows.forEach((row) => row.remove());

    // Insert visible rows after the spacer, positioned absolutely at their virtual coordinate
    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
      const row = this.#allRowElements[i];
      row.style.top = `${i * this.#rowHeight}px`;
      fragment.appendChild(row);
    }

    if (spacer) {
      spacer.after(fragment);
    } else {
      viewport.appendChild(fragment);
    }

    // Restore focus if the element was re-inserted (its row is in the new range).
    // isConnected becomes true again once the row element is back in the document.
    if (focusInViewport && focusedElement.isConnected) {
      focusedElement.focus({ preventScroll: true });
    }

    // Cell caches built from #allRowElements cover all rows (in- and out-of-DOM)
    // and remain valid across window slides — no invalidation needed here.
  }

  /**
   * Ensures a virtual row is in the DOM and scroll position before focusing a cell.
   * Called by keyboard navigation when the target row might be outside the current range.
   * @param {number} rowIndex - The 0-based virtual row index
   */
  #ensureVirtualRowVisible(rowIndex) {
    if (!this.#isVirtual() || !this.#allRowElements) return;

    const scrollContainer = this.hasScrollContainerTarget ? this.scrollContainerTarget : null;
    if (!scrollContainer) return;

    const newScrollTop = scrollTopForRow({
      rowIndex,
      scrollTop: scrollContainer.scrollTop,
      viewportHeight: scrollContainer.clientHeight,
      rowHeight: this.#rowHeight,
    });

    if (newScrollTop !== null) {
      scrollContainer.scrollTop = newScrollTop;
    }

    // Only force a synchronous re-render if the row is outside the currently rendered range.
    // When the row is already in the window, the RAF-coalesced path handles any scroll.
    const alreadyRendered = rowIndex >= this.#visibleStartIndex && rowIndex < this.#visibleEndIndex;
    if (!alreadyRendered) {
      if (this.#rafId) {
        cancelAnimationFrame(this.#rafId);
        this.#rafId = null;
      }
      this.#renderVisibleRows();
    }
  }
}
