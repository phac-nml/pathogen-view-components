import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ensureCellFullyVisible, ensureCellInViewport } from "pathogen_view_components/data_grid_controller/scroll";

describe("ensureCellInViewport", () => {
  let scrollBySpy;

  beforeEach(() => {
    scrollBySpy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
  });

  afterEach(() => {
    scrollBySpy.mockRestore();
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
    scrollBySpy.mockRestore();
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
});
