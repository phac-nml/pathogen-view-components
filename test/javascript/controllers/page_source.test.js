import { describe, expect, it } from "vitest";

import { PaginatedRowSource, parseRows } from "pathogen_view_components/data_grid_controller/page_source";

const makeSource = (overrides = {}) =>
  new PaginatedRowSource({
    url: "/rows.json",
    pageSize: 20,
    totalRows: 100,
    origin: "https://example.test",
    fetchFn: async () => ({ ok: true, json: async () => ({ rows: [] }) }),
    ...overrides,
  });

describe("parseRows", () => {
  it("returns an empty map for missing or malformed payloads", () => {
    expect(parseRows(null).size).toBe(0);
    expect(parseRows({}).size).toBe(0);
    expect(parseRows({ rows: [{ index: 1, html: "   " }] }).size).toBe(0);
  });

  it("skips entries that do not parse into a row element", () => {
    const rows = parseRows({
      rows: [
        { index: 0, html: '<div role="row">A</div>' },
        { index: 1, html: "<span>not a row</span>" },
      ],
    });

    expect(rows.size).toBe(1);
    expect(rows.get(0)?.getAttribute("role")).toBe("row");
  });
});

describe("PaginatedRowSource.needsRow", () => {
  it("guards against non-finite or out-of-range indexes", () => {
    const source = makeSource();
    expect(source.needsRow(Number.NaN)).toBe(false);
    expect(source.needsRow(-1)).toBe(false);
    expect(source.needsRow(100)).toBe(false);
    expect(source.needsRow(5)).toBe(true);
  });
});

describe("PaginatedRowSource.missingPagesForRange", () => {
  it("returns nothing for invalid ranges", () => {
    const source = makeSource();
    expect(source.missingPagesForRange(-1, 5)).toEqual([]);
    expect(source.missingPagesForRange(5, 5)).toEqual([]);
  });
});

describe("PaginatedRowSource.fetchPage error handling", () => {
  it("throws when the response is not ok", async () => {
    const source = makeSource({
      fetchFn: async () => ({ ok: false, status: 500, json: async () => ({}) }),
    });

    await expect(source.fetchPage(1)).rejects.toThrow(/status 500/);
  });

  it("resolves as aborted when the request is aborted", async () => {
    const source = makeSource({
      fetchFn: async () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      },
    });

    const result = await source.fetchPage(1);

    expect(result.aborted).toBe(true);
    expect(result.rows.size).toBe(0);
  });

  it("rethrows non-abort fetch errors", async () => {
    const source = makeSource({
      fetchFn: async () => {
        throw new Error("network down");
      },
    });

    await expect(source.fetchPage(1)).rejects.toThrow(/network down/);
  });
});
