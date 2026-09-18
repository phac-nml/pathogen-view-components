import { Application } from "@hotwired/stimulus";
import { afterEach, describe, expect, it, vi } from "vitest";

import DataGridController from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller";
import { PaginatedVirtualRows } from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller/paginated_virtual_rows";

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const cellSelector = '[data-pathogen--data-grid-target~="cell"]';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((fulfill, fail) => {
    resolve = fulfill;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function rowHTML(index) {
  return `<div role="row" aria-rowindex="${index + 2}" data-pvc-data-grid-global-row-index="${index}">
    <div role="gridcell" tabindex="${index === 0 ? 0 : -1}" data-pathogen--data-grid-target="cell"
      data-pathogen--data-grid-row-index="${index + 1}" data-pathogen--data-grid-column-index="0"
      data-pathogen--data-grid-has-interactive="false">Sample ${index + 1}</div>
  </div>`;
}

function seedRows(count = 20) {
  const container = document.createElement("div");
  container.innerHTML = Array.from({ length: count }, (_, index) => rowHTML(index)).join("");
  return Array.from(container.children);
}

function pagePayload(page) {
  return {
    rows: Array.from({ length: 20 }, (_, index) => {
      const globalIndex = (page - 1) * 20 + index;
      return { index: globalIndex, html: rowHTML(globalIndex) };
    }),
  };
}

function mockPageRequests() {
  const requests = new Map();
  vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
    const request = deferred();
    requests.set(Number(new URL(url).searchParams.get("page")), request);
    return request.promise;
  });
  return requests;
}

function completePage(requests, page) {
  requests.get(page).resolve({ ok: true, json: async () => pagePayload(page) });
}

describe("paginated virtual rows", () => {
  let application;
  let pagination;

  afterEach(async () => {
    vi.useRealTimers();
    pagination?.disconnect();
    document.body.innerHTML = "";
    await settle();
    application?.stop();
    application = null;
    pagination = null;
    vi.unstubAllGlobals();
  });

  function buildPagination(options = {}) {
    pagination = new PaginatedVirtualRows({
      rows: seedRows(),
      contract: { rowsUrl: "/samples/rows.json", pageSize: 20, totalRows: 1000 },
      cellSelector,
      rowHeight: () => 40,
      visibleRange: () => ({ startIndex: 0, endIndex: 20 }),
      onCacheChanged: vi.fn(),
      onRowsChanged: vi.fn(),
      onVisibleRowsChanged: vi.fn(),
      setBusy: vi.fn(),
      handleError: vi.fn(),
      ...options,
    });
    return pagination;
  }

  it("keeps a failed visible page's error until that page succeeds", async () => {
    const requests = mockPageRequests();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("requestAnimationFrame", (callback) => setTimeout(callback, 0));
    vi.stubGlobal("cancelAnimationFrame", clearTimeout);
    document.body.innerHTML = `
      <div data-controller="pathogen--data-grid" class="pvc-data-grid pvc-data-grid--virtual">
        <div data-pathogen--data-grid-target="scrollContainer">
          <div data-pathogen--data-grid-target="errorState" hidden>
            <p data-pathogen--data-grid-target="errorMessage"></p>
          </div>
          <div role="grid" data-pathogen--data-grid-target="grid"
            data-pvc-data-grid-total-count="200" data-pvc-data-grid-page-size="20"
            data-pvc-data-grid-rows-url="/samples/rows.json">
            <div role="status" data-pathogen--data-grid-target="virtualStatus"
              data-loaded-text="Rows loaded." data-fetch-error-text="Unable to load more rows."></div>
            <div role="row" class="pvc-data-grid__row--header" aria-rowindex="1">
              <div role="columnheader" tabindex="-1" data-pathogen--data-grid-target="cell"
                data-pathogen--data-grid-row-index="0" data-pathogen--data-grid-column-index="0">Sample</div>
            </div>
            <div data-pathogen--data-grid-target="viewport">
              <div class="pvc-data-grid__spacer"></div>
              ${seedRows()
                .map((row) => row.outerHTML)
                .join("")}
            </div>
          </div>
        </div>
      </div>`;
    const scrollContainer = document.querySelector('[data-pathogen--data-grid-target="scrollContainer"]');
    Object.defineProperty(scrollContainer, "clientHeight", { configurable: true, value: 200 });
    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await vi.waitFor(() => expect(requests.has(3)).toBe(true));
    completePage(requests, 2);
    completePage(requests, 3);
    await settle();

    scrollContainer.scrollTop = 2400;
    scrollContainer.dispatchEvent(new Event("scroll"));
    await settle();
    scrollContainer.dispatchEvent(new Event("scrollend"));
    await vi.waitFor(() => expect(requests.has(6)).toBe(true));
    requests.get(4).resolve({ ok: false, status: 500 });
    const errorState = document.querySelector('[data-pathogen--data-grid-target="errorState"]');
    await vi.waitFor(() => expect(errorState.hidden).toBe(false));

    completePage(requests, 5);
    completePage(requests, 6);
    await settle();
    expect(errorState.hidden).toBe(false);
    expect(document.querySelector('[data-pvc-data-grid-global-row-index="60"]').getAttribute("aria-busy")).toBe("true");

    scrollContainer.dispatchEvent(new Event("scrollend"));
    completePage(requests, 4);
    await vi.waitFor(() => expect(errorState.hidden).toBe(true));
    await vi.waitFor(() => {
      expect(document.querySelector('[data-pvc-data-grid-global-row-index="60"]').textContent).toContain("Sample 61");
    });
  });

  it("invalidates cached cells synchronously when eviction removes a retained row", () => {
    let retainedRowIndex = 2;
    const onCacheChanged = vi.fn();
    const rows = buildPagination({ retainedRowIndex: () => retainedRowIndex, onCacheChanged });
    rows.afterRender(0, 20, 20);
    expect(onCacheChanged).not.toHaveBeenCalled();

    rows.afterRender(400, 420, 20);
    expect(onCacheChanged).toHaveBeenCalledTimes(1);
    expect(rows.getCachedRows()).toEqual([rows.rowAt(2)]);
    rows.afterRender(400, 420, 20);
    expect(onCacheChanged).toHaveBeenCalledTimes(1);

    retainedRowIndex = null;
    rows.afterRender(400, 420, 20);
    expect(onCacheChanged).toHaveBeenCalledTimes(2);
    expect(rows.getCachedRows()).toEqual([]);
  });

  it("invalidates each completed page before its consumer reads a lazily rebuilt cache", async () => {
    const requests = mockPageRequests();
    let cachedRows = null;
    const onCacheChanged = vi.fn(() => {
      cachedRows = null;
    });
    const onRowsChanged = vi.fn();
    const rows = buildPagination({ onCacheChanged, onRowsChanged });
    const getCachedRows = vi.spyOn(rows, "getCachedRows");
    const readRows = () => (cachedRows ??= rows.getCachedRows());
    expect(readRows()).toHaveLength(20);
    rows.flushRange(0, 20);
    completePage(requests, 2);
    completePage(requests, 3);
    await settle();

    expect(onCacheChanged).toHaveBeenCalledTimes(2);
    expect(onRowsChanged).toHaveBeenCalledTimes(2);
    expect(getCachedRows).toHaveBeenCalledTimes(1);
    expect(readRows()).toHaveLength(60);
    expect(readRows()).toHaveLength(60);
    expect(getCachedRows).toHaveBeenCalledTimes(2);
    expect(onCacheChanged.mock.invocationCallOrder[0]).toBeLessThan(onRowsChanged.mock.invocationCallOrder[0]);
  });

  it("clones empty placeholder cells without repeatedly cloning their discarded widgets", () => {
    const seededRow = seedRows(1)[0];
    const cell = seededRow.querySelector(cellSelector);
    cell.innerHTML = '<button><svg><path d="M0 0"></path></svg>Inspect</button>';
    cell.setAttribute("data-pathogen--data-grid-active", "true");
    const rows = buildPagination({ rows: [seededRow] });
    const cloneNode = Node.prototype.cloneNode;
    const clonedWidgetCounts = [];
    vi.spyOn(Node.prototype, "cloneNode").mockImplementation(function (deep) {
      clonedWidgetCounts.push(this.querySelectorAll("button, svg, path").length);
      return cloneNode.call(this, deep);
    });

    const firstPlaceholder = rows.rowAt(20);
    const secondPlaceholder = rows.rowAt(21);

    expect(clonedWidgetCounts).toEqual([0, 0]);
    expect(firstPlaceholder.getAttribute("aria-rowindex")).toBe("22");
    expect(secondPlaceholder.querySelector(cellSelector).getAttribute("data-pathogen--data-grid-row-index")).toBe("22");
    expect(firstPlaceholder.querySelector(cellSelector).tabIndex).toBe(-1);
    expect(firstPlaceholder.querySelector(cellSelector).hasAttribute("data-pathogen--data-grid-active")).toBe(false);
    expect(cell.querySelector("button")).not.toBeNull();
  });

  it("fetches once after scrolling settles even when a native scrollend follows", async () => {
    vi.useFakeTimers();
    mockPageRequests();
    const rows = buildPagination({ visibleRange: () => ({ startIndex: 20, endIndex: 40 }) });
    rows.handleScroll();
    await vi.advanceTimersByTimeAsync(100);
    rows.handleScroll();
    await vi.advanceTimersByTimeAsync(149);
    expect(fetch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(3);
    rows.handleScrollEnd();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("keeps busy state until the final in-flight page settles", async () => {
    const requests = mockPageRequests();
    const setBusy = vi.fn();
    const rows = buildPagination({ setBusy });
    rows.flushRange(0, 20);
    completePage(requests, 2);
    await settle();
    expect(setBusy).toHaveBeenLastCalledWith(true);
    completePage(requests, 3);
    await settle();
    expect(setBusy).toHaveBeenLastCalledWith(false);
  });

  it("evicts late responses using the current viewport without retaining the gap to a focused row", async () => {
    const requests = mockPageRequests();
    let visibleRange = { startIndex: 0, endIndex: 20 };
    const rows = buildPagination({ visibleRange: () => visibleRange, retainedRowIndex: () => 2 });
    rows.afterRender(0, 20, 20);
    rows.flushRange(0, 20);

    visibleRange = { startIndex: 400, endIndex: 420 };
    rows.afterRender(400, 420, 20);
    rows.flushRange(400, 420);
    completePage(requests, 21);
    await settle();
    requests.forEach((_, page) => completePage(requests, page));
    await settle();

    const cachedIndexes = rows.getCachedRows().map((row) => Number(row.dataset.pvcDataGridGlobalRowIndex));
    expect(cachedIndexes).toEqual([2, ...Array.from({ length: 100 }, (_, index) => index + 360)]);
  });

  it("discards a fulfilled response body and its callbacks when disconnected before continuation", async () => {
    const body = deferred();
    const json = vi.fn(() => body.promise);
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json });
    const onRowsChanged = vi.fn();
    const onVisibleRowsChanged = vi.fn();
    const setBusy = vi.fn();
    const handleError = vi.fn();
    const rows = buildPagination({
      visibleRange: () => ({ startIndex: 20, endIndex: 40 }),
      onRowsChanged,
      onVisibleRowsChanged,
      setBusy,
      handleError,
    });
    rows.flushRange(20, 40);
    await settle();
    expect(json).toHaveBeenCalled();

    body.resolve(pagePayload(2));
    rows.disconnect();
    setBusy.mockClear();
    await settle();

    expect(rows.getCachedRows()).toHaveLength(20);
    expect(onRowsChanged).not.toHaveBeenCalled();
    expect(onVisibleRowsChanged).not.toHaveBeenCalled();
    expect(setBusy).not.toHaveBeenCalled();
    expect(handleError).not.toHaveBeenCalled();
  });

  it("preserves the focused row's element and input value when refetching its partially cached page", async () => {
    const requests = mockPageRequests();
    const rows = buildPagination({ rows: seedRows(10), retainedRowIndex: () => 2 });
    const focusedRow = rows.rowAt(2);
    const unfocusedRow = rows.rowAt(3);
    const input = document.createElement("input");
    focusedRow.appendChild(input);
    input.value = "Unsaved sample name";
    rows.afterRender(0, 20, 20);
    rows.flushRange(0, 20);
    completePage(requests, 1);
    await settle();

    expect(rows.rowAt(2)).toBe(focusedRow);
    expect(rows.rowAt(2).querySelector("input").value).toBe("Unsaved sample name");
    expect(rows.rowAt(3)).not.toBe(unfocusedRow);
    expect(rows.rowAt(3).textContent).toContain("Sample 4");
  });

  it("replaces a retained loading placeholder when its row arrives", async () => {
    const requests = mockPageRequests();
    const placeholder = seedRows(1)[0];
    placeholder.setAttribute("aria-busy", "true");
    const rows = buildPagination({ rows: [placeholder], retainedRowIndex: () => 0 });
    rows.flushRange(0, 20);
    completePage(requests, 1);
    await settle();

    expect(rows.rowAt(0)).not.toBe(placeholder);
    expect(rows.rowAt(0).hasAttribute("aria-busy")).toBe(false);
    expect(rows.rowAt(0).textContent).toContain("Sample 1");
  });

  it("ignores late failures and further fetch requests after disconnect", async () => {
    const requests = mockPageRequests();
    const handleError = vi.fn();
    const setBusy = vi.fn();
    const rows = buildPagination({ handleError, setBusy });
    rows.flushRange(20, 40);
    rows.handleScroll();
    rows.disconnect();
    setBusy.mockClear();
    requests.forEach((request) => request.reject(new Error("Connection closed")));
    await settle();

    expect(handleError).not.toHaveBeenCalled();
    expect(setBusy).not.toHaveBeenCalled();
    const requestCount = fetch.mock.calls.length;
    rows.flushRange(400, 420);
    expect(fetch).toHaveBeenCalledTimes(requestCount);
  });

  it("ignores scroll events after disconnect", () => {
    vi.useFakeTimers();
    mockPageRequests();
    const rows = buildPagination({ visibleRange: () => ({ startIndex: 20, endIndex: 40 }) });
    rows.disconnect();

    rows.handleScroll();
    vi.advanceTimersByTime(200);

    expect(fetch).not.toHaveBeenCalled();
  });

  it("absorbs cache changes with a no-op callback when none is provided", async () => {
    const requests = mockPageRequests();
    pagination = new PaginatedVirtualRows({
      rows: seedRows(),
      contract: { rowsUrl: "/samples/rows.json", pageSize: 20, totalRows: 1000 },
      cellSelector,
      rowHeight: () => 40,
      visibleRange: () => ({ startIndex: 0, endIndex: 20 }),
      onRowsChanged: vi.fn(),
      onVisibleRowsChanged: vi.fn(),
      setBusy: vi.fn(),
      handleError: vi.fn(),
    });

    pagination.flushRange(20, 40);
    completePage(requests, 2);
    await settle();

    expect(pagination.getCachedRows().length).toBeGreaterThan(20);
  });

  it("builds a minimal fallback placeholder when no seed row is available", () => {
    const rows = buildPagination({ rows: [] });

    const placeholder = rows.rowAt(5);

    expect(placeholder.getAttribute("role")).toBe("row");
    expect(placeholder.getAttribute("aria-busy")).toBe("true");
    expect(placeholder.getAttribute("aria-rowindex")).toBe("7");
    expect(placeholder.dataset.pvcDataGridGlobalRowIndex).toBe("5");
    expect(placeholder.style.height).toBe("40px");
    expect(placeholder.style.minHeight).toBe("40px");
  });

  it("swallows an AbortError raised by a row-change callback during teardown", async () => {
    const requests = mockPageRequests();
    const handleError = vi.fn();
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const rows = buildPagination({
      handleError,
      onRowsChanged: () => {
        throw abortError;
      },
    });

    rows.flushRange(0, 20);
    completePage(requests, 2);
    await settle();

    expect(handleError).not.toHaveBeenCalled();
  });
});
