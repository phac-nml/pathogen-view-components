// Scroll management — ensures focused cells are fully visible,
// accounting for sticky header and sticky column overlap.

const STICKY_OVERLAY_SELECTOR =
  '.pathogen-data-grid__cell--sticky[data-pathogen--data-grid-row-index="1"], .pathogen-data-grid__cell--header.pathogen-data-grid__cell--sticky';
const STICKY_HEADER_SELECTOR = ".pathogen-data-grid__cell--header";

function clampScrollPosition(value) {
  return Math.max(0, Math.round(value));
}

export function nearestScrollPosition(start, end, viewportStart, viewportSize, leadingInset = 0, trailingInset = 0) {
  if (![start, end, viewportStart, viewportSize, leadingInset, trailingInset].every(Number.isFinite)) {
    return viewportStart;
  }

  const effectiveSize = Math.max(1, viewportSize - leadingInset - trailingInset);
  const effectiveStart = viewportStart + leadingInset;
  const effectiveEnd = viewportStart + viewportSize - trailingInset;
  const itemSize = Math.max(0, end - start);

  if (start >= effectiveStart && end <= effectiveEnd) {
    return viewportStart;
  }

  if (itemSize > effectiveSize || start < effectiveStart) {
    return clampScrollPosition(start - leadingInset);
  }

  if (end > effectiveEnd) {
    return clampScrollPosition(end - (viewportSize - trailingInset));
  }

  return viewportStart;
}

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
export function stickyHeaderHeight(containerRect, gridTarget) {
  if (!gridTarget) return 0;

  const headerCells = gridTarget.querySelectorAll(STICKY_HEADER_SELECTOR);
  if (headerCells.length === 0) return 0;

  let maxBlockEnd = 0;
  headerCells.forEach((cell) => {
    const rect = cell.getBoundingClientRect();
    maxBlockEnd = Math.max(maxBlockEnd, rect.bottom - containerRect.top);
  });

  return Math.max(0, maxBlockEnd);
}

/**
 * Scrolls the container by the minimum amount needed to reveal the given bounds.
 * Bounds are in the scroll container's content coordinate space.
 * @param {{top:number, bottom:number, left:number, right:number}} bounds
 * @param {HTMLElement|null} scrollContainer
 * @param {{topInset?:number, bottomInset?:number, leftInset?:number, rightInset?:number}} options
 */
export function ensureBoundsFullyVisible(bounds, scrollContainer, options = {}) {
  if (!scrollContainer || !bounds) return;

  const { topInset = 0, bottomInset = 0, leftInset = 0, rightInset = 0 } = options;

  const nextScrollTop = nearestScrollPosition(
    bounds.top,
    bounds.bottom,
    scrollContainer.scrollTop,
    scrollContainer.clientHeight,
    topInset,
    bottomInset,
  );

  const nextScrollLeft = nearestScrollPosition(
    bounds.left,
    bounds.right,
    scrollContainer.scrollLeft,
    scrollContainer.clientWidth,
    leftInset,
    rightInset,
  );

  if (nextScrollTop !== scrollContainer.scrollTop) {
    scrollContainer.scrollTop = nextScrollTop;
  }

  if (nextScrollLeft !== scrollContainer.scrollLeft) {
    scrollContainer.scrollLeft = nextScrollLeft;
  }
}

/**
 * Scrolls the container so that the given cell is fully visible,
 * respecting sticky header and sticky column overlap.
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
  const headerHeight = stickyHeaderHeight(containerRect, gridTarget);
  const scrollTop = scrollContainer.scrollTop;
  const scrollLeft = scrollContainer.scrollLeft;
  const isHeaderCell = cell.classList.contains("pathogen-data-grid__cell--header");
  const isStickyCell = cell.classList.contains("pathogen-data-grid__cell--sticky");

  ensureBoundsFullyVisible(
    {
      top: scrollTop + (cellRect.top - containerRect.top),
      bottom: scrollTop + (cellRect.bottom - containerRect.top),
      left: scrollLeft + (cellRect.left - containerRect.left),
      right: scrollLeft + (cellRect.right - containerRect.left),
    },
    scrollContainer,
    {
      topInset: isHeaderCell ? 0 : headerHeight,
      leftInset: isStickyCell ? 0 : overlap,
    },
  );
}
