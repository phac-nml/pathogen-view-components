import { Controller } from "@hotwired/stimulus";

import { buildCellMap, firstDataCell, nextCellForKey } from "pathogen_view_components/data_grid_controller/navigation";

import { ensureBoundsFullyVisible, ensureCellFullyVisible } from "pathogen_view_components/data_grid_controller/scroll";

import {
  activateInteractiveElement,
  focusInteractiveElement,
  handleInteractiveKeydown,
  hasInteractiveElements,
  resolveInteractiveTarget,
} from "pathogen_view_components/data_grid_controller/widget_mode";

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

const DEFAULT_VIRTUAL_ROW_HEIGHT = 44;
const DEFAULT_OVERSCAN_ROWS = 8;
const DEFAULT_OVERSCAN_COLUMNS = 4;
const MIN_COLUMN_WIDTH = 64;

function integerOr(defaultValue, value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function normalizeColumns(rawColumns) {
  if (!Array.isArray(rawColumns) || rawColumns.length === 0) return [];

  return rawColumns
    .map((raw, index) => {
      if (!raw || typeof raw !== "object") return null;

      const id = String(raw.id || "").trim();
      if (!id) return null;

      return {
        id,
        globalIndex: index,
        label: String(raw.label || `Column ${index + 1}`),
        width: Math.max(MIN_COLUMN_WIDTH, integerOr(180, raw.width)),
        sticky: raw.sticky === true || raw.sticky === "true" || raw.sticky === 1,
        interactive: raw.interactive === true || raw.interactive === "true" || raw.interactive === 1,
        kind: ["text", "link", "button"].includes(raw.kind) ? raw.kind : "text",
      };
    })
    .filter(Boolean);
}

function buildVirtualState(dataset, rowHeight, overscanRows, overscanColumns) {
  if (!dataset || typeof dataset !== "object") return null;

  const mode = typeof dataset.mode === "string" ? dataset.mode : "";
  if (mode !== "synthetic" && mode !== "static") return null;

  const rowCount = integerOr(0, dataset.rowCount ?? dataset.row_count);
  const columns = normalizeColumns(dataset.columns);
  if (rowCount < 1 || columns.length === 0) return null;

  const stickyColumns = [];
  const centerColumns = [];
  const centerIndexByGlobal = new Map();
  const centerOffsets = [];
  let centerOffset = 0;
  let stickyOffset = 0;

  columns.forEach((column) => {
    if (column.sticky) {
      stickyColumns.push({
        ...column,
        stickyLeft: stickyOffset,
      });
      stickyOffset += column.width;
      return;
    }

    centerIndexByGlobal.set(column.globalIndex, centerColumns.length);
    centerOffsets.push(centerOffset);
    centerColumns.push(column);
    centerOffset += column.width;
  });

  return {
    mode,
    rowCount,
    rowHeight: integerOr(DEFAULT_VIRTUAL_ROW_HEIGHT, rowHeight),
    overscanRows: integerOr(DEFAULT_OVERSCAN_ROWS, overscanRows),
    overscanColumns: integerOr(DEFAULT_OVERSCAN_COLUMNS, overscanColumns),
    columns,
    stickyColumns,
    stickyTotalWidth: stickyOffset,
    centerColumns,
    centerOffsets,
    centerTotalWidth: centerOffset,
    centerIndexByGlobal,
    rows: Array.isArray(dataset.rows) ? dataset.rows : [],
    activeRowIndex: 0,
    activeColumnIndex: 0,
    widgetMode: false,
  };
}

function buildDataAttributes(rowIndex, columnIndex, interactive) {
  return {
    "pathogen--data-grid-target": "cell",
    "pathogen--data-grid-row-index": String(rowIndex),
    "pathogen--data-grid-column-index": String(columnIndex),
    "pathogen--data-grid-has-interactive": interactive ? "true" : "false",
  };
}

function applyDataAttributes(node, dataAttributes) {
  Object.entries(dataAttributes).forEach(([key, value]) => {
    node.setAttribute(`data-${key}`, value);
  });
}

function interactiveByKind(kind) {
  return kind === "link" || kind === "button";
}

function virtualCellText(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    if (typeof value.label === "string") return value.label;
    if (typeof value.text === "string") return value.text;
    if (typeof value.value === "string") return value.value;
  }

  return fallback;
}

function valueFromStaticRows(rows, rowIndex, columnId) {
  const row = rows[rowIndex - 1];
  if (!row || typeof row !== "object") return null;

  const cells = row.cells;
  if (!cells || typeof cells !== "object") return null;

  return cells[columnId] ?? null;
}

function syntheticValue(rowIndex, columnIndex) {
  if (columnIndex === 0) return `SAM-${String(rowIndex).padStart(6, "0")}`;
  if (columnIndex === 1) return `Synthetic sample ${rowIndex}`;
  return `R${rowIndex}C${columnIndex + 1}`;
}

function virtualPageSize(scrollContainer, rowHeight) {
  if (!(scrollContainer instanceof HTMLElement) || rowHeight <= 0) return 1;
  return Math.max(1, Math.floor(scrollContainer.clientHeight / rowHeight));
}

function dataGridDebugEnabled() {
  if (typeof globalThis === "undefined") return false;
  return globalThis.__PATHOGEN_DATA_GRID_DEBUG__ === true;
}

function debugTargetLabel(target) {
  if (!(target instanceof Element)) return String(target);

  const role = target.getAttribute("role") || "";
  const row = target.getAttribute("data-pathogen--data-grid-row-index") || "-";
  const col = target.getAttribute("data-pathogen--data-grid-column-index") || "-";
  return `${target.tagName.toLowerCase()}(role=${role},r=${row},c=${col})`;
}

export default class extends Controller {
  static targets = ["cell", "grid", "scrollContainer", "headerRow", "body"];
  static values = {
    virtual: Boolean,
    virtualDataset: Object,
    virtualRowHeight: Number,
    virtualOverscanRows: Number,
    virtualOverscanColumns: Number,
  };

  #abortController = null;
  #lastActiveCell = null;
  #virtualState = null;
  #virtualFocusWithin = false;
  #programmaticScroll = false;
  #virtualFocusRestorePending = false;
  #lastRenderedRowWindowKey = null;
  #lastRenderedCenterWindowKey = null;
  #lastObservedScrollTop = 0;
  #lastObservedScrollLeft = 0;
  #lastNonZeroScrollTop = 0;
  #lastNonZeroScrollLeft = 0;
  #expectingKeyboardNavigationScroll = false;
  #keyboardNavigationExpectationTimer = null;
  #lastKeyboardNavigationAt = 0;
  #lastNavigationKey = null;
  #pointerInteractingWithScroll = false;
  #virtualFocusRetryTimer = null;
  #virtualFocusRetryFrameTimer = null;
  #virtualFocusRetryLateTimer = null;

  #debug(label, payload = null) {
    if (!dataGridDebugEnabled()) return;
    if (payload === null) {
      // eslint-disable-next-line no-console
      console.log(`[data-grid] ${label}`);
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`[data-grid] ${label}`, payload);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  connect() {
    this.#abortController?.abort();
    this.#abortController = new AbortController();
    this.#bindEvents(this.#abortController.signal);

    if (dataGridDebugEnabled()) {
      // eslint-disable-next-line no-console
      console.log("[data-grid] debug enabled", {
        element: debugTargetLabel(this.element),
        virtual: this.virtualValue,
      });
    }

    if (this.virtualValue) {
      this.#connectVirtualMode();
    }
  }

  disconnect() {
    this.#abortController?.abort();
    this.#abortController = null;
    this.#virtualState = null;
    this.#virtualFocusWithin = false;
    this.#programmaticScroll = false;
    this.#virtualFocusRestorePending = false;
    this.#lastRenderedRowWindowKey = null;
    this.#lastRenderedCenterWindowKey = null;
    this.#lastObservedScrollTop = 0;
    this.#lastObservedScrollLeft = 0;
    this.#lastNonZeroScrollTop = 0;
    this.#lastNonZeroScrollLeft = 0;
    this.#expectingKeyboardNavigationScroll = false;
    if (this.#keyboardNavigationExpectationTimer) {
      clearTimeout(this.#keyboardNavigationExpectationTimer);
      this.#keyboardNavigationExpectationTimer = null;
    }
    this.#lastKeyboardNavigationAt = 0;
    this.#lastNavigationKey = null;
    this.#pointerInteractingWithScroll = false;
    this.#clearVirtualFocusRetryTimers();
  }

  // ── DOM event handlers ────────────────────────────────────────────────────

  handleFocusin(event) {
    const cell = this.#resolveCell(event.target);
    if (!cell) return;

    if (this.#virtualMode()) this.#virtualFocusWithin = true;
    this.#debug("focusin", {
      target: debugTargetLabel(event.target),
      activeElement: debugTargetLabel(document.activeElement),
      virtualFocusWithin: this.#virtualFocusWithin,
    });
    this.#setActiveCell(cell);

    const interactiveTarget = resolveInteractiveTarget(event.target, cell);
    if (interactiveTarget) {
      activateInteractiveElement(cell, interactiveTarget);
      if (this.#virtualMode()) this.#virtualState.widgetMode = true;
      return;
    }

    if (this.#virtualMode()) this.#virtualState.widgetMode = false;
  }

  handleClick(event) {
    const cell = this.#resolveCell(event.target);
    if (!cell) return;

    const interactiveTarget = resolveInteractiveTarget(event.target, cell);
    if (interactiveTarget) {
      if (this.#virtualMode()) this.#virtualFocusWithin = true;
      this.#setActiveCell(cell);
      activateInteractiveElement(cell, interactiveTarget);
      if (this.#virtualMode()) this.#virtualState.widgetMode = true;
      return;
    }

    // Prevent default to avoid text-selection flicker when clicking to focus a plain cell.
    event.preventDefault();
    if (this.#virtualMode()) this.#virtualFocusWithin = true;
    this.#focusCell(cell);
    if (this.#virtualMode()) this.#virtualState.widgetMode = false;
  }

  handleFocusout(event) {
    if (!this.#virtualMode()) return;
    if (this.element.contains(event.relatedTarget)) return;

    this.#debug("focusout", {
      target: debugTargetLabel(event.target),
      relatedTarget: debugTargetLabel(event.relatedTarget),
      activeElement: debugTargetLabel(document.activeElement),
      virtualFocusWithin: this.#virtualFocusWithin,
    });

    if (event.relatedTarget === document.body || event.relatedTarget === document.documentElement) {
      queueMicrotask(() => {
        if (!this.#virtualMode()) return;
        if (this.element.contains(document.activeElement)) return;
        if (!this.#virtualFocusWithin) return;

        const activeCell = this.#cellByCoordinates(
          this.#virtualState.activeRowIndex,
          this.#virtualState.activeColumnIndex,
        );
        if (activeCell) activeCell.focus({ preventScroll: true });
        this.#debug("focusout-reclaim", {
          reclaimed: Boolean(activeCell),
          activeCell: debugTargetLabel(activeCell),
          activeElement: debugTargetLabel(document.activeElement),
        });
      });
      return;
    }

    // Virtual rerenders can temporarily remove the focused cell, producing
    // focusout with relatedTarget === null before focus is restored.
    if (event.relatedTarget === null) {
      queueMicrotask(() => {
        if (!this.#virtualMode()) return;
        if (this.element.contains(document.activeElement)) return;

        const keyboardNavigationIsRecent = Date.now() - this.#lastKeyboardNavigationAt < 1500;
        const keepVirtualFocusContext =
          this.#virtualFocusRestorePending || this.#expectingKeyboardNavigationScroll || keyboardNavigationIsRecent;

        if (keepVirtualFocusContext) {
          this.#virtualFocusWithin = true;
          this.#virtualFocusRestorePending = true;
          return;
        }

        this.#virtualFocusWithin = false;
        this.#virtualFocusRestorePending = false;
      });
      return;
    }

    this.#virtualFocusWithin = false;
    this.#virtualFocusRestorePending = false;
  }

  handleKeydown(event) {
    if (!this.hasGridTarget) return;
    if (event.defaultPrevented) return;

    if (this.#virtualMode()) {
      this.#handleVirtualKeydown(event);
      return;
    }

    const activeCell = this.#activeCell();
    if (!activeCell) return;

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

    const map = buildCellMap(this.#allCells());
    const nextCell = nextCellForKey(activeCell, event, map, this.#pageSize());
    if (!nextCell) return;

    event.preventDefault();
    this.#focusCell(nextCell);
  }

  // ── Virtual mode ──────────────────────────────────────────────────────────

  #virtualMode() {
    return this.virtualValue && this.#virtualState !== null;
  }

  #connectVirtualMode() {
    if (!this.hasGridTarget || !this.hasScrollContainerTarget || !this.hasBodyTarget || !this.hasHeaderRowTarget)
      return;

    this.#virtualState = buildVirtualState(
      this.virtualDatasetValue,
      this.virtualRowHeightValue || DEFAULT_VIRTUAL_ROW_HEIGHT,
      this.virtualOverscanRowsValue || DEFAULT_OVERSCAN_ROWS,
      this.virtualOverscanColumnsValue || DEFAULT_OVERSCAN_COLUMNS,
    );
    if (!this.#virtualState) return;

    if (!this.scrollContainerTarget.hasAttribute("tabindex")) {
      this.scrollContainerTarget.tabIndex = -1;
    }

    this.#bindVirtualRenderEvents();
    this.#renderVirtualGrid({ restoreFocus: false });
  }

  #bindVirtualRenderEvents() {
    const onScroll = () => {
      const scrollTop = this.scrollContainerTarget.scrollTop;
      const scrollLeft = this.scrollContainerTarget.scrollLeft;
      const isProgrammatic = this.#programmaticScroll;
      this.#programmaticScroll = false;
      const keyboardNavigationIsRecent = Date.now() - this.#lastKeyboardNavigationAt < 1500;
      const deepGridFocus = this.#virtualState.activeRowIndex > 50;
      const focusContextLikelyOwnedByGrid =
        this.#virtualFocusWithin || this.#virtualFocusRestorePending || this.#expectingKeyboardNavigationScroll;
      const keyboardRestoreLikely =
        this.#virtualFocusRestorePending || this.#expectingKeyboardNavigationScroll || keyboardNavigationIsRecent;
      const deepZeroTopReset =
        focusContextLikelyOwnedByGrid &&
        scrollTop === 0 &&
        this.#virtualState.activeRowIndex > 1 &&
        !this.#pointerInteractingWithScroll;
      const deepProgrammaticTopReset =
        deepZeroTopReset && isProgrammatic && this.#virtualState.activeRowIndex > 50 && this.#lastNonZeroScrollTop > 0;
      const unexpectedTopReset =
        deepZeroTopReset &&
        (deepProgrammaticTopReset || (keyboardRestoreLikely && (!isProgrammatic || this.#virtualFocusRestorePending)));
      const shouldGuardReset =
        unexpectedTopReset &&
        (deepGridFocus ||
          this.#expectingKeyboardNavigationScroll ||
          keyboardNavigationIsRecent ||
          deepProgrammaticTopReset);

      if (shouldGuardReset) {
        const fallbackScrollTop = this.#virtualScrollTopForRow(this.#virtualState.activeRowIndex);
        const verticalNavigationReset =
          this.#lastNavigationKey === "ArrowUp" || this.#lastNavigationKey === "ArrowDown";
        const shouldPreferFallbackTop =
          fallbackScrollTop > 0 && (deepProgrammaticTopReset || (keyboardRestoreLikely && verticalNavigationReset));
        const restoringScrollTop = shouldPreferFallbackTop
          ? fallbackScrollTop
          : this.#lastObservedScrollTop > 0
            ? this.#lastObservedScrollTop
            : this.#lastNonZeroScrollTop > 0
              ? this.#lastNonZeroScrollTop
              : fallbackScrollTop;
        const restoringScrollLeft =
          this.#lastObservedScrollTop > 0 ? this.#lastObservedScrollLeft : this.#lastNonZeroScrollLeft;

        this.#debug("scroll-reset-guard", {
          blockedScrollTop: scrollTop,
          restoringScrollTop,
          restoringScrollLeft,
          fallbackScrollTop,
          keyboardNavigationIsRecent,
          activeRowIndex: this.#virtualState.activeRowIndex,
          pointerInteractingWithScroll: this.#pointerInteractingWithScroll,
        });
        this.#programmaticScroll = true;
        this.scrollContainerTarget.scrollTop = restoringScrollTop;
        this.scrollContainerTarget.scrollLeft = restoringScrollLeft;
        this.#lastObservedScrollTop = restoringScrollTop;
        this.#lastObservedScrollLeft = restoringScrollLeft;
        return;
      }

      const preservesFocusedCell = this.element.contains(document.activeElement);
      const wantsRestoreFocus = isProgrammatic || this.#virtualFocusRestorePending || preservesFocusedCell;
      this.#debug("scroll", {
        scrollTop,
        scrollLeft,
        isProgrammatic,
        preservesFocusedCell,
        wantsRestoreFocus,
        activeElement: debugTargetLabel(document.activeElement),
        activeRowIndex: this.#virtualState.activeRowIndex,
        activeColumnIndex: this.#virtualState.activeColumnIndex,
      });
      const didRestoreFocus = this.#renderVirtualGrid({
        restoreFocus: wantsRestoreFocus,
        snapActiveRow: wantsRestoreFocus,
        allowWindowReuse: true,
      });
      if (wantsRestoreFocus) {
        this.#virtualFocusRestorePending = !didRestoreFocus;
      }

      this.#lastObservedScrollTop = this.scrollContainerTarget.scrollTop;
      this.#lastObservedScrollLeft = this.scrollContainerTarget.scrollLeft;
      if (this.#lastObservedScrollTop > 0) {
        this.#lastNonZeroScrollTop = this.#lastObservedScrollTop;
        this.#lastNonZeroScrollLeft = this.#lastObservedScrollLeft;
      }
    };

    this.scrollContainerTarget.addEventListener("scroll", onScroll, {
      signal: this.#abortController.signal,
      passive: true,
    });

    this.scrollContainerTarget.addEventListener(
      "pointerdown",
      () => {
        this.#pointerInteractingWithScroll = true;
        this.#virtualFocusWithin = true;
        this.scrollContainerTarget.focus({ preventScroll: true });
      },
      {
        signal: this.#abortController.signal,
        passive: true,
      },
    );

    window.addEventListener(
      "pointerup",
      () => {
        this.#pointerInteractingWithScroll = false;
      },
      {
        signal: this.#abortController.signal,
        passive: true,
      },
    );

    window.addEventListener(
      "pointercancel",
      () => {
        this.#pointerInteractingWithScroll = false;
      },
      {
        signal: this.#abortController.signal,
        passive: true,
      },
    );

    let resizeTimer = null;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.#renderVirtualGrid({ restoreFocus: false }), 100);
    };
    window.addEventListener("resize", onResize, {
      signal: this.#abortController.signal,
      passive: true,
    });
  }

  #handleVirtualKeydown(event) {
    this.#debug("keydown", {
      key: event.key,
      target: debugTargetLabel(event.target),
      activeElement: debugTargetLabel(document.activeElement),
      activeRowIndex: this.#virtualState.activeRowIndex,
      activeColumnIndex: this.#virtualState.activeColumnIndex,
      defaultPrevented: event.defaultPrevented,
    });

    const activeCell = this.#activeCell();
    if (!activeCell) return;

    const isInteractiveTarget = resolveInteractiveTarget(event.target, activeCell) !== null;
    const isGridEdge = (event.ctrlKey || event.metaKey) && GRID_EDGE_SHORTCUT_KEYS.has(event.key);

    if (isInteractiveTarget && !isGridEdge) {
      handleInteractiveKeydown(event, activeCell, {
        exitWidgetMode: (cell) => {
          this.#virtualState.widgetMode = false;
          this.#focusCell(cell);
        },
        moveToInteractiveCell: (cell, direction) => this.#focusAdjacentInteractiveCell(cell, direction),
      });
      return;
    }

    if (hasInteractiveElements(activeCell) && ENTER_WIDGET_MODE_KEYS.has(event.key)) {
      event.preventDefault();
      this.#virtualState.widgetMode = true;
      focusInteractiveElement(activeCell, null, (cell) => this.#scrollCellIntoView(cell));
      return;
    }

    if (!NAVIGATION_KEYS.has(event.key)) return;

    const nextCoordinates = this.#nextVirtualCoordinatesForKey(event);
    if (!nextCoordinates) {
      // Prevent page/container native scrolling when the grid owns navigation keys.
      event.preventDefault();
      return;
    }

    event.preventDefault();
    this.#virtualState.widgetMode = false;
    this.#pointerInteractingWithScroll = false;
    this.#lastKeyboardNavigationAt = Date.now();
    this.#lastNavigationKey = event.key;
    this.#expectingKeyboardNavigationScroll = true;
    if (this.#keyboardNavigationExpectationTimer) {
      clearTimeout(this.#keyboardNavigationExpectationTimer);
    }
    this.#keyboardNavigationExpectationTimer = setTimeout(() => {
      this.#expectingKeyboardNavigationScroll = false;
      this.#keyboardNavigationExpectationTimer = null;
    }, 200);

    const nextCell = this.#cellByCoordinates(nextCoordinates.rowIndex, nextCoordinates.columnIndex);
    const allowTopBoundaryFocus =
      event.key === "ArrowUp" && nextCoordinates.rowIndex > 0 && this.#isVirtualCellPartiallyVisible(nextCell);
    const shouldUseDirectFocus =
      nextCell &&
      !isGridEdge &&
      event.key !== "PageDown" &&
      event.key !== "PageUp" &&
      (allowTopBoundaryFocus || this.#virtualCoordinatesVisible(nextCoordinates.rowIndex, nextCoordinates.columnIndex));

    if (shouldUseDirectFocus) {
      if (allowTopBoundaryFocus) {
        this.#focusVirtualCoordinates(nextCoordinates.rowIndex, nextCoordinates.columnIndex);
        return;
      }

      this.#focusCell(nextCell);
      return;
    }

    this.#focusVirtualCoordinates(nextCoordinates.rowIndex, nextCoordinates.columnIndex);
  }

  #nextVirtualCoordinatesForKey(event) {
    const rowCount = this.#virtualState.rowCount;
    const columnCount = this.#virtualState.columns.length;
    if (rowCount < 1 || columnCount < 1) return null;

    const rowIndex = this.#virtualState.activeRowIndex;
    const columnIndex = this.#virtualState.activeColumnIndex;
    const lastColumn = columnCount - 1;
    const pageSize = virtualPageSize(this.scrollContainerTarget, this.#virtualState.rowHeight);

    if ((event.ctrlKey || event.metaKey) && event.key === "Home") {
      return { rowIndex: 0, columnIndex: 0 };
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "End") {
      return { rowIndex: rowCount, columnIndex: lastColumn };
    }

    switch (event.key) {
      case "ArrowRight":
        return columnIndex < lastColumn ? { rowIndex, columnIndex: columnIndex + 1 } : null;
      case "ArrowLeft":
        return columnIndex > 0 ? { rowIndex, columnIndex: columnIndex - 1 } : null;
      case "ArrowDown":
        if (rowIndex === 0) {
          return { rowIndex: this.#firstVisibleVirtualRowIndex(), columnIndex };
        }
        return rowIndex < rowCount ? { rowIndex: rowIndex + 1, columnIndex } : null;
      case "ArrowUp":
        return rowIndex > 0 ? { rowIndex: rowIndex - 1, columnIndex } : null;
      case "Home":
        return { rowIndex, columnIndex: 0 };
      case "End":
        return { rowIndex, columnIndex: lastColumn };
      case "PageDown": {
        const baseline = rowIndex === 0 ? 1 : rowIndex;
        return { rowIndex: Math.min(rowCount, baseline + pageSize), columnIndex };
      }
      case "PageUp":
        if (rowIndex === 0) return null;
        return { rowIndex: Math.max(1, rowIndex - pageSize), columnIndex };
      default:
        return null;
    }
  }

  #firstVisibleVirtualRowIndex() {
    if (!this.hasScrollContainerTarget) return 1;

    const rowHeight = Math.max(1, this.#virtualState.rowHeight);
    const visibleOffset = Math.floor(this.scrollContainerTarget.scrollTop / rowHeight);
    return Math.max(1, Math.min(this.#virtualState.rowCount, visibleOffset + 1));
  }

  #virtualScrollTopForRow(rowIndex) {
    if (!this.hasScrollContainerTarget) return 0;
    if (!Number.isInteger(rowIndex) || rowIndex <= 1) return 0;

    const container = this.scrollContainerTarget;
    const rowHeight = Math.max(1, this.#virtualState.rowHeight);
    const rowTop = (rowIndex - 1) * rowHeight;
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    if (maxScrollTop <= 0) {
      // During transient virtual rerenders some environments briefly report
      // zero scrollable height; prefer row-derived offset over resetting to top.
      return rowTop;
    }
    return Math.max(0, Math.min(maxScrollTop, rowTop));
  }

  #snapActiveRowToWindow(rowItems) {
    if (rowItems.length === 0) return;

    const activeRowIndex = this.#virtualState.activeRowIndex;
    if (activeRowIndex <= 0) return; // Header row is always rendered.

    let firstWindowRow = rowItems[0].index + 1;
    let lastWindowRow = rowItems[rowItems.length - 1].index + 1;

    if (this.hasScrollContainerTarget) {
      const rowHeight = Math.max(1, this.#virtualState.rowHeight);
      const headerHeight = this.hasHeaderRowTarget ? this.headerRowTarget.offsetHeight : 0;
      const viewportHeight = Math.max(1, this.scrollContainerTarget.clientHeight - headerHeight);
      const visibleStart = Math.floor(this.scrollContainerTarget.scrollTop / rowHeight) + 1;
      const visibleSpan = Math.max(1, Math.ceil(viewportHeight / rowHeight));
      const visibleEnd = Math.min(this.#virtualState.rowCount, visibleStart + visibleSpan - 1);

      firstWindowRow = Math.max(1, visibleStart);
      lastWindowRow = Math.max(firstWindowRow, visibleEnd);
    }

    if (activeRowIndex >= firstWindowRow && activeRowIndex <= lastWindowRow) return;

    this.#virtualState.activeRowIndex = activeRowIndex < firstWindowRow ? firstWindowRow : lastWindowRow;
  }

  #focusVirtualCoordinates(rowIndex, columnIndex) {
    this.#virtualState.activeRowIndex = rowIndex;
    this.#virtualState.activeColumnIndex = columnIndex;
    const didScroll = this.#scrollVirtualCoordinatesIntoView(rowIndex, columnIndex);
    if (!didScroll) {
      this.#programmaticScroll = false;
      this.#virtualFocusRestorePending = false;
      this.#renderVirtualGrid({ restoreFocus: true });
      return;
    }

    this.#virtualFocusRestorePending = true;
    queueMicrotask(() => {
      if (!this.#virtualMode()) return;
      if (!this.#virtualFocusRestorePending) return;

      const didRestoreFocus = this.#renderVirtualGrid({
        restoreFocus: true,
        snapActiveRow: false,
        allowWindowReuse: true,
      });
      if (didRestoreFocus) {
        this.#virtualFocusRestorePending = false;
      }
    });
  }

  #scrollVirtualCoordinatesIntoView(rowIndex, columnIndex) {
    if (!this.hasScrollContainerTarget) return false;

    this.#programmaticScroll = true;
    const container = this.scrollContainerTarget;
    const rowHeight = this.#virtualState.rowHeight;
    const headerHeight = this.hasHeaderRowTarget ? this.headerRowTarget.offsetHeight : 0;
    const startScrollTop = container.scrollTop;
    const startScrollLeft = container.scrollLeft;

    if (rowIndex <= 0) {
      container.scrollTop = 0;
    } else {
      const rowStart = (rowIndex - 1) * rowHeight;
      const rowEnd = rowStart + rowHeight;

      ensureBoundsFullyVisible(
        {
          top: headerHeight + rowStart,
          bottom: headerHeight + rowEnd,
          left: container.scrollLeft,
          right: container.scrollLeft,
        },
        container,
        { topInset: headerHeight },
      );
    }

    const centerIndex = this.#virtualState.centerIndexByGlobal.get(columnIndex);
    if (!Number.isInteger(centerIndex)) {
      if (columnIndex === 0) container.scrollLeft = 0;
    } else {
      const colStart = this.#virtualState.centerOffsets[centerIndex] || 0;
      const colWidth = this.#virtualState.centerColumns[centerIndex]?.width || 180;
      const colEnd = colStart + colWidth;

      ensureBoundsFullyVisible(
        {
          top: container.scrollTop,
          bottom: container.scrollTop,
          left: this.#virtualState.stickyTotalWidth + colStart,
          right: this.#virtualState.stickyTotalWidth + colEnd,
        },
        container,
        { leftInset: this.#virtualState.stickyTotalWidth },
      );
    }

    return container.scrollTop !== startScrollTop || container.scrollLeft !== startScrollLeft;
  }

  #renderVirtualGrid({ restoreFocus = true, snapActiveRow = true, allowWindowReuse = false } = {}) {
    if (!this.#virtualMode()) return;

    const hadFocusInside = restoreFocus && (this.#virtualFocusRestorePending || this.#shouldRestoreVirtualFocus());

    const rowItems = this.#manualRowWindow();
    const centerItems = this.#manualCenterWindow();

    const rowWindowKey = rowItems.length > 0 ? `${rowItems[0].index}:${rowItems[rowItems.length - 1].index}` : "empty";
    const centerWindowKey =
      centerItems.length > 0 ? `${centerItems[0].index}:${centerItems[centerItems.length - 1].index}` : "empty";

    if (
      allowWindowReuse &&
      rowWindowKey === this.#lastRenderedRowWindowKey &&
      centerWindowKey === this.#lastRenderedCenterWindowKey
    ) {
      const shouldRestoreFocus = this.#virtualFocusRestorePending || this.#shouldRestoreVirtualFocus();
      if (!restoreFocus || !shouldRestoreFocus) return !restoreFocus;

      const activeCell = this.#cellByCoordinates(
        this.#virtualState.activeRowIndex,
        this.#virtualState.activeColumnIndex,
      );
      if (!activeCell) return false;

      if (this.#virtualState.widgetMode && hasInteractiveElements(activeCell)) {
        focusInteractiveElement(activeCell, null, (cell) => this.#scrollCellIntoView(cell));
        return activeCell.contains(document.activeElement);
      }

      return this.#focusVirtualCellWithRetry(activeCell);
    }

    // Only snap the active row when we intend to restore focus.
    // During passive scrollbar drags the tracked row may be outside the
    // rendered window — that is fine; we just won't have a tabindex="0"
    // cell until the user clicks or presses a key again.
    if (restoreFocus && snapActiveRow) {
      this.#snapActiveRowToWindow(rowItems);
    }

    const activeRowIndex = this.#virtualState.activeRowIndex;
    const activeColumnIndex = this.#virtualState.activeColumnIndex;
    const centerTotalWidth = this.#virtualState.centerTotalWidth;
    const leftSpacerWidth = centerItems.length > 0 ? centerItems[0].start : 0;
    const rightSpacerWidth =
      centerItems.length > 0
        ? Math.max(0, centerTotalWidth - centerItems[centerItems.length - 1].end)
        : centerTotalWidth;

    this.#renderVirtualHeader(centerItems, leftSpacerWidth, rightSpacerWidth, activeRowIndex, activeColumnIndex);
    this.#renderVirtualBody(
      rowItems,
      centerItems,
      leftSpacerWidth,
      rightSpacerWidth,
      activeRowIndex,
      activeColumnIndex,
    );

    this.#lastRenderedRowWindowKey = rowWindowKey;
    this.#lastRenderedCenterWindowKey = centerWindowKey;

    if (!hadFocusInside) return false;

    const activeCell = this.#cellByCoordinates(activeRowIndex, activeColumnIndex);
    if (!activeCell) return false;

    if (this.#virtualState.widgetMode && hasInteractiveElements(activeCell)) {
      focusInteractiveElement(activeCell, null, (cell) => this.#scrollCellIntoView(cell));
      return activeCell.contains(document.activeElement);
    }

    return this.#focusVirtualCellWithRetry(activeCell);
  }

  #focusVirtualCellWithRetry(cell) {
    this.#setActiveCell(cell);
    cell.focus({ preventScroll: true });

    if (document.activeElement === cell) return true;

    queueMicrotask(() => {
      this.#focusCurrentVirtualActiveCell();
    });

    this.#clearVirtualFocusRetryTimers();
    this.#virtualFocusRetryTimer = setTimeout(() => {
      this.#virtualFocusRetryTimer = null;
      if (this.#focusCurrentVirtualActiveCell()) return;

      // Frame-delayed retries for iframe + virtualized rerender timing.
      this.#virtualFocusRetryFrameTimer = setTimeout(() => {
        this.#virtualFocusRetryFrameTimer = null;
        if (this.#focusCurrentVirtualActiveCell()) return;

        this.#virtualFocusRetryLateTimer = setTimeout(() => {
          this.#virtualFocusRetryLateTimer = null;
          this.#focusCurrentVirtualActiveCell();
        }, 48);
      }, 16);
    }, 0);

    return false;
  }

  #clearVirtualFocusRetryTimers() {
    if (this.#virtualFocusRetryTimer) {
      clearTimeout(this.#virtualFocusRetryTimer);
      this.#virtualFocusRetryTimer = null;
    }

    if (this.#virtualFocusRetryFrameTimer) {
      clearTimeout(this.#virtualFocusRetryFrameTimer);
      this.#virtualFocusRetryFrameTimer = null;
    }

    if (this.#virtualFocusRetryLateTimer) {
      clearTimeout(this.#virtualFocusRetryLateTimer);
      this.#virtualFocusRetryLateTimer = null;
    }
  }

  #focusCurrentVirtualActiveCell() {
    if (!this.#virtualMode()) return false;

    const activeCell = this.#cellByCoordinates(this.#virtualState.activeRowIndex, this.#virtualState.activeColumnIndex);
    if (!activeCell) return false;

    this.#setActiveCell(activeCell);
    activeCell.focus({ preventScroll: true });
    return document.activeElement === activeCell;
  }

  #virtualCoordinatesVisible(rowIndex, columnIndex) {
    if (!this.hasScrollContainerTarget) return false;

    const container = this.scrollContainerTarget;
    const headerHeight = this.hasHeaderRowTarget ? this.headerRowTarget.offsetHeight : 0;

    if (rowIndex <= 0) {
      if (container.scrollTop !== 0) return false;
    } else {
      const rowStart = (rowIndex - 1) * this.#virtualState.rowHeight;
      const rowEnd = rowStart + this.#virtualState.rowHeight;
      const maxVisibleRowEnd = container.scrollTop + container.clientHeight - headerHeight;

      if (rowStart < container.scrollTop || rowEnd > maxVisibleRowEnd) {
        return false;
      }
    }

    const centerIndex = this.#virtualState.centerIndexByGlobal.get(columnIndex);
    if (!Number.isInteger(centerIndex)) {
      return columnIndex === 0 || container.scrollLeft === 0;
    }

    const colStart = this.#virtualState.centerOffsets[centerIndex] || 0;
    const colEnd = colStart + (this.#virtualState.centerColumns[centerIndex]?.width || 180);
    const maxVisibleColEnd = container.scrollLeft + container.clientWidth - this.#virtualState.stickyTotalWidth;

    return colStart >= container.scrollLeft && colEnd <= maxVisibleColEnd;
  }

  #isVirtualCellPartiallyVisible(cell) {
    if (!(cell instanceof HTMLElement) || !this.hasScrollContainerTarget) return false;

    const containerRect = this.scrollContainerTarget.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const hasGeometry =
      containerRect.width > 0 && containerRect.height > 0 && cellRect.width > 0 && cellRect.height > 0;

    if (hasGeometry) {
      const headerHeight = this.hasHeaderRowTarget ? this.headerRowTarget.offsetHeight : 0;
      const topBoundary = containerRect.top + headerHeight;
      return cellRect.bottom > topBoundary && cellRect.top < containerRect.bottom;
    }

    // jsdom fallback: geometry is 0x0, so use index math with a 1-row tolerance
    // only when scrollTop is between row boundaries (partial top row visible).
    const rowIndex = Number(cell.getAttribute("data-pathogen--data-grid-row-index"));
    if (!Number.isInteger(rowIndex) || rowIndex <= 0) return false;

    const firstVisibleRowIndex = this.#firstVisibleVirtualRowIndex();
    return rowIndex >= firstVisibleRowIndex;
  }

  #manualRowWindow() {
    const rowHeight = this.#virtualState.rowHeight;
    const rowCount = this.#virtualState.rowCount;
    const overscan = this.#virtualState.overscanRows;
    const scrollTop = this.hasScrollContainerTarget ? this.scrollContainerTarget.scrollTop : 0;
    const viewportHeight =
      this.hasScrollContainerTarget && this.scrollContainerTarget.clientHeight > 0
        ? this.scrollContainerTarget.clientHeight
        : rowHeight * (overscan + 4);

    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(rowCount - 1, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);

    const items = [];
    for (let index = startIndex; index <= endIndex; index += 1) {
      const start = index * rowHeight;
      items.push({
        index,
        start,
        size: rowHeight,
        end: start + rowHeight,
      });
    }

    return items;
  }

  #manualCenterWindow() {
    const centerColumns = this.#virtualState.centerColumns;
    const centerOffsets = this.#virtualState.centerOffsets;
    const overscan = this.#virtualState.overscanColumns;
    const scrollLeft = this.hasScrollContainerTarget ? this.scrollContainerTarget.scrollLeft : 0;
    const viewportWidth =
      this.hasScrollContainerTarget && this.scrollContainerTarget.clientWidth > 0
        ? Math.max(1, this.scrollContainerTarget.clientWidth - this.#virtualState.stickyTotalWidth)
        : 1200;

    const visibleStart = Math.max(0, scrollLeft);
    const visibleEnd = visibleStart + viewportWidth;

    let startIndex = 0;
    while (
      startIndex < centerColumns.length - 1 &&
      centerOffsets[startIndex] + centerColumns[startIndex].width <= visibleStart
    ) {
      startIndex += 1;
    }

    let endIndex = startIndex;
    while (endIndex < centerColumns.length - 1 && centerOffsets[endIndex] < visibleEnd) {
      endIndex += 1;
    }

    startIndex = Math.max(0, startIndex - overscan);
    endIndex = Math.min(centerColumns.length - 1, endIndex + overscan);

    const items = [];
    for (let index = startIndex; index <= endIndex; index += 1) {
      const start = centerOffsets[index] || 0;
      const size = centerColumns[index].width;
      items.push({
        index,
        start,
        size,
        end: start + size,
      });
    }

    return items;
  }

  #renderVirtualHeader(centerItems, leftSpacerWidth, rightSpacerWidth, activeRowIndex, activeColumnIndex) {
    const fragment = document.createDocumentFragment();

    this.#virtualState.stickyColumns.forEach((column) => {
      fragment.appendChild(
        this.#buildVirtualCell({
          rowIndex: 0,
          column,
          active: activeRowIndex === 0 && activeColumnIndex === column.globalIndex,
          header: true,
        }),
      );
    });

    if (leftSpacerWidth > 0) {
      fragment.appendChild(this.#horizontalSpacerCell({ width: leftSpacerWidth, header: true, atStart: true }));
    }

    centerItems.forEach((virtualItem) => {
      const column = this.#virtualState.centerColumns[virtualItem.index];
      if (!column) return;

      fragment.appendChild(
        this.#buildVirtualCell({
          rowIndex: 0,
          column,
          active: activeRowIndex === 0 && activeColumnIndex === column.globalIndex,
          header: true,
        }),
      );
    });

    if (rightSpacerWidth > 0) {
      fragment.appendChild(this.#horizontalSpacerCell({ width: rightSpacerWidth, header: true, atStart: false }));
    }

    this.headerRowTarget.replaceChildren(fragment);
  }

  #renderVirtualBody(rowItems, centerItems, leftSpacerWidth, rightSpacerWidth, activeRowIndex, activeColumnIndex) {
    const fragment = document.createDocumentFragment();
    const totalRowSize = this.#virtualState.rowCount * this.#virtualState.rowHeight;
    const topSpacerHeight = rowItems.length > 0 ? rowItems[0].start : 0;
    const bottomSpacerHeight =
      rowItems.length > 0 ? Math.max(0, totalRowSize - rowItems[rowItems.length - 1].end) : totalRowSize;

    if (topSpacerHeight > 0) {
      fragment.appendChild(this.#verticalSpacerRow(topSpacerHeight));
    }

    rowItems.forEach((virtualRow) => {
      const rowIndex = virtualRow.index + 1;
      const row = document.createElement("tr");
      row.className = "pathogen-data-grid__row";
      row.setAttribute("role", "row");
      row.style.height = `${virtualRow.size}px`;

      this.#virtualState.stickyColumns.forEach((column) => {
        row.appendChild(
          this.#buildVirtualCell({
            rowIndex,
            column,
            active: activeRowIndex === rowIndex && activeColumnIndex === column.globalIndex,
            header: false,
          }),
        );
      });

      if (leftSpacerWidth > 0) {
        row.appendChild(this.#horizontalSpacerCell({ width: leftSpacerWidth, header: false, atStart: true }));
      }

      centerItems.forEach((virtualColumn) => {
        const column = this.#virtualState.centerColumns[virtualColumn.index];
        if (!column) return;

        row.appendChild(
          this.#buildVirtualCell({
            rowIndex,
            column,
            active: activeRowIndex === rowIndex && activeColumnIndex === column.globalIndex,
            header: false,
          }),
        );
      });

      if (rightSpacerWidth > 0) {
        row.appendChild(this.#horizontalSpacerCell({ width: rightSpacerWidth, header: false, atStart: false }));
      }

      fragment.appendChild(row);
    });

    if (bottomSpacerHeight > 0) {
      fragment.appendChild(this.#verticalSpacerRow(bottomSpacerHeight));
    }

    this.bodyTarget.replaceChildren(fragment);
  }

  #buildVirtualCell({ rowIndex, column, active, header }) {
    const cell = document.createElement(header ? "th" : "td");
    const role = header ? "columnheader" : "gridcell";
    const kind = column.kind === "text" && column.interactive ? "button" : column.kind;
    const interactive = !header && (column.interactive || interactiveByKind(kind));
    const styles = [`--pathogen-data-grid-col-width: ${column.width}px;`];
    const classes = ["pathogen-data-grid__cell", `pathogen-data-grid__cell--${header ? "header" : "body"}`];

    if (column.sticky) {
      classes.push("pathogen-data-grid__cell--sticky");
      styles.push(`--pathogen-data-grid-sticky-left: ${column.stickyLeft}px;`);
    }

    cell.className = classes.join(" ");
    cell.setAttribute("role", role);
    cell.setAttribute("tabindex", active ? "0" : "-1");
    cell.setAttribute("style", styles.join(" "));
    if (header) cell.setAttribute("scope", "col");
    if (active) cell.setAttribute("data-pathogen--data-grid-active", "true");

    applyDataAttributes(cell, buildDataAttributes(rowIndex, column.globalIndex, interactive));

    if (header) {
      const label = document.createElement("span");
      label.className = "pathogen-data-grid__header-label";
      label.textContent = column.label;
      cell.appendChild(label);
      return cell;
    }

    const content = this.#buildVirtualCellContent(rowIndex, column, kind);
    if (content.interactiveElement) {
      content.interactiveElement.tabIndex = -1;
      cell.appendChild(content.interactiveElement);
    } else {
      cell.textContent = content.text;
    }

    return cell;
  }

  #buildVirtualCellContent(rowIndex, column, kind) {
    const value =
      this.#virtualState.mode === "static"
        ? valueFromStaticRows(this.#virtualState.rows, rowIndex, column.id)
        : syntheticValue(rowIndex, column.globalIndex);

    const defaultText = syntheticValue(rowIndex, column.globalIndex);
    const text = virtualCellText(value, defaultText);

    if (kind === "link") {
      const link = document.createElement("a");
      link.className = "pathogen-data-grid__link pathogen-data-grid__link--subtle";
      link.href = typeof value === "object" && value && typeof value.href === "string" ? value.href : "#";
      link.textContent = text;
      return { interactiveElement: link };
    }

    if (kind === "button") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pathogen-u-link";
      button.textContent = text;
      return { interactiveElement: button };
    }

    return { text };
  }

  #horizontalSpacerCell({ width, header, atStart }) {
    const cell = document.createElement(header ? "th" : "td");
    cell.className = "pathogen-data-grid__cell pathogen-data-grid__cell--spacer";
    cell.setAttribute("role", header ? "columnheader" : "gridcell");
    cell.setAttribute("aria-hidden", "true");
    cell.setAttribute("tabindex", "-1");
    cell.style.width = `${width}px`;
    cell.style.minWidth = `${width}px`;
    cell.style.maxWidth = `${width}px`;
    cell.dataset.pathogenDataGridSpacer = atStart ? "leading" : "trailing";
    return cell;
  }

  #verticalSpacerRow(height) {
    const row = document.createElement("tr");
    row.className = "pathogen-data-grid__row pathogen-data-grid__row--spacer";
    row.setAttribute("role", "presentation");

    const cell = document.createElement("td");
    cell.className = "pathogen-data-grid__cell pathogen-data-grid__cell--spacer";
    cell.setAttribute("role", "presentation");
    cell.setAttribute("colspan", String(Math.max(1, this.#virtualState.columns.length + 2)));
    cell.style.height = `${height}px`;
    cell.style.padding = "0";
    cell.style.border = "0";

    row.appendChild(cell);
    return row;
  }

  // ── Common helpers ────────────────────────────────────────────────────────

  #activeCell() {
    if (!this.hasGridTarget) return null;

    const cells = this.#allCells();
    const fromFocused = this.#resolveCell(document.activeElement);
    if (fromFocused && cells.includes(fromFocused)) return fromFocused;

    if (this.#virtualMode()) {
      const activeVirtualCell = this.#cellByCoordinates(
        this.#virtualState.activeRowIndex,
        this.#virtualState.activeColumnIndex,
      );
      if (activeVirtualCell) return activeVirtualCell;
    }

    return (
      cells.find((cell) => cell.matches(ACTIVE_CELL_SELECTOR)) ||
      cells.find((cell) => cell.matches(FOCUSABLE_CELL_SELECTOR)) ||
      firstDataCell(cells)
    );
  }

  #allCells() {
    return [...this.element.querySelectorAll(CELL_SELECTOR)];
  }

  #focusCell(cell) {
    this.#setActiveCell(cell);
    cell.focus({ preventScroll: true });

    if (this.#virtualMode()) {
      this.#programmaticScroll = true;
      this.#virtualFocusRestorePending = true;
      const didScroll = this.#scrollVirtualCoordinatesIntoView(
        this.#virtualState.activeRowIndex,
        this.#virtualState.activeColumnIndex,
      );
      if (!didScroll) {
        this.#programmaticScroll = false;
        this.#virtualFocusRestorePending = false;
      }
      return;
    }

    this.#scrollCellIntoView(cell);
  }

  #scrollCellIntoView(cell) {
    const container = this.hasScrollContainerTarget ? this.scrollContainerTarget : null;
    const startScrollTop = container?.scrollTop ?? 0;
    const startScrollLeft = container?.scrollLeft ?? 0;

    ensureCellFullyVisible(cell, container, this.hasGridTarget ? this.gridTarget : null);

    if (!container) return false;
    return container.scrollTop !== startScrollTop || container.scrollLeft !== startScrollLeft;
  }

  #focusAdjacentInteractiveCell(cell, direction) {
    const cells = this.#allCells();
    const startIndex = cells.indexOf(cell);
    if (startIndex === -1) return false;

    let index = startIndex + direction;
    while (index >= 0 && index < cells.length) {
      const candidate = cells[index];
      if (hasInteractiveElements(candidate)) {
        this.#setActiveCell(candidate);
        if (this.#virtualMode()) this.#virtualState.widgetMode = true;
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
    if (this.#virtualMode()) {
      return virtualPageSize(this.scrollContainerTarget, this.#virtualState.rowHeight);
    }

    const firstDataRow = this.gridTarget.querySelector("tbody tr");
    const rowHeight = firstDataRow?.offsetHeight || 1;

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
    const rowIndex = Number(cell.getAttribute("data-pathogen--data-grid-row-index"));
    const columnIndex = Number(cell.getAttribute("data-pathogen--data-grid-column-index"));

    if (this.#virtualMode() && Number.isInteger(rowIndex) && Number.isInteger(columnIndex)) {
      this.#virtualState.activeRowIndex = rowIndex;
      this.#virtualState.activeColumnIndex = columnIndex;
    }

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

  #cellByCoordinates(rowIndex, columnIndex) {
    return this.gridTarget.querySelector(
      `${CELL_SELECTOR}[data-pathogen--data-grid-row-index="${rowIndex}"][data-pathogen--data-grid-column-index="${columnIndex}"]`,
    );
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

    this.element.addEventListener("focusout", (event) => this.handleFocusout(event), {
      signal,
    });

    this.element.addEventListener("click", (event) => this.handleClick(event), {
      signal,
    });
  }

  #shouldRestoreVirtualFocus() {
    if (!this.#virtualMode()) return false;
    return this.#virtualFocusWithin || this.element.contains(document.activeElement);
  }
}
