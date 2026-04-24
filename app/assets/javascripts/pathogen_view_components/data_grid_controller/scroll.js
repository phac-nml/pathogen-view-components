// Scroll management — ensures focused cells are fully visible,
// accounting for sticky column overlap.

const STICKY_OVERLAY_SELECTOR =
  '[data-sticky-cell][data-pathogen--data-grid-row-index="1"], [data-sticky-cell][role="columnheader"], ' +
  '.pathogen-data-grid__cell--sticky[data-pathogen--data-grid-row-index="1"], .pathogen-data-grid__cell--header.pathogen-data-grid__cell--sticky';
const HEADER_OVERLAY_SELECTOR = '[role="columnheader"], .pathogen-data-grid__cell--header';

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
 * Returns the pixel height occupied by sticky headers at the top edge of the container.
 * @param {DOMRect} containerRect
 * @param {HTMLElement|null} gridTarget
 * @returns {number}
 */
export function headerOverlayHeight(containerRect, gridTarget) {
  if (!gridTarget) return 0;

  const headerCells = gridTarget.querySelectorAll(HEADER_OVERLAY_SELECTOR);
  if (headerCells.length === 0) return 0;

  let maxBlockEnd = 0;
  headerCells.forEach((cell) => {
    const rect = cell.getBoundingClientRect();
    maxBlockEnd = Math.max(maxBlockEnd, rect.bottom - containerRect.top);
  });

  return Math.max(0, maxBlockEnd);
}

/**
 * Scrolls the container so that the given cell is fully visible,
 * respecting sticky column overlap.
 * @param {HTMLElement} cell
 * @param {HTMLElement|null} scrollContainer
 * @param {HTMLElement|null} gridTarget
 * @param {{ pinnedWidth?: number|null }} [options]
 */
export function ensureCellFullyVisible(cell, scrollContainer, gridTarget, options = {}) {
  if (!(cell instanceof HTMLElement)) return;

  if (!scrollContainer) {
    cell.scrollIntoView({ block: "nearest", inline: "nearest" });
    return;
  }

  const containerRect = scrollContainer.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();

  const resolvedPinnedWidth = Number.isFinite(options.pinnedWidth) ? options.pinnedWidth : null;
  const overlap = resolvedPinnedWidth === null ? stickyOverlayWidth(containerRect, gridTarget) : resolvedPinnedWidth;
  const headerOverlap = headerOverlayHeight(containerRect, gridTarget);
  const isStickyCell =
    cell.hasAttribute("data-sticky-cell") || cell.classList.contains("pathogen-data-grid__cell--sticky");
  const isHeaderCell = cell.classList.contains("pathogen-data-grid__cell--header");
  const minVisibleTop = containerRect.top + (isHeaderCell ? 0 : headerOverlap);
  const minVisibleLeft = containerRect.left + (isStickyCell ? 0 : overlap);
  const maxVisibleRight = containerRect.right;

  if (cellRect.top < minVisibleTop) {
    scrollContainer.scrollTop -= minVisibleTop - cellRect.top;
  } else if (cellRect.bottom > containerRect.bottom) {
    scrollContainer.scrollTop += cellRect.bottom - containerRect.bottom;
  }

  if (cellRect.left < minVisibleLeft) {
    scrollContainer.scrollLeft -= minVisibleLeft - cellRect.left;
  } else if (cellRect.right > maxVisibleRight) {
    scrollContainer.scrollLeft += cellRect.right - maxVisibleRight;
  }

  // After adjusting the scroll container, ensure the cell is also visible
  // within the browser viewport. This handles grids that are not inside a
  // fixed-height container (the page itself scrolls instead of the container).
  ensureCellInViewport(cell);
}

/**
 * Scrolls the browser viewport so the cell is on-screen.
 * Uses getBoundingClientRect (which reflects any prior container scroll
 * adjustment) and window.scrollBy to avoid disturbing the container's
 * scroll position.
 * @param {HTMLElement} cell
 */
export function ensureCellInViewport(cell) {
  const rect = cell.getBoundingClientRect();
  let scrollY = 0;

  if (rect.top < 0) {
    scrollY = rect.top;
  } else if (rect.bottom > window.innerHeight) {
    scrollY = rect.bottom - window.innerHeight;
  }

  if (scrollY !== 0) {
    window.scrollBy({ left: 0, top: scrollY, behavior: "instant" });
  }
}
