import { columnIndexOf, rowIndexOf } from "pathogen_view_components/data_grid_controller/navigation";

const FORWARD_KEYS = new Set(["ArrowDown", "PageDown"]);

export function navigateCursorBoundary({
  event,
  activeCell,
  viewport,
  pageSize,
  boundaryIntent,
  setBoundaryIntent,
  hasPaginationError,
  focusCell,
  cellByCoordinate,
}) {
  if (!viewport?.hasMore || !FORWARD_KEYS.has(event.key)) return false;

  const target = rowIndexOf(activeCell) + (event.key === "PageDown" ? pageSize : 1);
  if (target <= viewport.totalRows) return false;

  event.preventDefault();
  const intent = { active: document.activeElement, target, column: columnIndexOf(activeCell) };
  setBoundaryIntent(intent);

  viewport.loadNext().then(() => {
    if (boundaryIntent() !== intent || document.activeElement !== intent.active || hasPaginationError()) return;

    setBoundaryIntent(null);
    const row = Math.min(intent.target, viewport.totalRows);
    viewport.ensureVisible(row - 1, intent.column);
    const cell = cellByCoordinate(row, intent.column);
    if (cell) focusCell(cell);
  });

  return true;
}
