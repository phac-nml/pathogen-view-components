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
    activeRowIndex: 1,
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

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  connect() {
    this.#abortController?.abort();
    this.#abortController = new AbortController();
    this.#bindEvents(this.#abortController.signal);

    if (this.virtualValue) {
      this.#connectVirtualMode();
    }
  }

  disconnect() {
    this.#abortController?.abort();
    this.#abortController = null;
    this.#virtualState = null;
  }

  // ── DOM event handlers ────────────────────────────────────────────────────

  handleFocusin(event) {
    const cell = this.#resolveCell(event.target);
    if (!cell) return;

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
      this.#setActiveCell(cell);
      activateInteractiveElement(cell, interactiveTarget);
      if (this.#virtualMode()) this.#virtualState.widgetMode = true;
      return;
    }

    // Prevent default to avoid text-selection flicker when clicking to focus a plain cell.
    event.preventDefault();
    this.#focusCell(cell);
    if (this.#virtualMode()) this.#virtualState.widgetMode = false;
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

    this.#bindVirtualRenderEvents();
    this.#renderVirtualGrid({ restoreFocus: false });
  }

  #bindVirtualRenderEvents() {
    const render = () => this.#renderVirtualGrid({ restoreFocus: this.element.contains(document.activeElement) });

    this.scrollContainerTarget.addEventListener("scroll", render, {
      signal: this.#abortController.signal,
      passive: true,
    });

    let resizeTimer = null;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 100);
    };
    window.addEventListener("resize", onResize, {
      signal: this.#abortController.signal,
      passive: true,
    });
  }

  #handleVirtualKeydown(event) {
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
    if (!nextCoordinates) return;

    event.preventDefault();
    this.#virtualState.widgetMode = false;
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

  #focusVirtualCoordinates(rowIndex, columnIndex) {
    this.#virtualState.activeRowIndex = rowIndex;
    this.#virtualState.activeColumnIndex = columnIndex;
    this.#scrollVirtualCoordinatesIntoView(rowIndex, columnIndex);

    this.#renderVirtualGrid({ restoreFocus: true });
  }

  #scrollVirtualCoordinatesIntoView(rowIndex, columnIndex) {
    if (!this.hasScrollContainerTarget) return;

    const container = this.scrollContainerTarget;
    const rowHeight = this.#virtualState.rowHeight;

    if (rowIndex <= 0) {
      container.scrollTop = 0;
    } else {
      const rowStart = (rowIndex - 1) * rowHeight;
      const rowEnd = rowStart + rowHeight;
      const viewportStart = container.scrollTop;
      const viewportEnd = viewportStart + container.clientHeight;

      if (rowStart < viewportStart) {
        container.scrollTop = rowStart;
      } else if (rowEnd > viewportEnd) {
        container.scrollTop = Math.max(0, rowEnd - container.clientHeight);
      }
    }

    const centerIndex = this.#virtualState.centerIndexByGlobal.get(columnIndex);
    if (!Number.isInteger(centerIndex)) {
      container.scrollLeft = 0;
      return;
    }

    const colStart = this.#virtualState.centerOffsets[centerIndex] || 0;
    const colWidth = this.#virtualState.centerColumns[centerIndex]?.width || 180;
    const colEnd = colStart + colWidth;
    const visibleWidth = Math.max(1, container.clientWidth - this.#virtualState.stickyTotalWidth);
    const viewportStart = container.scrollLeft;
    const viewportEnd = viewportStart + visibleWidth;

    if (colStart < viewportStart) {
      container.scrollLeft = colStart;
    } else if (colEnd > viewportEnd) {
      container.scrollLeft = Math.max(0, colEnd - visibleWidth);
    }
  }

  #renderVirtualGrid({ restoreFocus = true } = {}) {
    if (!this.#virtualMode()) return;

    const hadFocusInside = restoreFocus && this.element.contains(document.activeElement);
    const activeRowIndex = this.#virtualState.activeRowIndex;
    const activeColumnIndex = this.#virtualState.activeColumnIndex;

    const rowItems = this.#manualRowWindow();
    const centerItems = this.#manualCenterWindow();
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

    if (!hadFocusInside) return;

    const activeCell = this.#cellByCoordinates(activeRowIndex, activeColumnIndex);
    if (!activeCell) return;

    if (this.#virtualState.widgetMode && hasInteractiveElements(activeCell)) {
      focusInteractiveElement(activeCell, null, (cell) => this.#scrollCellIntoView(cell));
      return;
    }

    activeCell.focus({ preventScroll: true });
    this.#scrollCellIntoView(activeCell);
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
    if (this.#virtualMode()) {
      const activeVirtualCell = this.#cellByCoordinates(
        this.#virtualState.activeRowIndex,
        this.#virtualState.activeColumnIndex,
      );
      if (activeVirtualCell) return activeVirtualCell;
    }

    const fromFocused = this.#resolveCell(document.activeElement);
    if (fromFocused && cells.includes(fromFocused)) return fromFocused;

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

    this.element.addEventListener("click", (event) => this.handleClick(event), {
      signal,
    });
  }
}
