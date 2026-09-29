import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ensureCellFullyVisible,
  ensureCellInViewport,
  headerOverlayHeight,
  horizontalStickyEnabled,
  stickyOverlayWidth,
} from "pathogen_view_components/data_grid_controller/scroll";

describe("horizontalStickyEnabled", () => {
  it("defaults to sticky unless the scroll container's computed CSS disables it", () => {
    const scrollContainer = document.createElement("div");
    document.body.appendChild(scrollContainer);

    expect(horizontalStickyEnabled(null)).toBe(true);
    expect(horizontalStickyEnabled(scrollContainer)).toBe(true);
    scrollContainer.style.setProperty("--pvc-data-grid-horizontal-sticky", " 0 ");
    expect(horizontalStickyEnabled(scrollContainer)).toBe(false);
    scrollContainer.style.setProperty("--pvc-data-grid-horizontal-sticky", "1");
    expect(horizontalStickyEnabled(scrollContainer)).toBe(true);
  });
});

describe("stickyOverlayWidth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("returns 0 without a grid target or matching cells", () => {
    expect(stickyOverlayWidth({ left: 0 }, null)).toBe(0);
    expect(stickyOverlayWidth({ left: 0 }, document.createElement("div"))).toBe(0);
  });

  it("measures the widest sticky cell relative to the container", () => {
    const grid = document.createElement("div");
    const sticky = document.createElement("div");
    sticky.setAttribute("data-sticky-cell", "");
    sticky.setAttribute("data-pathogen--data-grid-row-index", "1");
    grid.appendChild(sticky);
    document.body.appendChild(grid);
    vi.spyOn(sticky, "getBoundingClientRect").mockReturnValue({ right: 120 });

    expect(stickyOverlayWidth({ left: 20 }, grid)).toBe(100);
  });
});

describe("headerOverlayHeight", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("returns 0 without a grid target or matching cells", () => {
    expect(headerOverlayHeight({ top: 0 }, null)).toBe(0);
    expect(headerOverlayHeight({ top: 0 }, document.createElement("div"))).toBe(0);
  });

  it("measures the tallest header cell relative to the container", () => {
    const grid = document.createElement("div");
    const header = document.createElement("div");
    header.setAttribute("role", "columnheader");
    grid.appendChild(header);
    document.body.appendChild(grid);
    vi.spyOn(header, "getBoundingClientRect").mockReturnValue({ bottom: 60 });

    expect(headerOverlayHeight({ top: 10 }, grid)).toBe(50);
  });
});

describe("ensureCellInViewport", () => {
  let scrollBySpy;

  beforeEach(() => {
    scrollBySpy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("does nothing when cell is fully within the viewport", () => {
    const cell = document.createElement("td");
    document.body.appendChild(cell);
    vi.spyOn(cell, "getBoundingClientRect").mockReturnValue({
      top: 100,
      bottom: 140,
      left: 50,
      right: 200,
    });
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);

    ensureCellInViewport(cell);

    expect(scrollBySpy).not.toHaveBeenCalled();
  });

  it("scrolls up when cell is above the viewport", () => {
    const cell = document.createElement("td");
    document.body.appendChild(cell);
    vi.spyOn(cell, "getBoundingClientRect").mockReturnValue({
      top: -30,
      bottom: 10,
      left: 50,
      right: 200,
    });
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);

    ensureCellInViewport(cell);

    expect(scrollBySpy).toHaveBeenCalledWith({ left: 0, top: -30, behavior: "auto" });
  });

  it("scrolls down when cell is below the viewport", () => {
    const cell = document.createElement("td");
    document.body.appendChild(cell);
    vi.spyOn(cell, "getBoundingClientRect").mockReturnValue({
      top: 780,
      bottom: 820,
      left: 50,
      right: 200,
    });
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);

    ensureCellInViewport(cell);

    expect(scrollBySpy).toHaveBeenCalledWith({ left: 0, top: 20, behavior: "auto" });
  });
});

describe("ensureCellFullyVisible", () => {
  let scrollBySpy;

  beforeEach(() => {
    scrollBySpy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("ignores horizontal pinned overlap when CSS unpins columns but still clears the header", () => {
    const scrollContainer = document.createElement("div");
    scrollContainer.style.setProperty("--pvc-data-grid-horizontal-sticky", "0");
    const grid = document.createElement("div");
    const header = document.createElement("div");
    header.setAttribute("role", "columnheader");
    const cell = document.createElement("div");
    grid.append(header, cell);
    scrollContainer.appendChild(grid);
    document.body.appendChild(scrollContainer);
    vi.spyOn(scrollContainer, "getBoundingClientRect").mockReturnValue({ top: 0, bottom: 200, left: 0, right: 320 });
    vi.spyOn(header, "getBoundingClientRect").mockReturnValue({ bottom: 40 });
    vi.spyOn(cell, "getBoundingClientRect").mockReturnValue({ top: 20, bottom: 60, left: 30, right: 110 });

    ensureCellFullyVisible(cell, scrollContainer, grid, { pinnedWidth: 180 });

    expect(scrollContainer.scrollLeft).toBe(0);
    expect(scrollContainer.scrollTop).toBe(-20);
  });

  it("calls ensureCellInViewport after container scroll adjustment", () => {
    const scrollContainer = document.createElement("div");
    Object.defineProperties(scrollContainer, {
      scrollTop: { value: 0, writable: true },
      scrollLeft: { value: 0, writable: true },
    });

    const cell = document.createElement("td");
    document.body.appendChild(scrollContainer);
    scrollContainer.appendChild(cell);

    vi.spyOn(scrollContainer, "getBoundingClientRect").mockReturnValue({
      top: 0,
      bottom: 600,
      left: 0,
      right: 800,
    });
    // Cell is within the container but below the browser viewport
    vi.spyOn(cell, "getBoundingClientRect").mockReturnValue({
      top: 100,
      bottom: 140,
      left: 50,
      right: 200,
    });
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);

    ensureCellFullyVisible(cell, scrollContainer, null);

    // Cell is within viewport, so no page scroll needed
    expect(scrollBySpy).not.toHaveBeenCalled();
  });

  it("scrolls viewport when cell is visible in container but not in browser viewport", () => {
    const scrollContainer = document.createElement("div");
    Object.defineProperties(scrollContainer, {
      scrollTop: { value: 0, writable: true },
      scrollLeft: { value: 0, writable: true },
    });

    const cell = document.createElement("td");
    document.body.appendChild(scrollContainer);
    scrollContainer.appendChild(cell);

    vi.spyOn(scrollContainer, "getBoundingClientRect").mockReturnValue({
      top: 500,
      bottom: 1500,
      left: 0,
      right: 800,
    });
    // Cell is within the container but bottom is below the browser viewport
    vi.spyOn(cell, "getBoundingClientRect").mockReturnValue({
      top: 780,
      bottom: 820,
      left: 50,
      right: 200,
    });
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);

    ensureCellFullyVisible(cell, scrollContainer, null);

    expect(scrollBySpy).toHaveBeenCalledWith({ left: 0, top: 20, behavior: "auto" });
  });

  it("falls back to scrollIntoView when no scroll container is provided", () => {
    const cell = document.createElement("td");
    document.body.appendChild(cell);
    cell.scrollIntoView = vi.fn();

    ensureCellFullyVisible(cell, null, null);

    expect(cell.scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
    expect(scrollBySpy).not.toHaveBeenCalled();
  });

  it("ignores non-element cells", () => {
    expect(() => ensureCellFullyVisible(null, document.createElement("div"), null)).not.toThrow();
    expect(scrollBySpy).not.toHaveBeenCalled();
  });

  it("keeps sticky cells flush to the left edge using an explicit pinned width", () => {
    const scrollContainer = document.createElement("div");
    Object.defineProperties(scrollContainer, {
      scrollTop: { value: 0, writable: true },
      scrollLeft: { value: 0, writable: true },
    });
    const cell = document.createElement("td");
    cell.setAttribute("data-sticky-cell", "");
    document.body.appendChild(scrollContainer);
    scrollContainer.appendChild(cell);

    vi.spyOn(scrollContainer, "getBoundingClientRect").mockReturnValue({ top: 0, bottom: 600, left: 0, right: 800 });
    vi.spyOn(cell, "getBoundingClientRect").mockReturnValue({ top: 100, bottom: 140, left: 50, right: 200 });
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);

    ensureCellFullyVisible(cell, scrollContainer, null, { pinnedWidth: 30 });

    expect(scrollContainer.scrollLeft).toBe(0);
  });

  it("keeps class-based sticky header cells flush to the top and left edges", () => {
    const scrollContainer = document.createElement("div");
    Object.defineProperties(scrollContainer, {
      scrollTop: { value: 0, writable: true },
      scrollLeft: { value: 0, writable: true },
    });
    const cell = document.createElement("td");
    cell.classList.add("pvc-data-grid__cell--sticky", "pvc-data-grid__cell--header");
    document.body.appendChild(scrollContainer);
    scrollContainer.appendChild(cell);

    vi.spyOn(scrollContainer, "getBoundingClientRect").mockReturnValue({ top: 0, bottom: 600, left: 0, right: 800 });
    vi.spyOn(cell, "getBoundingClientRect").mockReturnValue({ top: 100, bottom: 140, left: 50, right: 200 });
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);

    ensureCellFullyVisible(cell, scrollContainer, null, { pinnedWidth: 30 });

    expect(scrollContainer.scrollTop).toBe(0);
    expect(scrollContainer.scrollLeft).toBe(0);
  });
});
