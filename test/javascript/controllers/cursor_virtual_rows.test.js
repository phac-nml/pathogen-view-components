import { afterEach, describe, expect, it, vi } from "vitest";
import { PaginatedVirtualRows } from "pathogen_view_components/data_grid_controller/paginated_virtual_rows";

const cellSelector = '[data-pathogen--data-grid-target~="cell"]';

function rowHTML(index) {
  return `<div role="row" aria-rowindex="${index + 2}" data-pvc-data-grid-global-row-index="${index}">
    <div role="gridcell" tabindex="-1" data-pathogen--data-grid-target="cell"
      data-pathogen--data-grid-row-index="${index + 1}" data-pathogen--data-grid-column-index="0">Sample ${index + 1}</div>
  </div>`;
}

function payload(start, count = 2, next = null) {
  return {
    rows: Array.from({ length: count }, (_, index) => ({ index: start + index, html: rowHTML(start + index) })),
    next_cursor: next,
  };
}

const response = (body) => ({ ok: true, json: async () => body });

function deferred() {
  let resolve;
  const promise = new Promise((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe("cursor virtual rows", () => {
  let provider;

  afterEach(() => {
    provider?.disconnect();
    provider = null;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function build(options = {}) {
    const container = document.createElement("div");
    container.innerHTML = rowHTML(0) + rowHTML(1);
    const callbacks = {
      onCacheChanged: vi.fn(),
      onRowsChanged: vi.fn(),
      onVisibleRowsChanged: vi.fn(),
      setBusy: vi.fn(),
      handleError: vi.fn(),
    };
    provider = new PaginatedVirtualRows({
      rows: [...container.children],
      contract: { mode: "cursor", rowsUrl: "/samples/rows.json", pageSize: 2, nextCursor: "two" },
      cellSelector,
      rowHeight: () => 40,
      visibleRange: () => ({ startIndex: 0, endIndex: 2 }),
      ...callbacks,
      ...options,
    });
    return { rows: provider, ...callbacks };
  }

  it("pauses automatic loading after failure until explicit retry succeeds", async () => {
    vi.useFakeTimers();
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: false, status: 503 });
    const { rows, handleError, onRowsChanged, setBusy } = build();
    await rows.flushRange(0, 2);
    expect(handleError).toHaveBeenCalledTimes(1);
    expect(rows.totalRows).toBe(2);
    expect(setBusy).toHaveBeenLastCalledWith(false);
    await rows.flushRange(0, 2);
    rows.handleScrollEnd();
    rows.handleScroll();
    await vi.advanceTimersByTimeAsync(150);
    expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockResolvedValue(response(payload(2)));
    await rows.retry();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(new URL(fetch.mock.lastCall[0]).searchParams.get("cursor")).toBe("two");
    expect(rows.totalRows).toBe(4);
    expect(rows.hasMore).toBe(false);
    expect(onRowsChanged).toHaveBeenLastCalledWith({ hasPageErrors: false });
    await rows.retry();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("deduplicates a boundary batch requested by scroll and the load-more control", async () => {
    const pending = deferred();
    const fetch = vi.spyOn(globalThis, "fetch").mockReturnValueOnce(pending.promise);
    const { rows, setBusy } = build();
    const scroll = rows.flushRange(0, 2);
    const button = rows.loadNext();
    rows.handleScrollEnd();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(setBusy).toHaveBeenLastCalledWith(true);
    pending.resolve(response(payload(2, 2, "four")));
    await Promise.all([scroll, button]);
    expect(rows.totalRows).toBe(4);
    expect(setBusy).toHaveBeenLastCalledWith(false);
  });

  it("restores evicted earlier rows while retaining the focused row and the forward cursor", async () => {
    let visibleRange = { startIndex: 0, endIndex: 2 };
    const fetch = vi.spyOn(globalThis, "fetch");
    const { rows, onCacheChanged, onVisibleRowsChanged } = build({
      visibleRange: () => visibleRange,
      retainedRowIndex: () => 0,
    });
    for (let start = 2; start < 20; start += 2) {
      fetch.mockResolvedValue(response(payload(start, 2, String(start + 2))));
      await rows.loadNext();
    }
    rows.afterRender(18, 20, 0);
    expect(rows.rowAt(0).textContent).toContain("Sample 1");
    expect(rows.rowAt(1).getAttribute("aria-busy")).toBe("true");
    expect(rows.getCachedRows().length).toBeLessThan(10);
    visibleRange = { startIndex: 0, endIndex: 2 };
    rows.afterRender(0, 2, 0);
    fetch.mockResolvedValue(response(payload(0, 2, "reissued-two")));
    await rows.flushRange(0, 2);
    expect(new URL(fetch.mock.lastCall[0]).searchParams.has("cursor")).toBe(false);
    expect(rows.rowAt(1).textContent).toContain("Sample 2");
    expect(rows.rowAt(1).hasAttribute("aria-busy")).toBe(false);
    expect(rows.totalRows).toBe(20);
    expect(onCacheChanged).toHaveBeenCalled();
    expect(onVisibleRowsChanged).toHaveBeenCalled();
    fetch.mockResolvedValue(response(payload(20)));
    await rows.loadNext();
    expect(new URL(fetch.mock.lastCall[0]).searchParams.get("cursor")).toBe("20");
    expect(rows.totalRows).toBe(22);
  });

  it("aborts an in-flight batch on disconnect and ignores its late result", async () => {
    const pending = deferred();
    const fetch = vi.spyOn(globalThis, "fetch").mockReturnValueOnce(pending.promise);
    const { rows, onCacheChanged, onRowsChanged, onVisibleRowsChanged, handleError, setBusy } = build();
    const loading = rows.loadNext();
    const signal = fetch.mock.calls[0][1].signal;
    rows.disconnect();
    expect(signal.aborted).toBe(true);
    pending.resolve(response(payload(2)));
    await loading;
    expect(rows.totalRows).toBe(2);
    expect(onCacheChanged).not.toHaveBeenCalled();
    expect(onRowsChanged).not.toHaveBeenCalled();
    expect(onVisibleRowsChanged).not.toHaveBeenCalled();
    expect(handleError).not.toHaveBeenCalled();
    expect(setBusy.mock.calls).toEqual([[true], [false]]);
  });

  it("cancels scheduled scroll loading and refuses new requests after disconnect", async () => {
    vi.useFakeTimers();
    const fetch = vi.spyOn(globalThis, "fetch");
    const { rows } = build();
    rows.handleScroll();
    rows.disconnect();
    await vi.runAllTimersAsync();
    rows.handleScroll();
    rows.handleScrollEnd();
    await rows.loadNext();
    await rows.retry();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("finishes on an empty terminal batch without adding placeholder rows", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(payload(2, 0)));
    const { rows, onRowsChanged, onVisibleRowsChanged } = build();
    await rows.loadNext();
    expect(rows.cursorMode).toBe(true);
    expect(rows.totalRows).toBe(2);
    expect(rows.hasMore).toBe(false);
    expect(onRowsChanged).toHaveBeenCalledWith({ hasPageErrors: false });
    expect(onVisibleRowsChanged).toHaveBeenCalled();
  });
});
