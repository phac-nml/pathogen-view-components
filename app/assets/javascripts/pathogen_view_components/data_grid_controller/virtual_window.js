import { columnIndexOf, rowIndexOf } from "pathogen_view_components/data_grid_controller/navigation";

import {
  computeVisibleRange,
  scrollLeftForColumn,
  scrollTopForRow,
} from "pathogen_view_components/data_grid_controller/virtualizer";

export function renderVirtualWindow({
  rowSource,
  rowHeight,
  rowOverscan,
  scrollContainer,
  viewport,
  currentRange,
  setCurrentRange,
  computeColumnRange,
  applyColumnWindow,
  headerRow,
  resolveCell,
  resolveFocusCell,
  getPendingFocusCoordinate,
  setActiveCell,
  ensureFocusableCell,
}) {
  if (!rowSource) return;

  const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
  const containerHeight = scrollContainer ? scrollContainer.clientHeight : 0;
  const viewportHeight = containerHeight > 0 ? containerHeight : window.innerHeight;
  const columnRange = computeColumnRange();

  const { startIndex, endIndex } = computeVisibleRange({
    scrollTop,
    viewportHeight,
    rowHeight,
    totalRows: rowSource.totalRows,
    buffer: rowOverscan,
  });

  const rowRangeUnchanged = startIndex === currentRange.rowStart && endIndex === currentRange.rowEnd;
  const columnRangeUnchanged =
    (columnRange === null && currentRange.columnStart === -1 && currentRange.columnEnd === -1) ||
    (columnRange !== null &&
      columnRange.startIndex === currentRange.columnStart &&
      columnRange.endIndex === currentRange.columnEnd);
  if (rowRangeUnchanged && columnRangeUnchanged) return;

  setCurrentRange({
    rowStart: startIndex,
    rowEnd: endIndex,
    columnStart: columnRange ? columnRange.startIndex : -1,
    columnEnd: columnRange ? columnRange.endIndex : -1,
  });

  const spacer = viewport.querySelector(".pvc-data-grid__spacer");
  const pendingFocus = getPendingFocusCoordinate?.() ?? null;
  const focusedCell = pendingFocus ? null : resolveCell(document.activeElement);
  const focusedRowIndex = pendingFocus?.rowIndex ?? (focusedCell ? rowIndexOf(focusedCell) : null);
  const focusedColumnIndex = pendingFocus?.columnIndex ?? (focusedCell ? columnIndexOf(focusedCell) : null);
  const shouldRestoreCellFocus = focusedRowIndex !== null && focusedColumnIndex !== null;
  let didRestoreCellFocus = false;

  viewport.querySelectorAll('[role="row"]').forEach((row) => row.remove());

  const fragment = document.createDocumentFragment();
  for (let globalIndex = startIndex; globalIndex < endIndex; globalIndex += 1) {
    const row = rowSource.rowAt(globalIndex);
    if (!row) continue;

    row.style.top = `${globalIndex * rowHeight}px`;
    applyColumnWindow(row, columnRange);
    fragment.appendChild(row);
  }

  if (spacer) {
    spacer.after(fragment);
  } else {
    viewport.appendChild(fragment);
  }

  applyColumnWindow(headerRow(), columnRange);

  if (shouldRestoreCellFocus) {
    const mappedCell = resolveFocusCell(focusedRowIndex, focusedColumnIndex);
    if (mappedCell && mappedCell.isConnected) {
      setActiveCell(mappedCell);
      mappedCell.focus({ preventScroll: true });
      didRestoreCellFocus = true;
    }
  }

  if (!didRestoreCellFocus && !pendingFocus) ensureFocusableCell();

  rowSource.afterRender?.(startIndex, endIndex, rowOverscan * 2);
}

export function ensureVirtualCellVisible({
  rowIndex,
  columnIndex,
  rowHeight,
  scrollContainer,
  visibleRange,
  pinnedCount,
  columnWidths,
  columnOffsets,
  pinnedWidth,
  isColumnRendered,
  prefetchRow,
  cancelScheduledRender,
  renderNow,
  reportError,
}) {
  if (typeof rowIndex === "number" && rowIndex >= 0) prefetchRow(rowIndex);
  if (!scrollContainer) return;

  let didAdjustScroll = false;

  if (typeof rowIndex === "number" && rowIndex >= 0) {
    const newScrollTop = scrollTopForRow({
      rowIndex,
      scrollTop: scrollContainer.scrollTop,
      viewportHeight: scrollContainer.clientHeight,
      rowHeight,
    });

    if (newScrollTop !== null) {
      scrollContainer.scrollTop = newScrollTop;
      didAdjustScroll = true;
    }
  }

  if (
    columnIndex !== null &&
    columnIndex >= pinnedCount &&
    columnWidths.length > 0 &&
    columnOffsets.length === columnWidths.length
  ) {
    const newScrollLeft = scrollLeftForColumn({
      columnIndex,
      scrollLeft: scrollContainer.scrollLeft,
      viewportWidth: scrollContainer.clientWidth,
      pinnedWidth,
      columnOffsets,
      columnWidths,
    });

    if (newScrollLeft !== null) {
      scrollContainer.scrollLeft = newScrollLeft;
      didAdjustScroll = true;
    }
  }

  const rowRendered =
    rowIndex === null || rowIndex < 0 || (rowIndex >= visibleRange.startIndex && rowIndex < visibleRange.endIndex);
  const columnRendered = isColumnRendered(columnIndex);

  if (didAdjustScroll || !rowRendered || !columnRendered) {
    cancelScheduledRender();
    try {
      renderNow();
    } catch (error) {
      reportError(error);
    }
  }
}
