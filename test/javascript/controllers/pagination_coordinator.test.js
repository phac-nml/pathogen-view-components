import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaginationCoordinator } from "pathogen_view_components/data_grid_controller/pagination_coordinator";

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function makeCell({ row = 4, column = 0 } = {}) {
  const cell = document.createElement("div");
  cell.setAttribute("data-pathogen--data-grid-row-index", String(row));
  cell.setAttribute("data-pathogen--data-grid-column-index", String(column));
  return cell;
}

function buildCoordinator({
  withPaginationStatus = true,
  withRefresh = true,
  includeFetchErrorText = true,
  viewport = null,
} = {}) {
  const grid = document.createElement("div");
  const virtualStatus = document.createElement("p");
  virtualStatus.dataset.loadingMoreText = "Loading more rows";
  virtualStatus.dataset.loadedText = "Rows ready";
  if (includeFetchErrorText) virtualStatus.dataset.fetchErrorText = "Try again";

  const paginationStatus = withPaginationStatus ? document.createElement("p") : null;
  if (paginationStatus) {
    paginationStatus.dataset.loadingText = "Loading";
    paginationStatus.dataset.loadedText = "%{count} rows loaded";
    paginationStatus.dataset.endText = "All %{count} rows loaded";
    paginationStatus.dataset.fetchErrorText = "Try again";
    paginationStatus.dataset.mismatchText = "Refresh results";
    paginationStatus.dataset.rangeText = "Rows %{start}-%{end} of %{count}";
    paginationStatus.dataset.rangeTotalText = "Rows %{start}-%{end} of %{total}";
  }

  const paginationPosition = withPaginationStatus ? document.createElement("p") : null;
  const paginationRetry = withPaginationStatus ? document.createElement("button") : null;
  const paginationRefresh = withPaginationStatus && withRefresh ? document.createElement("a") : null;

  const virtualViewport = viewport || {
    hasMore: true,
    cursorMode: true,
    totalRows: 4,
    loadNext: vi.fn().mockResolvedValue(undefined),
    ensureVisible: vi.fn(),
  };

  document.body.append(grid, virtualStatus);
  if (paginationStatus) document.body.append(paginationStatus);
  if (paginationPosition) document.body.append(paginationPosition);
  if (paginationRetry) document.body.append(paginationRetry);
  if (paginationRefresh) document.body.append(paginationRefresh);

  const focusCell = vi.fn();
  const cellByCoordinate = vi.fn();
  const showErrorState = vi.fn();
  const reportError = vi.fn();

  const coordinator = new PaginationCoordinator({
    grid,
    virtualStatus,
    paginationStatus,
    paginationPosition,
    paginationRetry,
    paginationRefresh,
    virtualStatusMessage: (key, fallback) => {
      const value = virtualStatus.dataset[key];
      return typeof value === "string" && value.trim().length > 0 ? value : fallback;
    },
    viewport: () => virtualViewport,
    pageSize: () => 4,
    focusCell,
    cellByCoordinate,
    showErrorState,
    reportError,
  });

  return {
    coordinator,
    grid,
    virtualStatus,
    paginationStatus,
    paginationPosition,
    paginationRetry,
    paginationRefresh,
    viewport: virtualViewport,
    focusCell,
    cellByCoordinate,
    showErrorState,
    reportError,
  };
}

describe("PaginationCoordinator", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("navigates past the loaded edge and focuses the resolved row", async () => {
    const pending = deferred();
    const ctx = buildCoordinator({
      viewport: {
        hasMore: true,
        cursorMode: true,
        totalRows: 4,
        loadNext: vi.fn(() => pending.promise),
        ensureVisible: vi.fn(),
      },
    });
    const activeCell = makeCell({ row: 4, column: 1 });
    const mappedCell = makeCell({ row: 5, column: 1 });
    document.body.append(activeCell, mappedCell);
    ctx.cellByCoordinate.mockReturnValue(mappedCell);
    activeCell.focus();

    const event = { key: "ArrowDown", preventDefault: vi.fn() };
    expect(ctx.coordinator.navigateCursorBoundary(event, activeCell)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);

    ctx.viewport.totalRows = 5;
    pending.resolve();
    await settle();

    expect(ctx.viewport.loadNext).toHaveBeenCalledTimes(1);
    expect(ctx.viewport.ensureVisible).toHaveBeenCalledWith(4, 1);
    expect(ctx.cellByCoordinate).toHaveBeenCalledWith(5, 1);
    expect(ctx.focusCell).toHaveBeenCalledWith(mappedCell);
  });

  it("cancels pending boundary focus when intent is reset", async () => {
    const pending = deferred();
    const ctx = buildCoordinator({
      viewport: {
        hasMore: true,
        cursorMode: true,
        totalRows: 4,
        loadNext: vi.fn(() => pending.promise),
        ensureVisible: vi.fn(),
      },
    });
    const activeCell = makeCell({ row: 4, column: 0 });
    document.body.append(activeCell);
    activeCell.focus();

    const event = { key: "PageDown", preventDefault: vi.fn() };
    expect(ctx.coordinator.navigateCursorBoundary(event, activeCell)).toBe(true);

    ctx.coordinator.resetBoundaryIntent();
    ctx.viewport.totalRows = 8;
    pending.resolve();
    await settle();

    expect(ctx.focusCell).not.toHaveBeenCalled();
    expect(ctx.viewport.ensureVisible).not.toHaveBeenCalled();
  });

  it("ignores cursor boundary navigation for non-edge movement", () => {
    const ctx = buildCoordinator();
    const activeCell = makeCell({ row: 2, column: 0 });
    const event = { key: "ArrowDown", preventDefault: vi.fn() };

    expect(ctx.coordinator.navigateCursorBoundary(event, activeCell)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("uses presenter busy text and clears mismatch state after success", () => {
    const ctx = buildCoordinator();

    ctx.coordinator.setBusy(true);
    expect(ctx.grid.getAttribute("aria-busy")).toBe("true");
    expect(ctx.paginationStatus.textContent).toBe("Loading");

    ctx.coordinator.handleError({ refreshRequired: true });
    expect(ctx.paginationStatus.textContent).toBe("Refresh results");
    expect(ctx.paginationRetry.hidden).toBe(true);
    expect(ctx.paginationRefresh.hidden).toBe(false);

    ctx.viewport.hasMore = false;
    ctx.coordinator.setBusy(false);
    expect(ctx.paginationStatus.textContent).toBe("Refresh results");

    expect(ctx.coordinator.handlePageSuccess(ctx.paginationRetry)).toBe(true);
    ctx.coordinator.setBusy(false);
    expect(ctx.paginationStatus.textContent).toBe("All 4 rows loaded");
    expect(ctx.paginationRetry.hidden).toBe(true);
    expect(ctx.paginationRefresh.hidden).toBe(true);
  });

  it("falls back to virtual status text when presenter status is unavailable", () => {
    const ctx = buildCoordinator({ withPaginationStatus: false });

    ctx.coordinator.setBusy(true);
    expect(ctx.grid.getAttribute("aria-busy")).toBe("true");
    expect(ctx.virtualStatus.textContent).toBe("Loading more rows");
    expect(ctx.virtualStatus.hidden).toBe(false);

    ctx.coordinator.setBusy(false);
    expect(ctx.grid.getAttribute("aria-busy")).toBe("false");
    expect(ctx.virtualStatus.textContent).toBe("Rows ready");
    expect(ctx.virtualStatus.hidden).toBe(true);
  });

  it("shows shared error state when presenter is unavailable but fallback message exists", () => {
    const ctx = buildCoordinator({ withPaginationStatus: false });
    const error = new Error("offline");

    ctx.coordinator.handleError(error);

    expect(ctx.showErrorState).toHaveBeenCalledWith("Try again");
    expect(ctx.reportError).not.toHaveBeenCalled();
  });

  it("reports pagination errors when no presenter and no fallback message exist", () => {
    const ctx = buildCoordinator({ withPaginationStatus: false, includeFetchErrorText: false });
    const error = new Error("offline");

    ctx.coordinator.handleError(error);

    expect(ctx.showErrorState).not.toHaveBeenCalled();
    expect(ctx.reportError).toHaveBeenCalledWith(error);
  });

  it("resets internal state so stale mismatch messaging does not persist", () => {
    const ctx = buildCoordinator();

    ctx.coordinator.handleError({ refreshRequired: true });
    expect(ctx.paginationStatus.textContent).toBe("Refresh results");

    ctx.coordinator.reset();
    ctx.viewport.hasMore = false;
    ctx.coordinator.setBusy(false);

    expect(ctx.paginationStatus.textContent).toBe("All 4 rows loaded");
  });

  it("updates the position label and tolerates missing position targets", () => {
    const ctx = buildCoordinator();
    ctx.coordinator.updatePosition({ start: 1, end: 4, count: 20, total: null });
    expect(ctx.paginationPosition.textContent).toBe("Rows 1-4 of 20");

    ctx.coordinator.updatePosition({ start: 5, end: 8, count: 20, total: 100 });
    expect(ctx.paginationPosition.textContent).toBe("Rows 5-8 of 100");

    const noPosition = buildCoordinator({ withPaginationStatus: false });
    expect(() => noPosition.coordinator.updatePosition({ start: 1, end: 1, count: 1, total: 1 })).not.toThrow();
  });
});
