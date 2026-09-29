import { navigateCursorBoundary } from "pathogen_view_components/data_grid_controller/cursor_boundary_navigator";
import { setPaginationBusy } from "pathogen_view_components/data_grid_controller/pagination_mode";
import { PaginationStatusPresenter } from "pathogen_view_components/data_grid_controller/pagination_status_presenter";

export class PaginationCoordinator {
  #boundaryIntent = null;
  #paginationError = null;

  #grid;
  #virtualStatus;
  #virtualStatusMessage;

  #viewport;
  #pageSize;
  #focusCell;
  #cellByCoordinate;

  #showErrorState;
  #reportError;

  #statusPresenter;

  constructor({
    grid,
    virtualStatus,
    paginationStatus,
    paginationPosition,
    paginationRetry,
    paginationRefresh,
    virtualStatusMessage,
    viewport,
    pageSize,
    focusCell,
    cellByCoordinate,
    showErrorState,
    reportError,
  }) {
    this.#grid = grid;
    this.#virtualStatus = virtualStatus;
    this.#virtualStatusMessage = virtualStatusMessage;
    this.#viewport = viewport;
    this.#pageSize = pageSize;
    this.#focusCell = focusCell;
    this.#cellByCoordinate = cellByCoordinate;
    this.#showErrorState = showErrorState;
    this.#reportError = reportError;
    this.#statusPresenter = new PaginationStatusPresenter({
      grid,
      status: paginationStatus,
      position: paginationPosition,
      retry: paginationRetry,
      refresh: paginationRefresh,
      virtualStatusMessage,
    });
  }

  reset() {
    this.#boundaryIntent = null;
    this.#paginationError = null;
  }

  resetBoundaryIntent() {
    this.#boundaryIntent = null;
  }

  navigateCursorBoundary(event, activeCell) {
    return navigateCursorBoundary({
      event,
      activeCell,
      viewport: this.#viewport(),
      pageSize: this.#pageSize(),
      boundaryIntent: () => this.#boundaryIntent,
      setBoundaryIntent: (intent) => {
        this.#boundaryIntent = intent;
      },
      hasPaginationError: () => this.#paginationError !== null,
      focusCell: this.#focusCell,
      cellByCoordinate: this.#cellByCoordinate,
    });
  }

  setBusy(isBusy) {
    const viewport = this.#viewport();
    const handled =
      this.#statusPresenter?.setBusy({
        isBusy,
        paginationError: this.#paginationError,
        hasMore: viewport?.hasMore || false,
        cursorMode: viewport?.cursorMode || false,
        totalRows: viewport?.totalRows || 0,
      }) || false;
    if (handled) return;

    setPaginationBusy(
      {
        grid: this.#grid,
        status: this.#virtualStatus,
        loadingMoreText: this.#virtualStatusMessage("loadingMoreText", null),
        loadedText: this.#virtualStatusMessage("loadedText", null),
      },
      isBusy,
    );
  }

  handleError(error) {
    console.error("[pathogen--data-grid] Pagination fetch error", error);
    this.#paginationError = this.#statusPresenter?.showError(error.refreshRequired) || null;
    if (this.#paginationError) return;

    const message = this.#virtualStatusMessage("fetchErrorText", null);
    if (message) this.#showErrorState(message);
    else this.#reportError(error);
  }

  handlePageSuccess(activeElement) {
    this.#paginationError = null;
    return this.#statusPresenter?.clearRecovery(activeElement) || false;
  }

  updatePosition(position) {
    this.#statusPresenter?.updatePosition(position);
  }
}
