// Widget mode — manages interactive element focus within a grid cell.
//
// In grid mode, focus lives on the cell (td/th).
// Widget mode is entered via Enter/F2, transferring focus to an interactive
// descendant. Escape returns focus to the cell. Tab cycles between multiple
// interactive elements within the cell while in widget mode.

const INTERACTIVE_SELECTOR = "a, button, input, select, textarea";

/**
 * Returns all interactive descendants of a cell.
 * @param {HTMLElement} cell
 * @returns {HTMLElement[]}
 */
export function interactiveElements(cell) {
  return Array.from(cell.querySelectorAll(INTERACTIVE_SELECTOR));
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

  return cell.contains(match) ? match : null;
}

/**
 * Transfers the roving tabindex from the cell to the given interactive element.
 * All other interactive elements in the cell get tabindex="-1".
 * @param {HTMLElement} cell
 * @param {HTMLElement} targetElement
 */
export function activateInteractiveElement(cell, targetElement) {
  const elements = interactiveElements(cell);
  if (elements.length === 0 || !targetElement) return;

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
 */
export function focusInteractiveElement(cell, targetElement, onVisible) {
  const elements = interactiveElements(cell);
  if (elements.length === 0) return;

  const next = targetElement && elements.includes(targetElement) ? targetElement : elements[0];

  activateInteractiveElement(cell, next);
  next.focus({ preventScroll: true });
  onVisible?.(cell);
}

/**
 * Handles keydown events when focus is on an interactive descendant (widget mode).
 * - Escape: exit widget mode (returns focus to cell)
 * - Tab: cycle through interactive elements in the cell
 *
 * @param {KeyboardEvent} event
 * @param {HTMLElement} activeCell
 * @param {function} exitWidgetMode  - called with (cell) to restore cell focus
 */
export function handleInteractiveKeydown(event, activeCell, exitWidgetMode) {
  if (event.key === "Escape") {
    event.preventDefault();
    exitWidgetMode(activeCell);
    return;
  }

  if (event.key === "Tab") {
    handleTab(event, activeCell);
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
 */
export function handleTab(event, activeCell) {
  if (!hasInteractiveElements(activeCell)) return;

  const elements = interactiveElements(activeCell);
  if (elements.length <= 1) return;

  const focused = event.target instanceof HTMLElement ? event.target.closest(INTERACTIVE_SELECTOR) : null;
  const activeIndex = elements.indexOf(focused);

  // Only act when an interactive element already has focus (widget mode).
  // If activeIndex is -1 (focus is on the cell), Tab exits the grid — don't intercept.
  if (activeIndex < 0) return;

  if (event.shiftKey) {
    if (activeIndex > 0) {
      event.preventDefault();
      const previous = elements[activeIndex - 1];
      activateInteractiveElement(activeCell, previous);
      previous.focus({ preventScroll: true });
    }
    return;
  }

  if (activeIndex < elements.length - 1) {
    event.preventDefault();
    const next = elements[activeIndex + 1];
    activateInteractiveElement(activeCell, next);
    next.focus({ preventScroll: true });
  }
  // At the last element — allow Tab to fall through and exit the cell/grid.
}
