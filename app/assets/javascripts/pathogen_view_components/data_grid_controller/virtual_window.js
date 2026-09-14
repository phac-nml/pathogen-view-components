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
  onCellsChanged,
  resolveCell,
  resolveFocusCell,
  getPendingFocusCoordinate,
  setActiveCell,
  ensureFocusableCell,
}) {
  if (!rowSource) return false;

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
  if (rowRangeUnchanged && columnRangeUnchanged) return false;

  setCurrentRange({
    rowStart: startIndex,
    rowEnd: endIndex,
    columnStart: columnRange ? columnRange.startIndex : -1,
    columnEnd: columnRange ? columnRange.endIndex : -1,
  });

  const pendingFocus = getPendingFocusCoordinate?.() ?? null;
  const focusedCell = pendingFocus ? null : resolveCell(document.activeElement);
  const focusedRowIndex = pendingFocus?.rowIndex ?? (focusedCell ? rowIndexOf(focusedCell) : null);
  const focusedColumnIndex = pendingFocus?.columnIndex ?? (focusedCell ? columnIndexOf(focusedCell) : null);
  const shouldRestoreCellFocus = focusedRowIndex !== null && focusedColumnIndex !== null;
  const focusedRow = focusedCell?.closest('[role="row"]');
  let didRestoreCellFocus = false;

  const renderedRows = [];
  for (let globalIndex = startIndex; globalIndex < endIndex; globalIndex += 1) {
    const row = rowSource.rowAt(globalIndex);
    if (!row) continue;

    const top = `${globalIndex * rowHeight}px`;
    if (row.style.top !== top) row.style.top = top;
    applyColumnWindow(row, columnRange, focusedCell);
    renderedRows.push(row);
  }

  if (focusedRow && viewport.contains(focusedRow) && !renderedRows.includes(focusedRow)) {
    const globalIndex = focusedRowIndex - 1;
    if (globalIndex < startIndex || globalIndex >= endIndex) {
      applyColumnWindow(focusedRow, columnRange, focusedCell);
      if (globalIndex < startIndex) renderedRows.unshift(focusedRow);
      else renderedRows.push(focusedRow);
    }
  }

  const desiredRows = new Set(renderedRows);
  Array.from(viewport.children).forEach((row) => {
    if (row.matches('[role="row"]') && !desiredRows.has(row)) row.remove();
  });
  const spacer = viewport.querySelector(".pvc-data-grid__spacer");
  let nextNode = spacer ? spacer.nextElementSibling : viewport.firstElementChild;
  renderedRows.forEach((row) => {
    if (row === nextNode) nextNode = row.nextElementSibling;
    else viewport.insertBefore(row, nextNode);
  });

  applyColumnWindow(headerRow(), columnRange, focusedCell);
  onCellsChanged?.();

  if (shouldRestoreCellFocus) {
    const mappedCell = resolveFocusCell(focusedRowIndex, focusedColumnIndex);
    if (mappedCell && mappedCell.isConnected) {
      if (!mappedCell.contains(document.activeElement)) {
        setActiveCell(mappedCell);
        mappedCell.focus({ preventScroll: true });
      }
      didRestoreCellFocus = true;
    }
  }

  if (!didRestoreCellFocus && !pendingFocus) ensureFocusableCell();

  rowSource.afterRender?.(startIndex, endIndex, rowOverscan * 2);
  return true;
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
