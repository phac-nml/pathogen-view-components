import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ensureVirtualCellVisible,
  renderVirtualWindow,
} from "pathogen_view_components/data_grid_controller/virtual_window";

const makeRow = (globalIndex) => {
  const row = document.createElement("div");
  row.setAttribute("role", "row");
  row.dataset.pvcDataGridGlobalRowIndex = String(globalIndex);
  return row;
};

const makeContainer = ({ clientHeight = 800, clientWidth = 800 } = {}) => {
  const el = document.createElement("div");
  Object.defineProperties(el, {
    scrollTop: { value: 0, writable: true },
    scrollLeft: { value: 0, writable: true },
    clientHeight: { value: clientHeight, configurable: true },
    clientWidth: { value: clientWidth, configurable: true },
  });
  return el;
};

const renderArgs = (overrides = {}) => ({
  rowSource: { totalRows: 3, rowAt: (index) => (index === 1 ? null : makeRow(index)) },
  rowHeight: 40,
  rowOverscan: 2,
  scrollContainer: null,
  viewport: document.createElement("div"),
  currentRange: { rowStart: -1, rowEnd: -1, columnStart: -1, columnEnd: -1 },
  setCurrentRange: vi.fn(),
  computeColumnRange: () => null,
  applyColumnWindow: vi.fn(),
  headerRow: () => makeRow(-1),
  resolveCell: () => null,
  resolveFocusCell: () => null,
  getPendingFocusCoordinate: () => null,
  setActiveCell: vi.fn(),
  ensureFocusableCell: vi.fn(),
  ...overrides,
});

describe("renderVirtualWindow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("returns early without a row source", () => {
    const setCurrentRange = vi.fn();
    renderVirtualWindow(renderArgs({ rowSource: null, setCurrentRange }));
    expect(setCurrentRange).not.toHaveBeenCalled();
  });

  it("renders rows without a scroll container or spacer and skips missing rows", () => {
    const viewport = document.createElement("div");
    const ensureFocusableCell = vi.fn();
    renderVirtualWindow(renderArgs({ viewport, ensureFocusableCell }));

    // Rows 0 and 2 render; row 1 (rowAt -> null) is skipped.
    expect(viewport.querySelectorAll('[role="row"]')).toHaveLength(2);
    expect(ensureFocusableCell).toHaveBeenCalledTimes(1);
  });
});

describe("ensureVirtualCellVisible", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns early when there is no scroll container", () => {
    const prefetchRow = vi.fn();
    const renderNow = vi.fn();
    ensureVirtualCellVisible({
      rowIndex: 3,
      columnIndex: null,
      rowHeight: 40,
      scrollContainer: null,
      visibleRange: { startIndex: 0, endIndex: 0 },
      pinnedCount: 0,
      columnWidths: [],
      columnOffsets: [],
      pinnedWidth: 0,
      isColumnRendered: () => true,
      prefetchRow,
      cancelScheduledRender: vi.fn(),
      renderNow,
      reportError: vi.fn(),
    });

    expect(prefetchRow).toHaveBeenCalledWith(3);
    expect(renderNow).not.toHaveBeenCalled();
  });

  it("reports errors thrown while rendering after a scroll change", () => {
    const reportError = vi.fn();
    ensureVirtualCellVisible({
      rowIndex: 0,
      columnIndex: null,
      rowHeight: 40,
      scrollContainer: makeContainer({ clientHeight: 800 }),
      visibleRange: { startIndex: 5, endIndex: 5 },
      pinnedCount: 0,
      columnWidths: [],
      columnOffsets: [],
      pinnedWidth: 0,
      isColumnRendered: () => true,
      prefetchRow: vi.fn(),
      cancelScheduledRender: vi.fn(),
      renderNow: () => {
        throw new Error("render failed");
      },
      reportError,
    });

    expect(reportError).toHaveBeenCalledTimes(1);
  });

  it("scrolls the container to reveal an off-screen row", () => {
    const container = makeContainer({ clientHeight: 80 });
    const renderNow = vi.fn();
    ensureVirtualCellVisible({
      rowIndex: 100,
      columnIndex: null,
      rowHeight: 40,
      scrollContainer: container,
      visibleRange: { startIndex: 0, endIndex: 0 },
      pinnedCount: 0,
      columnWidths: [],
      columnOffsets: [],
      pinnedWidth: 0,
      isColumnRendered: () => true,
      prefetchRow: vi.fn(),
      cancelScheduledRender: vi.fn(),
      renderNow,
      reportError: vi.fn(),
    });

    expect(container.scrollTop).toBeGreaterThan(0);
    expect(renderNow).toHaveBeenCalledTimes(1);
  });
});
