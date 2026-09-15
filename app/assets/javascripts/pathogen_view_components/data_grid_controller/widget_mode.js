// Widget mode — manages interactive element focus within a grid cell.
//
// In grid mode, focus lives on the cell (td/th).
// Widget mode is entered via Enter/F2, transferring focus to an interactive
// descendant. Escape returns focus to the cell. Tab cycles between multiple
// interactive elements within the cell while in widget mode.

const INTERACTIVE_SELECTOR = 'a[href], button, input:not([type="hidden"]), select, textarea';
const WIDGET_NEXT_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const WIDGET_PREVIOUS_KEYS = new Set(["ArrowLeft", "ArrowUp"]);
const ARROW_CONSUMING_INPUT_TYPES = new Set([
  "color",
  "date",
  "datetime-local",
  "email",
  "month",
  "number",
  "password",
  "radio",
  "range",
  "search",
  "tel",
  "text",
  "time",
  "url",
  "week",
]);

/**
 * Returns interactive descendants that can receive focus in widget mode.
 * @param {HTMLElement} cell
 * @returns {HTMLElement[]}
 */
export function interactiveElements(cell) {
  return Array.from(cell.querySelectorAll(INTERACTIVE_SELECTOR)).filter(isAvailableWidget);
}

function isAvailableWidget(element) {
  if (element.matches(":disabled") || element.closest("[hidden], [inert]")) return false;

  const view = element.ownerDocument.defaultView;
  const elementStyle = view.getComputedStyle(element);
  if (elementStyle.visibility === "hidden" || elementStyle.visibility === "collapse") return false;

  for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
    const style = ancestor === element ? elementStyle : view.getComputedStyle(ancestor);
    if (style.display === "none" || style.contentVisibility === "hidden") return false;
    if (ancestor.matches("details:not([open])")) {
      const summary = ancestor.querySelector(":scope > summary");
      if (!summary?.contains(element)) return false;
    }
  }

  return true;
}

/**
 * Returns true when the cell has been marked as containing interactive elements.
 * @param {HTMLElement} cell
 * @returns {boolean}
 */
export function hasInteractiveElements(cell) {
  return cell.getAttribute("data-pathogen--data-grid-has-interactive") === "true";
}

/**
 * Returns the interactive descendant that contains (or is) the given target,
 * or null if target is not inside an interactive element within the cell.
 * @param {EventTarget} target
 * @param {HTMLElement} cell
 * @returns {HTMLElement|null}
 */
export function resolveInteractiveTarget(target, cell) {
  if (!(target instanceof HTMLElement) || !cell) return null;

  const match = target.closest(INTERACTIVE_SELECTOR);
  if (!match) return null;

  return cell.contains(match) && isAvailableWidget(match) ? match : null;
}

/**
 * Transfers the roving tabindex from the cell to the given interactive element.
 * All other interactive elements in the cell get tabindex="-1".
 * @param {HTMLElement} cell
 * @param {HTMLElement} targetElement
 * @param {HTMLElement[]} [elements] - Available widgets already checked for this interaction
 */
export function activateInteractiveElement(cell, targetElement, elements = interactiveElements(cell)) {
  if (!elements.includes(targetElement)) return;

  cell.tabIndex = -1;
  elements.forEach((el) => {
    el.tabIndex = el === targetElement ? 0 : -1;
  });
}

/**
 * Enters widget mode by focusing the first (or specified) interactive element.
 * @param {HTMLElement} cell
 * @param {HTMLElement|null} targetElement  - specific element to focus, or null for first
 * @param {function} onVisible  - called after focus to ensure the cell is scrolled into view
 * @param {HTMLElement[]} [elements] - Available widgets already checked for this interaction
 * @returns {boolean} Whether focus moved to the requested widget
 */
export function focusInteractiveElement(cell, targetElement, onVisible, elements = interactiveElements(cell)) {
  if (elements.length === 0) return false;

  const next = targetElement && elements.includes(targetElement) ? targetElement : elements[0];

  next.focus({ preventScroll: true });
  if (next.ownerDocument.activeElement !== next) return false;

  activateInteractiveElement(cell, next, elements);
  onVisible?.(cell);
  return true;
}

/**
 * Handles keydown events when focus is on an interactive descendant (widget mode).
 * - Escape: exit widget mode (returns focus to cell)
 * - Tab: cycle through interactive elements in the cell
 * - Arrow keys: move focus between widgets in the same cell when appropriate
 *
 * @param {KeyboardEvent} event
 * @param {HTMLElement} activeCell
 * @param {object} callbacks
 * @param {function} callbacks.exitWidgetMode - called with (cell) to restore cell focus
 * @param {function} callbacks.moveToInteractiveCell
 */
export function handleInteractiveKeydown(event, activeCell, { exitWidgetMode, moveToInteractiveCell }) {
  if (event.key === "Escape") {
    exitWidgetMode(activeCell);
    if (activeCell.ownerDocument.activeElement === activeCell) event.preventDefault();
    return;
  }

  if (event.key === "Tab") {
    handleTab(event, activeCell, { moveToInteractiveCell });
    return;
  }

  if (WIDGET_NEXT_KEYS.has(event.key) || WIDGET_PREVIOUS_KEYS.has(event.key)) {
    handleWidgetArrow(event, activeCell);
  }
}

/**
 * Cycles Tab/Shift+Tab through interactive elements within a cell (widget mode only).
 * Only intercepts Tab when activeIndex >= 0 (i.e., an interactive element has focus).
 * Allows Tab to fall through when at the last (or only) element so the browser
 * can move focus outside the grid.
 *
 * @param {KeyboardEvent} event
 * @param {HTMLElement} activeCell
 * @param {object} callbacks
 * @param {function} callbacks.moveToInteractiveCell
 */
export function handleTab(event, activeCell, { moveToInteractiveCell }) {
  if (!hasInteractiveElements(activeCell)) return;

  const focused = event.target instanceof HTMLElement ? event.target.closest(INTERACTIVE_SELECTOR) : null;
  if (!focused || !activeCell.contains(focused)) return;

  const elements = interactiveElements(activeCell);
  const activeIndex = elements.indexOf(focused);

  // Only act when an interactive element already has focus (widget mode).
  // If activeIndex is -1 (focus is on the cell), Tab exits the grid — don't intercept.
  if (activeIndex < 0) return;

  if (event.shiftKey) {
    if (activeIndex > 0) {
      const previous = elements[activeIndex - 1];
      if (focusInteractiveElement(activeCell, previous, null, elements)) event.preventDefault();
      return;
    }

    if (moveToInteractiveCell?.(activeCell, -1)) {
      event.preventDefault();
    }
    return;
  }

  if (activeIndex < elements.length - 1) {
    const next = elements[activeIndex + 1];
    if (focusInteractiveElement(activeCell, next, null, elements)) event.preventDefault();
    return;
  }

  if (moveToInteractiveCell?.(activeCell, 1)) {
    event.preventDefault();
  }
}

/**
 * Handles arrow-key traversal between interactive widgets inside one cell.
 * Leaves arrows untouched for controls that conventionally consume them.
 *
 * @param {KeyboardEvent} event
 * @param {HTMLElement} activeCell
 */
export function handleWidgetArrow(event, activeCell) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (!hasInteractiveElements(activeCell)) return;

  const focused = event.target instanceof HTMLElement ? event.target.closest(INTERACTIVE_SELECTOR) : null;
  if (!focused || !activeCell.contains(focused) || consumesArrowKeys(focused)) return;

  const elements = interactiveElements(activeCell);
  if (elements.length < 2) return;

  const activeIndex = elements.indexOf(focused);
  if (activeIndex < 0) return;

  const direction = WIDGET_NEXT_KEYS.has(event.key) ? 1 : -1;
  const nextIndex = activeIndex + direction;
  if (nextIndex < 0 || nextIndex >= elements.length) return;

  const next = elements[nextIndex];
  if (focusInteractiveElement(activeCell, next, null, elements)) event.preventDefault();
}

function consumesArrowKeys(element) {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;

  const tagName = element.tagName;
  if (tagName === "TEXTAREA" || tagName === "SELECT") return true;
  if (tagName !== "INPUT") return false;

  const type = (element.getAttribute("type") || "text").toLowerCase();
  return ARROW_CONSUMING_INPUT_TYPES.has(type);
}
