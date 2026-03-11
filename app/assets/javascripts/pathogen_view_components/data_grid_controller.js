import { Controller } from "@hotwired/stimulus";

const INTERACTIVE_SELECTOR = "a, button, input, select, textarea";
const NAVIGATION_KEYS = new Set([
  "ArrowRight",
  "ArrowLeft",
  "ArrowDown",
  "ArrowUp",
  "Home",
  "End",
  "PageDown",
  "PageUp",
  "Tab",
]);

const ENTER_WIDGET_MODE_KEYS = new Set(["Enter", "F2"]);

export default class extends Controller {
  static targets = ["grid", "scrollContainer"];
  #abortController = null;

  connect() {
    this.element.dataset.pathogenDataGridConnected = "true";
    this.#abortController = new AbortController();
    const { signal } = this.#abortController;

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

    this.#ensureActiveCell();
  }

  disconnect() {
    this.#abortController?.abort();
    this.#abortController = null;
  }

  handleFocusin(event) {
    const cell = this.#resolveCell(event.target);
    if (!cell) return;

    this.#setActiveCell(cell);

    const interactiveTarget = this.#resolveInteractiveTarget(event.target, cell);
    if (interactiveTarget) {
      this.#activateInteractiveElement(cell, interactiveTarget);
    }
  }

  handleClick(event) {
    const cell = this.#resolveCell(event.target);
    if (!cell) return;

    const interactiveTarget = this.#resolveInteractiveTarget(event.target, cell);
    if (interactiveTarget) {
      this.#setActiveCell(cell);
      this.#activateInteractiveElement(cell, interactiveTarget);
      return;
    }

    event.preventDefault();
    this.#focusCell(cell);
  }

  handleKeydown(event) {
    if (!this.hasGridTarget) return;

    const activeCell = this.#activeCell();
    if (!activeCell) return;

    if (event.defaultPrevented) return;

    if (this.#isInteractiveEventTarget(event.target, activeCell)) {
      this.#handleInteractiveKeydown(event, activeCell);
      return;
    }

    if (
      this.#hasInteractiveElements(activeCell) &&
      ENTER_WIDGET_MODE_KEYS.has(event.key)
    ) {
      event.preventDefault();
      this.#focusInteractiveElement(activeCell);
      return;
    }

    if (event.key === "Tab") {
      this.#handleTab(event, activeCell);
      return;
    }

    if (!NAVIGATION_KEYS.has(event.key)) return;

    const nextCell = this.#nextCellForEvent(activeCell, event);
    if (!nextCell) return;

    event.preventDefault();
    this.#focusCell(nextCell);
  }

  #activeCell() {
    if (!this.hasGridTarget) return null;

    const fromFocusedElement = this.#resolveCell(document.activeElement);
    if (fromFocusedElement && this.gridTarget.contains(fromFocusedElement)) {
      return fromFocusedElement;
    }

    return (
      this.gridTarget.querySelector(
        '[data-pathogen--data-grid-target~="cell"][data-pathogen--data-grid-active="true"]',
      ) ||
      this.gridTarget.querySelector(
        '[data-pathogen--data-grid-target~="cell"][tabindex="0"]',
      ) || this.#firstDataCell()
    );
  }

  #allCells() {
    if (!this.hasGridTarget) return [];

    return Array.from(
      this.gridTarget.querySelectorAll(
        '[data-pathogen--data-grid-target~="cell"]',
      ),
    );
  }

  #buildCellMap() {
    const map = new Map();

    this.#allCells().forEach((cell) => {
      const rowIndex = this.#rowIndex(cell);
      if (rowIndex === null) return;

      if (!map.has(rowIndex)) {
        map.set(rowIndex, []);
      }

      map.get(rowIndex).push(cell);
    });

    map.forEach((cells) => {
      cells.sort((a, b) => this.#columnIndex(a) - this.#columnIndex(b));
    });

    return map;
  }

  #cellAt(rowIndex, columnIndex, map) {
    const rowCells = map.get(rowIndex);
    if (!rowCells || rowCells.length === 0) return null;

    const exactMatch = rowCells.find((cell) => this.#columnIndex(cell) === columnIndex);
    if (exactMatch) return exactMatch;

    const fallback = rowCells
      .filter((cell) => this.#columnIndex(cell) <= columnIndex)
      .pop();

    return fallback || rowCells[0];
  }

  #columnIndex(cell) {
    return Number(cell.getAttribute("data-pathogen--data-grid-column-index"));
  }

  #firstDataCell() {
    if (!this.hasGridTarget) return null;

    return this.gridTarget.querySelector(
      '[data-pathogen--data-grid-target~="cell"][data-pathogen--data-grid-row-index="1"][data-pathogen--data-grid-column-index="0"]',
    );
  }

  #focusCell(cell) {
    this.#setActiveCell(cell);
    cell.focus({ preventScroll: true });
    this.#ensureCellFullyVisible(cell);
  }

  #lastDataRowIndex(map) {
    return Math.max(
      ...Array.from(map.keys()).filter((rowIndex) => rowIndex > 0),
      0,
    );
  }

  #nextCellForEvent(activeCell, event) {
    const map = this.#buildCellMap();
    if (map.size === 0) return null;

    const rowIndex = this.#rowIndex(activeCell);
    const columnIndex = this.#columnIndex(activeCell);
    const lastDataRow = this.#lastDataRowIndex(map);

    if (rowIndex === null || Number.isNaN(columnIndex)) return null;

    if ((event.ctrlKey || event.metaKey) && event.key === "Home") {
      return this.#cellAt(0, 0, map);
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "End") {
      return this.#lastDataCell(map, lastDataRow);
    }

    switch (event.key) {
      case "ArrowRight":
        return this.#nextHorizontalCell(map, rowIndex, columnIndex, 1);
      case "ArrowLeft":
        return this.#nextHorizontalCell(map, rowIndex, columnIndex, -1);
      case "ArrowDown":
        return this.#nextVerticalCell(map, rowIndex, columnIndex, 1, lastDataRow);
      case "ArrowUp":
        return this.#nextVerticalCell(map, rowIndex, columnIndex, -1, lastDataRow);
      case "Home":
        return this.#cellAt(rowIndex, 0, map);
      case "End":
        return this.#lastCellInRow(map, rowIndex);
      case "PageDown":
        return this.#pageCell(map, rowIndex, columnIndex, 1, lastDataRow);
      case "PageUp":
        return this.#pageCell(map, rowIndex, columnIndex, -1, lastDataRow);
      default:
        return null;
    }
  }

  #lastCellInRow(map, rowIndex) {
    const rowCells = map.get(rowIndex);
    if (!rowCells || rowCells.length === 0) return null;

    return rowCells[rowCells.length - 1];
  }

  #lastDataCell(map, lastDataRow) {
    const rowCells = map.get(lastDataRow);
    if (!rowCells || rowCells.length === 0) return null;

    return rowCells[rowCells.length - 1];
  }

  #nextHorizontalCell(map, rowIndex, columnIndex, direction) {
    const rowCells = map.get(rowIndex);
    if (!rowCells || rowCells.length === 0) return null;

    const currentPosition = rowCells.findIndex((cell) => this.#columnIndex(cell) === columnIndex);
    if (currentPosition === -1) return null;

    const nextPosition = currentPosition + direction;
    if (nextPosition >= 0 && nextPosition < rowCells.length) {
      return rowCells[nextPosition];
    }

    if (direction > 0) {
      const nextRow = this.#nextRowWithCells(map, rowIndex + 1, 1);
      return nextRow === null ? null : this.#cellAt(nextRow, 0, map);
    }

    const previousRow = this.#nextRowWithCells(map, rowIndex - 1, -1);
    return previousRow === null ? null : this.#lastCellInRow(map, previousRow);
  }

  #nextRowWithCells(map, startRow, direction) {
    const rows = Array.from(map.keys());
    const limit = direction > 0 ? Math.max(...rows) : Math.min(...rows);

    let row = startRow;
    while (direction > 0 ? row <= limit : row >= limit) {
      const rowCells = map.get(row);
      if (rowCells && rowCells.length > 0) return row;
      row += direction;
    }

    return null;
  }

  #nextVerticalCell(map, rowIndex, columnIndex, direction, lastDataRow) {
    if (direction < 0 && rowIndex === 0) return null;

    if (direction > 0) {
      if (rowIndex >= lastDataRow) return null;
      const nextRow = this.#nextRowWithCells(map, rowIndex + 1, 1);
      if (nextRow === null) return null;
      return this.#cellAt(nextRow, columnIndex, map);
    }

    const previousRow = this.#nextRowWithCells(map, rowIndex - 1, -1);
    if (previousRow === null) return null;
    return this.#cellAt(previousRow, columnIndex, map);
  }

  #pageCell(map, rowIndex, columnIndex, direction, lastDataRow) {
    if (lastDataRow < 1) return null;

    const pageSize = this.#pageSize();
    if (direction > 0) {
      const baselineRow = rowIndex === 0 ? 1 : rowIndex;
      const clampedTarget = Math.min(lastDataRow, baselineRow + pageSize);
      const targetRow = this.#nextRowWithCells(map, clampedTarget, -1);
      if (targetRow === null) return null;
      return this.#cellAt(targetRow, columnIndex, map);
    }

    if (rowIndex === 0) return null;

    const clampedTarget = Math.max(1, rowIndex - pageSize);
    const targetRow = this.#nextRowWithCells(map, clampedTarget, 1);
    if (targetRow === null) return null;
    return this.#cellAt(targetRow, columnIndex, map);
  }

  #pageSize() {
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

    return target.closest('[data-pathogen--data-grid-target~="cell"]');
  }

  #resolveInteractiveTarget(target, cell) {
    if (!(target instanceof HTMLElement) || !cell) return null;

    const interactiveTarget = target.closest(INTERACTIVE_SELECTOR);
    if (!interactiveTarget) return null;

    return cell.contains(interactiveTarget) ? interactiveTarget : null;
  }

  #isInteractiveEventTarget(target, cell) {
    return this.#resolveInteractiveTarget(target, cell) !== null;
  }

  #interactiveElements(cell) {
    return Array.from(cell.querySelectorAll(INTERACTIVE_SELECTOR));
  }

  #hasInteractiveElements(cell) {
    return cell.getAttribute("data-pathogen--data-grid-has-interactive") === "true";
  }

  #rowIndex(cell) {
    const value = Number(cell.getAttribute("data-pathogen--data-grid-row-index"));
    return Number.isNaN(value) ? null : value;
  }

  #setActiveCell(cell) {
    this.#allCells().forEach((node) => {
      node.removeAttribute("data-pathogen--data-grid-active");
    });

    cell.setAttribute("data-pathogen--data-grid-active", "true");
    this.#allCells().forEach((node) => {
      node.tabIndex = node === cell ? 0 : -1;
      this.#interactiveElements(node).forEach((interactiveNode) => {
        interactiveNode.tabIndex = -1;
      });
    });
  }

  #ensureActiveCell() {
    const activeCell = this.#activeCell();
    if (!activeCell) return;

    this.#focusCell(activeCell);
  }

  #ensureCellFullyVisible(cell) {
    if (!(cell instanceof HTMLElement)) return;

    if (!this.hasScrollContainerTarget) {
      cell.scrollIntoView({ block: "nearest", inline: "nearest" });
      return;
    }

    const container = this.scrollContainerTarget;
    const containerRect = container.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();

    const stickyOverlap = this.#stickyOverlayWidth(containerRect);
    const isStickyCell = cell.classList.contains("pathogen-data-grid__cell--sticky");
    const minVisibleLeft = containerRect.left + (isStickyCell ? 0 : stickyOverlap);
    const maxVisibleRight = containerRect.right;

    if (cellRect.top < containerRect.top) {
      container.scrollTop -= containerRect.top - cellRect.top;
    } else if (cellRect.bottom > containerRect.bottom) {
      container.scrollTop += cellRect.bottom - containerRect.bottom;
    }

    if (cellRect.left < minVisibleLeft) {
      container.scrollLeft -= minVisibleLeft - cellRect.left;
    } else if (cellRect.right > maxVisibleRight) {
      container.scrollLeft += cellRect.right - maxVisibleRight;
    }
  }

  #stickyOverlayWidth(containerRect) {
    if (!this.hasGridTarget) return 0;

    const stickyCells = this.gridTarget.querySelectorAll(
      '.pathogen-data-grid__cell--sticky[data-pathogen--data-grid-row-index="1"], .pathogen-data-grid__cell--header.pathogen-data-grid__cell--sticky',
    );

    if (stickyCells.length === 0) return 0;

    let maxInlineEnd = 0;
    stickyCells.forEach((stickyCell) => {
      const stickyRect = stickyCell.getBoundingClientRect();
      maxInlineEnd = Math.max(maxInlineEnd, stickyRect.right - containerRect.left);
    });

    return Math.max(0, maxInlineEnd);
  }

  #activateInteractiveElement(cell, targetElement) {
    const interactiveElements = this.#interactiveElements(cell);
    if (interactiveElements.length === 0 || !targetElement) return;

    cell.tabIndex = -1;
    interactiveElements.forEach((element) => {
      element.tabIndex = element === targetElement ? 0 : -1;
    });
  }

  #focusInteractiveElement(cell, targetElement = null) {
    const interactiveElements = this.#interactiveElements(cell);
    if (interactiveElements.length === 0) return;

    const nextTarget =
      targetElement && interactiveElements.includes(targetElement)
        ? targetElement
        : interactiveElements[0];

    this.#activateInteractiveElement(cell, nextTarget);
    nextTarget.focus({ preventScroll: true });
    this.#ensureCellFullyVisible(cell);
  }

  #handleInteractiveKeydown(event, activeCell) {
    if (event.key === "Escape") {
      event.preventDefault();
      this.#focusCell(activeCell);
      return;
    }

    if (event.key === "Tab") {
      this.#handleTab(event, activeCell);
    }
  }

  #handleTab(event, activeCell) {
    if (!this.#hasInteractiveElements(activeCell)) return;

    const interactiveElements = this.#interactiveElements(activeCell);
    if (interactiveElements.length <= 1) return;

    const activeElement =
      event.target instanceof HTMLElement
        ? event.target.closest(INTERACTIVE_SELECTOR)
        : null;
    const activeIndex = interactiveElements.indexOf(activeElement);

    if (event.shiftKey) {
      if (activeIndex > 0) {
        event.preventDefault();
        const previous = interactiveElements[activeIndex - 1];
        this.#activateInteractiveElement(activeCell, previous);
        previous.focus({ preventScroll: true });
        this.#ensureCellFullyVisible(activeCell);
      }
      return;
    }

    if (activeIndex >= 0 && activeIndex < interactiveElements.length - 1) {
      event.preventDefault();
      const next = interactiveElements[activeIndex + 1];
      this.#activateInteractiveElement(activeCell, next);
      next.focus({ preventScroll: true });
      this.#ensureCellFullyVisible(activeCell);
      return;
    }

    if (activeIndex === -1) {
      event.preventDefault();
      const first = interactiveElements[0];
      this.#activateInteractiveElement(activeCell, first);
      first.focus({ preventScroll: true });
      this.#ensureCellFullyVisible(activeCell);
    }
  }
}
