export function paginationContract(grid, defaultPageSize) {
  const totalCount = Number.parseInt(grid.dataset.pvcDataGridTotalCount || "", 10);
  const rowsUrl = grid.dataset.pvcDataGridRowsUrl || null;
  const pageSize = Number.parseInt(grid.dataset.pvcDataGridPageSize || "", 10);
  const rowOffset = Number.parseInt(grid.dataset.pvcDataGridRowOffset || "", 10);

  return {
    totalRows: Number.isFinite(totalCount) && totalCount > 0 ? totalCount : 0,
    rowsUrl,
    rowOffset: Number.isFinite(rowOffset) && rowOffset >= 0 ? rowOffset : 0,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : defaultPageSize,
  };
}

export function setPaginationBusy({ grid, status, loadingMoreText, loadedText }, isBusy) {
  if (!grid) return;

  if (isBusy) {
    grid.setAttribute("aria-busy", "true");
    if (status && loadingMoreText) {
      status.textContent = loadingMoreText;
      status.hidden = false;
    }
    return;
  }

  grid.setAttribute("aria-busy", "false");
  if (status && loadedText) {
    status.textContent = loadedText;
    status.hidden = true;
  }
}

export function cachedVirtualCells({ grid, rows, cellSelector }) {
  if (!grid) return [];

  const headerCells = Array.from(grid.querySelectorAll(`${cellSelector}[data-pathogen--data-grid-row-index="0"]`));
  const bodyCells = [];
  rows.forEach((row) => {
    row.querySelectorAll(cellSelector).forEach((cell) => {
      bodyCells.push(cell);
    });
  });

  return [...headerCells, ...bodyCells];
}
