import { afterEach, describe, expect, it } from "vitest";
import { PaginationStatusPresenter } from "pathogen_view_components/data_grid_controller/pagination_status_presenter";

function makePresenter({ withRefresh = true } = {}) {
  const grid = document.createElement("div");
  const status = document.createElement("p");
  status.dataset.loadingText = "Loading";
  status.dataset.loadedText = "%{count} rows loaded";
  status.dataset.endText = "All %{count} rows loaded";
  status.dataset.fetchErrorText = "Retry";
  status.dataset.mismatchText = "Refresh";
  status.dataset.rangeText = "Rows %{start}-%{end} of %{count}";
  status.dataset.rangeTotalText = "Rows %{start}-%{end} of %{total}";
  const position = document.createElement("p");
  const retry = document.createElement("button");
  const refresh = withRefresh ? document.createElement("a") : null;
  document.body.append(grid, status, position, retry);
  if (refresh) document.body.append(refresh);

  const presenter = new PaginationStatusPresenter({
    grid,
    status,
    position,
    retry,
    refresh,
    virtualStatusMessage: (key, fallback) => (key === "loadedText" ? "Rows ready" : fallback),
  });

  return { presenter, grid, status, position, retry, refresh };
}

describe("PaginationStatusPresenter", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns false when no status region is provided", () => {
    const presenter = new PaginationStatusPresenter({
      grid: null,
      status: null,
      position: null,
      retry: null,
      refresh: null,
      virtualStatusMessage: () => "",
    });

    expect(
      presenter.setBusy({
        isBusy: true,
        paginationError: null,
        hasMore: true,
        cursorMode: true,
        totalRows: 0,
      }),
    ).toBe(false);
    expect(presenter.showError(true)).toBe(null);
    expect(presenter.clearRecovery(document.body)).toBe(false);
    expect(presenter.message("rangeText", { start: 1 })).toBe("");
  });

  it("updates busy state text and aria-busy", () => {
    const { presenter, grid, status } = makePresenter();

    expect(
      presenter.setBusy({
        isBusy: true,
        paginationError: null,
        hasMore: true,
        cursorMode: true,
        totalRows: 4,
      }),
    ).toBe(true);
    expect(grid.getAttribute("aria-busy")).toBe("true");
    expect(status.textContent).toBe("Loading");

    presenter.setBusy({
      isBusy: false,
      paginationError: null,
      hasMore: false,
      cursorMode: false,
      totalRows: 4,
    });
    expect(grid.getAttribute("aria-busy")).toBe("false");
    expect(status.textContent).toBe("Rows ready");
  });

  it("renders mismatch recovery when refresh is available", () => {
    const { presenter, status, retry, refresh } = makePresenter();

    const key = presenter.showError(true);

    expect(key).toBe("mismatchText");
    expect(status.textContent).toBe("Refresh");
    expect(retry.hidden).toBe(true);
    expect(refresh.hidden).toBe(false);
  });

  it("falls back to retry messaging when refresh is unavailable", () => {
    const { presenter, status, retry } = makePresenter({ withRefresh: false });

    const key = presenter.showError(true);

    expect(key).toBe("fetchErrorText");
    expect(status.textContent).toBe("Retry");
    expect(retry.hidden).toBe(false);
    expect(presenter.clearRecovery(document.body)).toBe(false);
  });

  it("clears recovery controls and reports retry focus handoff", () => {
    const { presenter, retry, refresh } = makePresenter();
    document.body.append(retry, refresh);
    retry.focus();

    const retryHadFocus = presenter.clearRecovery(document.activeElement);

    expect(retryHadFocus).toBe(true);
    expect(retry.hidden).toBe(true);
    expect(refresh.hidden).toBe(true);
  });

  it("updates the position label for unknown and known totals", () => {
    const { presenter, position } = makePresenter();

    presenter.updatePosition({ start: 1, end: 20, count: 40, total: null });
    expect(position.textContent).toBe("Rows 1-20 of 40");

    presenter.updatePosition({ start: 21, end: 40, count: 40, total: 100 });
    expect(position.textContent).toBe("Rows 21-40 of 100");
  });

  it("interpolates missing placeholders as empty strings", () => {
    const { presenter } = makePresenter();

    expect(presenter.message("rangeTotalText", { start: 1 })).toBe("Rows 1- of ");
  });
});
