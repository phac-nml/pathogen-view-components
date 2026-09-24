import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DataGridController from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller";
const settle = () => new Promise((resolve) => setTimeout(resolve, 10));
let application;
let controller;
const target = (name) => document.querySelector(`[data-pathogen--data-grid-target="${name}"]`);
const cell = (row) => document.querySelector(`[data-pathogen--data-grid-row-index="${row}"]`);
const key = (element, name, options = {}) =>
  element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: name, ...options }));
function row(index) {
  return `<div role="row" aria-rowindex="${index + 2}" data-pvc-data-grid-global-row-index="${index}">
  <div role="gridcell" tabindex="${index === 0 ? 0 : -1}" data-pathogen--data-grid-target="cell" data-pathogen--data-grid-row-index="${index + 1}" data-pathogen--data-grid-column-index="0">Row ${index + 1}</div></div>`;
}
const response = (start, count, next = null) => ({
  ok: true,
  json: async () => ({
    rows: Array.from({ length: count }, (_, i) => ({ index: start + i, html: row(start + i) })),
    next_cursor: next,
  }),
});
async function start({ count = 4, cursor = "next", footer = true, position = true, total = null } = {}) {
  document.body.innerHTML = `<button id="before">Before</button><div data-controller="pathogen--data-grid">
    <div data-pathogen--data-grid-target="scrollContainer"><div role="grid" aria-rowcount="-1" data-pathogen--data-grid-target="grid"
      data-pvc-data-grid-pagination-mode="cursor" data-pvc-data-grid-next-cursor="${cursor}" data-pvc-data-grid-page-size="4"
      ${total === null ? "" : `data-pvc-data-grid-total-count="${total}"`}
      data-pvc-data-grid-column-widths="100" data-pvc-data-grid-row-height="40" data-pvc-data-grid-row-overscan="0" data-pvc-data-grid-rows-url="/rows">
    <div data-pathogen--data-grid-target="viewport"><div class="pvc-data-grid__spacer"></div>${Array.from({ length: count }, (_, i) => row(i)).join("")}</div></div></div>
    ${
      footer
        ? `<p data-pathogen--data-grid-target="paginationStatus" role="status" data-loading-text="Loading more rows" data-loaded-text="%{count} rows loaded" data-end-text="All %{count} rows loaded" data-fetch-error-text="Try again" data-mismatch-text="Refresh results" data-range-text="Rows %{start}–%{end} · %{count} loaded" data-range-total-text="Rows %{start}–%{end} of %{total}"></p>
    ${position ? '<p data-pathogen--data-grid-target="paginationPosition"></p>' : ""}
    <button hidden data-pathogen--data-grid-target="paginationRetry" data-action="click->pathogen--data-grid#retryRows">Retry</button>
    <a hidden href="/refresh" data-pathogen--data-grid-target="paginationRefresh" data-action="click->pathogen--data-grid#refreshRows">Refresh</a>`
        : ""
    }
    </div><button id="after">After</button>`;
  Object.defineProperties(target("scrollContainer"), {
    clientHeight: { value: 80 },
    clientWidth: { value: 100 },
    scrollHeight: { value: 160 },
  });
  application = Application.start();
  application.register("pathogen--data-grid", DataGridController);
  await settle();
  controller = application.getControllerForElementAndIdentifier(
    document.querySelector("[data-controller]"),
    "pathogen--data-grid",
  );
}
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("requestAnimationFrame", (callback) => setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
});
afterEach(async () => {
  document.body.innerHTML = "";
  await settle();
  application?.stop();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("cursor grid interactions", () => {
  it("shows a supplied full total without expanding loaded navigation and discovers the final count", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(response(4, 2));
    await start({ total: 1000 });
    expect(target("grid").getAttribute("aria-rowcount")).toBe("1001");
    expect(target("grid").dataset.pvcDataGridLoadedCount).toBe("4");
    expect(target("paginationPosition").textContent).toBe("Rows 1–2 of 1000");
    expect(target("viewport").querySelector(".pvc-data-grid__spacer").style.height).toBe("160px");
    cell(1).focus();
    key(cell(1), "End", { ctrlKey: true });
    expect(document.activeElement).toBe(cell(4));
    expect(fetch).not.toHaveBeenCalled();

    key(cell(4), "ArrowDown");
    await settle();
    expect(target("grid").getAttribute("aria-rowcount")).toBe("7");
    expect(target("grid").dataset.pvcDataGridLoadedCount).toBe("6");
    expect(target("paginationPosition").textContent).toBe("Rows 4–5 of 6");
    expect(target("viewport").querySelector(".pvc-data-grid__spacer").style.height).toBe("240px");
  });

  it("preserves the known total when a loaded cursor session is snapshotted and reconnected", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(4, 4, "later"));
    await start({ total: 1000 });
    cell(1).focus();
    key(cell(1), "End", { ctrlKey: true });
    key(cell(4), "ArrowDown");
    await settle();
    expect(target("paginationPosition").textContent).toBe("Rows 4–5 of 1000");
    document.dispatchEvent(new Event("turbo:before-cache"));
    expect(target("grid").getAttribute("aria-rowcount")).toBe("1001");
    expect(target("grid").dataset.pvcDataGridLoadedCount).toBe("4");
    controller.connect();
    await settle();
    expect(target("grid").getAttribute("aria-rowcount")).toBe("1001");
    expect(target("paginationPosition").textContent).toBe("Rows 1–2 of 1000");
  });

  it("shows a known empty total without fetching", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    await start({ count: 0, cursor: "", total: 0 });
    expect(target("grid").getAttribute("aria-rowcount")).toBe("1");
    expect(target("paginationPosition").textContent).toBe("Rows 0–0 of 0");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("grows after boundary navigation, retains focus while waiting and discovers the total", async () => {
    let resolve;
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await start();
    cell(1).focus();
    key(cell(1), "End", { ctrlKey: true });
    expect(document.activeElement).toBe(cell(4));
    expect(fetch).not.toHaveBeenCalled();
    key(cell(4), "ArrowDown");
    expect(document.activeElement).toBe(cell(4));
    expect(target("grid").getAttribute("aria-rowcount")).toBe("-1");
    expect(target("paginationStatus").textContent).toBe("Loading more rows");
    resolve(response(4, 2));
    await settle();
    expect(document.activeElement).toBe(cell(5));
    expect(target("grid").getAttribute("aria-rowcount")).toBe("7");
    expect(target("viewport").querySelector(".pvc-data-grid__spacer").style.height).toBe("240px");
    expect(target("paginationStatus").textContent).toBe("All 6 rows loaded");
    expect(target("paginationPosition").textContent).toContain("of 6");
    key(cell(5), "End", { ctrlKey: true });
    key(cell(6), "ArrowDown");
    await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each(["focus", "key", "click"])("does not steal focus when %s cancels pending movement", async (cancel) => {
    let resolve;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await start();
    cell(1).focus();
    key(cell(1), "End", { ctrlKey: true });
    key(cell(4), "PageDown");
    if (cancel === "focus") document.querySelector("#after").focus();
    if (cancel === "key") key(cell(4), "ArrowUp");
    if (cancel === "click") cell(3).click();
    const active = document.activeElement;
    resolve(response(4, 4, "later"));
    await settle();
    expect(document.activeElement).toBe(active);
    expect(target("paginationStatus").textContent).toBe("8 rows loaded");
  });

  it("preserves rows on failure, retries explicitly and keeps the retry user's focus", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    await start();
    cell(1).focus();
    key(cell(1), "End", { ctrlKey: true });
    key(cell(4), "ArrowDown");
    await settle();
    expect(cell(4).textContent).toBe("Row 4");
    expect(target("paginationRetry").hidden).toBe(false);
    expect(target("paginationStatus").textContent).toBe("Try again");
    target("scrollContainer").dispatchEvent(new Event("scrollend"));
    await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockResolvedValue(response(4, 2));
    target("paginationRetry").focus();
    target("paginationRetry").click();
    await settle();
    expect(target("paginationRetry").hidden).toBe(true);
    expect(document.activeElement).toBe(cell(4));
    expect(target("grid").getAttribute("aria-rowcount")).toBe("7");
    expect(document.querySelector('[data-pvc-data-grid-state="error"]')).toBeNull();
  });

  it("offers refresh for invalid cursors and allows host interception", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status: 409 });
    await start();
    cell(1).focus();
    key(cell(1), "End", { ctrlKey: true });
    key(cell(4), "ArrowDown");
    await settle();
    expect(target("paginationRetry").hidden).toBe(true);
    expect(target("paginationRefresh").hidden).toBe(false);
    expect(target("paginationStatus").textContent).toBe("Refresh results");
    const event = new Event("click", { cancelable: true });
    controller.refreshRows(event);
    expect(event.defaultPrevented).toBe(false);
    document
      .querySelector("[data-controller]")
      .addEventListener("pathogen--data-grid:refresh", (event) => event.preventDefault());
    controller.refreshRows(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("falls back to retry when cursor mismatch occurs without a refresh control", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status: 409 });
    await start();
    target("paginationRefresh").remove();
    cell(1).focus();
    key(cell(1), "End", { ctrlKey: true });
    key(cell(4), "ArrowDown");
    await settle();
    expect(target("paginationRetry").hidden).toBe(false);
    expect(target("paginationStatus").textContent).toBe("Try again");
    expect(cell(4).textContent).toBe("Row 4");
  });

  it("ignores outstanding responses after scoped replacement", async () => {
    let resolve;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await start();
    cell(1).focus();
    key(cell(1), "End", { ctrlKey: true });
    key(cell(4), "ArrowDown");
    const oldGrid = target("grid");
    document.querySelector("[data-controller]").remove();
    await settle();
    resolve(response(4, 4));
    await settle();
    expect(oldGrid.dataset.pvcDataGridLoadedCount).toBe("4");
  });

  it("supports an empty exhausted grid and an optional position label", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    await start({ count: 0, cursor: "", position: false });
    expect(target("grid").getAttribute("aria-rowcount")).toBe("1");
    expect(fetch).not.toHaveBeenCalled();
    controller.retryRows();
  });
  it("moves within the loaded range without requesting another batch", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    await start();
    cell(1).focus();
    key(cell(1), "ArrowDown");
    expect(document.activeElement).toBe(cell(2));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("handles optional recovery controls and partial message templates", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status: 409 });
    await start();
    target("paginationRetry").remove();
    target("paginationRefresh").remove();
    delete target("paginationStatus").dataset.mismatchText;
    target("paginationStatus").dataset.loadingText = "Loading %{missing}";
    cell(1).focus();
    key(cell(1), "End", { ctrlKey: true });
    key(cell(4), "ArrowDown");
    expect(target("paginationStatus").textContent).toBe("Loading ");
    await settle();
    expect(target("paginationStatus").textContent).toBe("Try again");
    expect(cell(4).textContent).toBe("Row 4");
  });

  it("does not focus a server row that contains no focusable grid cells", async () => {
    const result = response(4, 1);
    const body = await result.json();
    body.rows[0].html = '<div role="row" aria-rowindex="6" data-pvc-data-grid-global-row-index="4"></div>';
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => body });
    await start();
    cell(1).focus();
    key(cell(1), "End", { ctrlKey: true });
    key(cell(4), "ArrowDown");
    await settle();
    expect(document.activeElement).toBe(cell(4));
  });

  it("restores the original seed for Turbo snapshots and reconnects without stale indexes", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(response(4, 4, "later"));
    await start();
    cell(1).focus();
    key(cell(1), "End", { ctrlKey: true });
    key(cell(4), "ArrowDown");
    await settle();
    expect(target("grid").dataset.pvcDataGridLoadedCount).toBe("8");
    document.dispatchEvent(new Event("turbo:before-cache"));
    expect(target("grid").dataset.pvcDataGridLoadedCount).toBe("4");
    expect(target("viewport").querySelectorAll('[role="row"]').length).toBe(4);
    expect(target("scrollContainer").scrollTop).toBe(0);
    controller.connect();
    await settle();
    expect(target("grid").getAttribute("aria-rowcount")).toBe("-1");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("uses generic completion text for numbered-page loading", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(response(4, 4));
    await start();
    controller.disconnect();
    const grid = target("grid");
    grid.dataset.pvcDataGridPaginationMode = "offset";
    grid.dataset.pvcDataGridTotalCount = "8";
    document
      .querySelector("[data-controller]")
      .insertAdjacentHTML(
        "beforeend",
        '<p data-pathogen--data-grid-target="virtualStatus" data-loaded-text="Rows ready"></p>',
      );
    controller.connect();
    await settle();
    expect(fetch).toHaveBeenCalled();
    expect(target("paginationStatus").textContent).toBe("Rows ready");
  });

  it("tears down a cursor grid without a scroll wrapper or spacer", async () => {
    await start({ cursor: "" });
    controller.disconnect();
    target("scrollContainer").removeAttribute("data-pathogen--data-grid-target");
    target("viewport").querySelector(".pvc-data-grid__spacer").remove();
    controller.connect();
    controller.disconnect();
    expect(target("grid").getAttribute("aria-rowcount")).toBe("5");
  });
});
