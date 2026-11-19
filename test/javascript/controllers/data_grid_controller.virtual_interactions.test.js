import { Application } from "@hotwired/stimulus";
import { afterEach, describe, expect, it, vi } from "vitest";

import DataGridController from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller";

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const dispatchKey = (target, key, options = {}) =>
  target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key, ...options }));

let application;

afterEach(() => {
  application?.stop();
  application = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function rowMarkup(index, columns) {
  const cells = Array.from(
    { length: columns },
    (_, column) =>
      `<div role="gridcell" tabindex="${index === 0 && column === 0 ? 0 : -1}"
        data-pathogen--data-grid-target="cell" data-pathogen--data-grid-row-index="${index + 1}"
        data-pathogen--data-grid-column-index="${column}">R${index + 1}C${column}</div>`,
  );
  return `<div role="row" style="height:40px">${cells.join("")}</div>`;
}

async function startVirtual({ rows = 60, columns = 3, withScroll = true } = {}) {
  const widths = Array.from({ length: columns }, () => "100").join(",");
  const body = Array.from({ length: rows }, (_, index) => rowMarkup(index, columns)).join("");
  const grid = `
    <div role="grid" data-pathogen--data-grid-target="grid" aria-colcount="${columns}"
      data-pvc-data-grid-column-widths="${widths}">
      <div data-pathogen--data-grid-target="viewport"><div class="pvc-data-grid__spacer"></div>${body}</div>
    </div>`;
  document.body.innerHTML = `
    <div data-controller="pathogen--data-grid">
      ${withScroll ? '<div data-pathogen--data-grid-target="scrollContainer">' + grid + "</div>" : grid}
      <p data-pathogen--data-grid-target="virtualStatus"></p>
    </div>`;
  if (withScroll) {
    const scroll = document.querySelector('[data-pathogen--data-grid-target="scrollContainer"]');
    Object.defineProperties(scroll, {
      clientHeight: { configurable: true, value: 200 },
      clientWidth: { configurable: true, value: 300 },
    });
  }
  application = Application.start();
  application.register("pathogen--data-grid", DataGridController);
  await flush();
}

describe("data_grid_controller virtual navigation shortcuts", () => {
  it("jumps to the last virtual cell with Ctrl+End", async () => {
    await startVirtual({ rows: 60, columns: 3 });
    const first = document.querySelector('[role="gridcell"]');
    first.focus();

    dispatchKey(first, "End", { ctrlKey: true });
    await flush();

    const active = document.activeElement;
    expect(active.getAttribute("data-pathogen--data-grid-row-index")).toBe("60");
    expect(active.getAttribute("data-pathogen--data-grid-column-index")).toBe("2");
  });

  it("pages down through the virtual window", async () => {
    await startVirtual({ rows: 60, columns: 1 });
    const first = document.querySelector('[role="gridcell"]');
    first.focus();

    const event = dispatchKey(first, "PageDown");
    await flush();

    expect(event).toBe(false);
    expect(document.activeElement).not.toBe(first);
  });

  it("renders a virtual grid without a scroll container", async () => {
    await expect(startVirtual({ rows: 20, columns: 2, withScroll: false })).resolves.toBeUndefined();
    expect(document.querySelector("[data-virtual-ready]")).not.toBeNull();
  });
});

describe("data_grid_controller paginated status and errors", () => {
  const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  function paginatedMarkup() {
    const seed = Array.from({ length: 2 }, (_, index) => rowMarkup(index, 1)).join("");
    return `
      <div data-controller="pathogen--data-grid">
        <div data-pathogen--data-grid-target="scrollContainer">
          <div role="grid" data-pathogen--data-grid-target="grid" aria-colcount="1"
            data-pvc-data-grid-column-widths="100" data-pvc-data-grid-row-overscan="0"
            data-pvc-data-grid-total-count="200" data-pvc-data-grid-page-size="2"
            data-pvc-data-grid-rows-url="/samples/rows.json">
            <p role="status" data-pathogen--data-grid-target="virtualStatus" data-loaded-text="Rows loaded."></p>
            <div data-pathogen--data-grid-target="viewport"><div class="pvc-data-grid__spacer"></div>${seed}</div>
          </div>
        </div>
        <p role="status" data-pathogen--data-grid-target="paginationStatus"
          data-loading-text="Loading more rows." data-loaded-text="%{count} rows loaded."
          data-end-text="All %{count} rows loaded." data-fetch-error-text="Unable to load more rows."
          data-mismatch-text="Refresh results" data-range-text="Rows %{start}–%{end} · %{count} loaded"
          data-range-total-text="Rows %{start}–%{end} of %{total}"></p>
        <button hidden data-pathogen--data-grid-target="paginationRetry"
          data-action="click->pathogen--data-grid#retryRows">Retry</button>
        <div data-pathogen--data-grid-target="errorState"
          data-default-message="Something went wrong while rendering this grid." hidden>
          <p data-pathogen--data-grid-target="errorMessage"></p>
        </div>
      </div>`;
  }

  async function startPaginated(fetchImpl) {
    vi.spyOn(globalThis, "fetch").mockImplementation(fetchImpl);
    document.body.innerHTML = paginatedMarkup();
    const scroll = document.querySelector('[data-pathogen--data-grid-target="scrollContainer"]');
    Object.defineProperties(scroll, {
      clientHeight: { configurable: true, value: 80 },
      clientWidth: { configurable: true, value: 100 },
    });
    application = Application.start();
    application.register("pathogen--data-grid", DataGridController);
    await flush();
  }

  it("announces loading and loaded status while fetching pages", async () => {
    const pending = deferred();
    await startPaginated(() => pending.promise);
    const status = document.querySelector('[data-pathogen--data-grid-target="paginationStatus"]');

    expect(status.textContent).toContain("Loading more rows.");

    pending.resolve({
      ok: true,
      json: async () => ({
        rows: [
          { index: 2, html: rowMarkup(2, 1) },
          { index: 3, html: rowMarkup(3, 1) },
        ],
      }),
    });
    await settle();
    await settle();

    expect(document.querySelector('[data-pathogen--data-grid-target="grid"]').getAttribute("aria-busy")).toBe("false");
  });

  it("shows the fetch error message when a page request fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const pending = deferred();
    await startPaginated(() => pending.promise);

    pending.reject(new Error("network down"));
    await settle();
    await settle();

    const status = document.querySelector('[data-pathogen--data-grid-target="paginationStatus"]');
    expect(status.textContent).toContain("Unable to load more rows.");
    expect(document.querySelector('[data-pathogen--data-grid-target="paginationRetry"]').hidden).toBe(false);
  });
});
