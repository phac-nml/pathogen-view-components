import { afterEach, describe, expect, it, vi } from "vitest";
import { CursorRowSource } from "pathogen_view_components/data_grid_controller/cursor_source";

function rowHTML(index) {
  return `<div role="row" aria-rowindex="${index + 2}" data-pvc-data-grid-global-row-index="${index}">
    <div role="gridcell" tabindex="${index === 0 ? 0 : -1}" data-pathogen--data-grid-target="cell"
      data-pathogen--data-grid-row-index="${index + 1}" data-pathogen--data-grid-column-index="0">Sample ${index + 1}</div>
  </div>`;
}
const payload = (start, count, next = null) => ({
  rows: Array.from({ length: count }, (_, i) => ({ index: start + i, html: rowHTML(start + i) })),
  next_cursor: next,
});
const seed = () => {
  const el = document.createElement("div");
  el.innerHTML = rowHTML(0) + rowHTML(1);
  return [...el.children];
};
function source(options = {}) {
  const result = new CursorRowSource({
    url: "/rows?page=9&cursor=wrong",
    pageSize: 2,
    nextCursor: "two",
    retainedRowIndex: () => null,
    ...options,
  });
  result.seedFromRows(seed());
  return result;
}
function respond(body) {
  return { ok: true, json: async () => body };
}
afterEach(() => vi.restoreAllMocks());

describe("cursor row source", () => {
  it("grows sequentially, deduplicates requests, exhausts and overrides pagination controls", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(respond(payload(2, 2, "four")));
    const rows = source({ searchParams: "q[name]=x&tag=a&tag=b&limit=99&page=7&cursor=wrong" });
    expect(rows.missingPagesForRange(0, 1)).toEqual([]);
    expect(rows.missingPagesForRange(0, 2)).toEqual([2]);
    const pending = rows.fetchPage(2);
    expect(rows.fetchPage(2)).toBe(pending);
    expect(rows.isFetching).toBe(true);
    expect(rows.missingPagesForRange(0, 2)).toEqual([]);
    await pending;
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.searchParams.get("cursor")).toBe("two");
    expect(url.searchParams.has("page")).toBe(false);
    expect(url.searchParams.get("limit")).toBe("2");
    expect(url.searchParams.getAll("tag")).toEqual(["a", "b"]);
    expect(rows.totalRows).toBe(4);
    expect(rows.isFetching).toBe(false);
    fetch.mockResolvedValue(respond(payload(4, 1)));
    await rows.fetchPage(3);
    expect(rows.totalRows).toBe(5);
    expect(rows.hasMore).toBe(false);
    expect(rows.missingPagesForRange(0, 5)).toEqual([]);
    await rows.fetchPage(4);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("evicts HTML but restores earlier cursor checkpoints and retains focus", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(respond(payload(2, 2, "four")));
    const rows = source({ retainedRowIndex: () => 0 });
    for (let start = 2; start < 20; start += 2) {
      fetch.mockResolvedValue(respond(payload(start, 2, String(start + 2))));
      await rows.fetchPage(rows.nextPage);
    }
    expect(rows.evictOutsideRange(18, 20, 0)).toBe(true);
    expect(rows.getRow(0)).not.toBeNull();
    expect(rows.getRow(1)).toBeNull();
    expect(rows.getCachedRows().length).toBeLessThan(10);
    expect(rows.missingPagesForRange(0, 2)).toEqual([1]);
    fetch.mockResolvedValue(respond(payload(0, 2, "two")));
    await rows.fetchPage(1);
    expect(new URL(fetch.mock.lastCall[0]).searchParams.has("cursor")).toBe(false);
    expect(rows.getRow(1).textContent).toContain("Sample 2");
    expect(rows.totalRows).toBe(20);
    expect(rows.hasMore).toBe(true);
  });

  it.each([400, 409, 410, 422, 500])("reports HTTP %s with appropriate recovery", async (status) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status });
    await expect(source().fetchPage(2)).rejects.toMatchObject({ refreshRequired: status !== 500 });
  });

  it.each([
    { rows: [], next_cursor: "again" },
    payload(3, 2),
    { rows: [{ index: 2, html: "invalid" }], next_cursor: null },
    { ...payload(2, 2), next_cursor: "two" },
    { rows: [], next_cursor: undefined },
    payload(2, 3),
  ])("rejects malformed or non-progressing responses", async (body) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respond(body));
    const rows = source();
    await expect(rows.fetchPage(2)).rejects.toMatchObject({ refreshRequired: true });
    expect(rows.totalRows).toBe(2);
  });

  it("rejects a restored range with a changed length", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respond(payload(0, 1)));
    await expect(source().fetchPage(1)).rejects.toMatchObject({ refreshRequired: true });
  });

  it("accepts a reissued opaque cursor when restoring an earlier page without moving the frontier", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(respond(payload(2, 2, "four")));
    const rows = source();
    await rows.fetchPage(2);
    fetch.mockResolvedValue(respond(payload(0, 2, "newly-signed-two")));
    await rows.fetchPage(1);
    expect(rows.totalRows).toBe(4);
    expect(rows.nextPage).toBe(3);
    fetch.mockResolvedValue(respond(payload(4, 2)));
    await rows.fetchPage(3);
    expect(new URL(fetch.mock.lastCall[0]).searchParams.get("cursor")).toBe("four");
  });

  it("clears a failed request so an explicit retry uses the same cursor and row indexes", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Offline"));
    const rows = source();
    await expect(rows.fetchPage(2)).rejects.toThrow("Offline");
    expect(rows.isFetching).toBe(false);
    expect(rows.totalRows).toBe(2);
    expect(rows.missingPagesForRange(0, 2)).toEqual([2]);
    fetch.mockResolvedValue(respond(payload(2, 2)));
    await rows.fetchPage(2);
    expect(fetch.mock.calls[1][0]).toBe(fetch.mock.calls[0][0]);
    expect(rows.totalRows).toBe(4);
  });

  it("does not jump ahead of the next cursor checkpoint", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const rows = source();
    await rows.fetchPage(3);
    expect(fetch).not.toHaveBeenCalled();
    expect(rows.nextPage).toBe(2);
  });

  it("ignores late responses after cancellation", async () => {
    const abort = new AbortController();
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      abort.abort();
      return respond(payload(2, 2));
    });
    const rows = source();
    expect(await rows.fetchPage(2, { signal: abort.signal })).toMatchObject({ aborted: true });
    expect(rows.totalRows).toBe(2);
    expect(rows.getRow(2)).toBeNull();
  });

  it("supports empty exhausted results without requests", async () => {
    const rows = source({ nextCursor: null });
    rows.seedFromRows([]);
    expect(rows.totalRows).toBe(0);
    expect(rows.hasMore).toBe(false);
    expect(rows.needsRow(-1)).toBe(false);
    expect(rows.missingPagesForRange(0, 1)).toEqual([]);
  });
});
