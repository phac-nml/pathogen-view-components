import { describe, expect, it, vi } from "vitest";

import {
  ensureVirtualCellVisible,
  renderVirtualWindow,
} from "../../../app/assets/javascripts/pathogen_view_components/data_grid_controller/virtual_window";

function createRow(index, text = `Row ${index + 1}`) {
  const row = document.createElement("div");
  row.setAttribute("role", "row");
  row.innerHTML = `<div role="gridcell" tabindex="-1" data-pathogen--data-grid-row-index="${index + 1}" data-pathogen--data-grid-column-index="0"><button>${text}</button></div>`;
  return row;
}

function createWindow(overrides = {}) {
  const rows = Array.from({ length: 6 }, (_, index) => createRow(index));
  const viewport = document.createElement("div");
  const spacer = document.createElement("div");
  spacer.className = "pvc-data-grid__spacer";
  viewport.append(spacer, ...rows);
  document.body.append(viewport);
  const scrollContainer = { scrollTop: 0, clientHeight: 80 };
  let currentRange = { rowStart: -1, rowEnd: -1, columnStart: -1, columnEnd: -1 };
  let columnRange = { startIndex: 1, endIndex: 3 };
  const afterRender = vi.fn();
  const render = () =>
    renderVirtualWindow({
      rowSource: { totalRows: rows.length, rowAt: (index) => rows[index], afterRender },
      rowHeight: 40,
      rowOverscan: 0,
      scrollContainer,
      viewport,
      currentRange,
      setCurrentRange: (range) => {
        currentRange = range;
      },
      computeColumnRange: () => columnRange,
      applyColumnWindow: () => {},
      headerRow: () => null,
      resolveCell: (target) => target.closest('[role="gridcell"]'),
      resolveFocusCell: (rowIndex, columnIndex) =>
        viewport.querySelector(
          `[data-pathogen--data-grid-row-index="${rowIndex}"][data-pathogen--data-grid-column-index="${columnIndex}"]`,
        ),
      getPendingFocusCoordinate: () => null,
      setActiveCell: (cell) => {
        cell.tabIndex = 0;
      },
      ensureFocusableCell: () => {},
      ...overrides,
    });
  return {
    rows,
    viewport,
    spacer,
    scrollContainer,
    render,
    afterRender,
    setColumns: (range) => {
      columnRange = range;
    },
    invalidate: () => {
      currentRange = { ...currentRange, rowStart: -1 };
    },
  };
}

describe("virtual row window incremental rendering", () => {
  it("reports whether the window was applied", () => {
    const { render } = createWindow();

    expect(render()).toBe(true);
    expect(render()).toBe(false);
  });

  it("only removes and inserts the rows that cross the window boundary", () => {
    const { rows, viewport, spacer, scrollContainer, render } = createWindow();
    render();
    const observer = new MutationObserver(() => {});
    observer.observe(viewport, { childList: true, subtree: true, attributes: true });

    scrollContainer.scrollTop = 40;
    render();

    const changes = observer.takeRecords();
    expect(changes.flatMap((change) => Array.from(change.removedNodes))).toEqual([rows[0]]);
    expect(changes.flatMap((change) => Array.from(change.addedNodes))).toEqual([rows[2]]);
    expect(changes.filter((change) => change.type === "attributes" && change.target === rows[1])).toEqual([]);
    expect(Array.from(viewport.children)).toEqual([spacer, rows[1], rows[2]]);
    observer.disconnect();
  });

  it("keeps the row DOM unchanged on a horizontal-only range change", () => {
    const { viewport, render, setColumns } = createWindow();
    render();
    const observer = new MutationObserver(() => {});
    observer.observe(viewport, { childList: true, attributes: true, subtree: true });

    setColumns({ startIndex: 2, endIndex: 4 });
    render();

    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
  });

  it("preserves an offscreen focused row without disturbing the spacer or visible order", () => {
    const { rows, viewport, spacer, scrollContainer, render } = createWindow();
    render();
    const button = rows[0].querySelector("button");
    button.focus();
    const observer = new MutationObserver(() => {});
    observer.observe(viewport, { childList: true });

    scrollContainer.scrollTop = 120;
    render();

    expect(document.activeElement).toBe(button);
    expect(Array.from(viewport.children)).toEqual([spacer, rows[0], rows[3], rows[4]]);
    expect(observer.takeRecords().flatMap((change) => Array.from(change.removedNodes))).not.toContain(rows[0]);
    observer.disconnect();
  });

  it("replaces a focused placeholder with its loaded row and restores cell focus", () => {
    const { rows, viewport, spacer, render, invalidate } = createWindow();
    rows[0].setAttribute("aria-busy", "true");
    render();
    rows[0].querySelector("button").focus();
    const oldRow = rows[0];
    rows[0] = createRow(0, "Loaded");

    invalidate();
    render();

    expect(oldRow.isConnected).toBe(false);
    expect(Array.from(viewport.children)).toEqual([spacer, rows[0], rows[1]]);
    expect(document.activeElement).toBe(rows[0].firstElementChild);
  });

  it("refreshes cached cells after row and header changes before restoring focus", () => {
    let cells = [];
    const order = [];
    const header = document.createElement("div");
    const onCellsChanged = vi.fn(() => {
      cells = Array.from(viewport.querySelectorAll('[role="gridcell"]'));
      order.push("cells");
    });
    const { rows, viewport, render, invalidate } = createWindow({
      headerRow: () => header,
      applyColumnWindow: (row) => {
        if (row === header) order.push("header");
      },
      onCellsChanged,
      resolveFocusCell: (rowIndex) => {
        order.push("focus");
        return cells.find((cell) => Number(cell.getAttribute("data-pathogen--data-grid-row-index")) === rowIndex);
      },
    });
    rows[0].setAttribute("aria-busy", "true");
    render();
    rows[0].querySelector("button").focus();
    const oldCell = rows[0].firstElementChild;
    rows[0] = createRow(0, "Loaded");
    rows[1] = createRow(1, "Loading");
    rows[1].setAttribute("aria-busy", "true");
    order.length = 0;

    invalidate();
    render();

    expect(order).toEqual(["header", "cells", "focus"]);
    expect(cells).toEqual([rows[0].firstElementChild, rows[1].firstElementChild]);
    expect(cells).not.toContain(oldCell);
    expect(document.activeElement).toBe(rows[0].firstElementChild);
    expect(onCellsChanged).toHaveBeenCalledTimes(2);
    expect(render()).toBe(false);
    expect(onCellsChanged).toHaveBeenCalledTimes(2);
  });

  it("inserts earlier rows before a retained focused row without moving that row", () => {
    const { rows, viewport, spacer, scrollContainer, render } = createWindow();
    scrollContainer.scrollTop = 120;
    render();
    const button = rows[4].querySelector("button");
    button.focus();
    const observer = new MutationObserver(() => {});
    observer.observe(viewport, { childList: true });

    scrollContainer.scrollTop = 0;
    render();

    expect(document.activeElement).toBe(button);
    expect(Array.from(viewport.children)).toEqual([spacer, rows[0], rows[1], rows[4]]);
    expect(observer.takeRecords().flatMap((change) => Array.from(change.removedNodes))).not.toContain(rows[4]);
    observer.disconnect();
  });

  it("returns false when there is no row source", () => {
    expect(renderVirtualWindow({ rowSource: null })).toBe(false);
  });

  it("falls back to the window height when no scroll container is present", () => {
    const { render } = createWindow({ scrollContainer: null });

    expect(render()).toBe(true);
  });

  it("treats a null column range as unchanged after the first render", () => {
    const { render } = createWindow({ computeColumnRange: () => null });

    expect(render()).toBe(true);
    expect(render()).toBe(false);
  });

  it("skips row indexes whose source returns no row", () => {
    const { render } = createWindow({
      rowSource: {
        totalRows: 2,
        rowAt: (index) => (index === 0 ? null : createRow(index)),
        afterRender: vi.fn(),
      },
    });

    expect(render()).toBe(true);
  });

  it("inserts rendered rows from the top when the viewport has no spacer", () => {
    const viewport = document.createElement("div");
    document.body.append(viewport);
    const { render } = createWindow({ viewport });

    expect(render()).toBe(true);
    expect(viewport.querySelector('[role="row"]')).not.toBeNull();
  });

  it("does not restore focus when the focused cell cannot be mapped to a rendered cell", () => {
    const ensureFocusableCell = vi.fn();
    const { rows, render, invalidate } = createWindow({ resolveFocusCell: () => null, ensureFocusableCell });
    render();
    rows[0].querySelector("button").focus();

    invalidate();
    render();

    expect(ensureFocusableCell).toHaveBeenCalled();
  });
});

describe("ensureVirtualCellVisible", () => {
  const baseArgs = (overrides = {}) => ({
    rowIndex: 2,
    columnIndex: null,
    rowHeight: 40,
    scrollContainer: { scrollTop: 0, scrollLeft: 0, clientHeight: 80, clientWidth: 120 },
    visibleRange: { startIndex: 0, endIndex: 5 },
    pinnedCount: 1,
    columnWidths: [120],
    columnOffsets: [0],
    pinnedWidth: 120,
    isColumnRendered: () => true,
    prefetchRow: vi.fn(),
    cancelScheduledRender: vi.fn(),
    renderNow: vi.fn(),
    reportError: vi.fn(),
    ...overrides,
  });

  it("prefetches the requested row", () => {
    const prefetchRow = vi.fn();

    ensureVirtualCellVisible(baseArgs({ prefetchRow }));

    expect(prefetchRow).toHaveBeenCalledWith(2);
  });

  it("does nothing further when there is no scroll container", () => {
    const renderNow = vi.fn();

    ensureVirtualCellVisible(baseArgs({ scrollContainer: null, renderNow }));

    expect(renderNow).not.toHaveBeenCalled();
  });

  it("reports errors raised while rendering the target cell into view", () => {
    const reportError = vi.fn();

    ensureVirtualCellVisible(
      baseArgs({
        rowIndex: -1,
        columnIndex: null,
        isColumnRendered: () => false,
        renderNow: () => {
          throw new Error("render fail");
        },
        reportError,
      }),
    );

    expect(reportError).toHaveBeenCalledWith(expect.any(Error));
  });
});
