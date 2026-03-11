// Scroll management — ensures focused cells are fully visible,
// accounting for sticky column overlap.

const STICKY_OVERLAY_SELECTOR =
  '.pathogen-data-grid__cell--sticky[data-pathogen--data-grid-row-index="1"], .pathogen-data-grid__cell--header.pathogen-data-grid__cell--sticky';

/**
 * Returns the pixel width occupied by sticky columns at the left edge of the container.
 * @param {DOMRect} containerRect
 * @param {HTMLElement|null} gridTarget
 * @returns {number}
 */
export function stickyOverlayWidth(containerRect, gridTarget) {
  if (!gridTarget) return 0;

  const stickyCells = gridTarget.querySelectorAll(STICKY_OVERLAY_SELECTOR);
  if (stickyCells.length === 0) return 0;

  let maxInlineEnd = 0;
  stickyCells.forEach((cell) => {
    const rect = cell.getBoundingClientRect();
    maxInlineEnd = Math.max(maxInlineEnd, rect.right - containerRect.left);
  });

  return Math.max(0, maxInlineEnd);
}

/**
 * Scrolls the container so that the given cell is fully visible,
 * respecting sticky column overlap.
 * @param {HTMLElement} cell
 * @param {HTMLElement|null} scrollContainer
 * @param {HTMLElement|null} gridTarget
 */
export function ensureCellFullyVisible(cell, scrollContainer, gridTarget) {
  if (!(cell instanceof HTMLElement)) return;

  if (!scrollContainer) {
    cell.scrollIntoView({ block: "nearest", inline: "nearest" });
    return;
  }

  const containerRect = scrollContainer.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();

  const overlap = stickyOverlayWidth(containerRect, gridTarget);
  const isStickyCell = cell.classList.contains("pathogen-data-grid__cell--sticky");
  const minVisibleLeft = containerRect.left + (isStickyCell ? 0 : overlap);
  const maxVisibleRight = containerRect.right;

  if (cellRect.top < containerRect.top) {
    scrollContainer.scrollTop -= containerRect.top - cellRect.top;
  } else if (cellRect.bottom > containerRect.bottom) {
    scrollContainer.scrollTop += cellRect.bottom - containerRect.bottom;
  }

  if (cellRect.left < minVisibleLeft) {
    scrollContainer.scrollLeft -= minVisibleLeft - cellRect.left;
  } else if (cellRect.right > maxVisibleRight) {
    scrollContainer.scrollLeft += cellRect.right - maxVisibleRight;
  }
}
