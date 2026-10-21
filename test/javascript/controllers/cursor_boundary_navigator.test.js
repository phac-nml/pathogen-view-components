import { afterEach, describe, expect, it, vi } from "vitest";
import { navigateCursorBoundary } from "pathogen_view_components/data_grid_controller/cursor_boundary_navigator";

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function buildCell({ row = 4, column = 0 } = {}) {
  const cell = document.createElement("div");
  cell.setAttribute("data-pathogen--data-grid-row-index", String(row));
  cell.setAttribute("data-pathogen--data-grid-column-index", String(column));
  return cell;
}

describe("navigateCursorBoundary", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("returns false for non-forward keys", () => {
    const event = { key: "ArrowUp", preventDefault: vi.fn() };
    const result = navigateCursorBoundary({
      event,
      activeCell: buildCell(),
      viewport: { hasMore: true, totalRows: 4, loadNext: vi.fn() },
      pageSize: 4,
      boundaryIntent: () => null,
      setBoundaryIntent: vi.fn(),
      hasPaginationError: () => false,
      focusCell: vi.fn(),
      cellByCoordinate: vi.fn(),
    });

    expect(result).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("returns false when the requested target stays inside loaded rows", () => {
    const event = { key: "ArrowDown", preventDefault: vi.fn() };
    const result = navigateCursorBoundary({
      event,
      activeCell: buildCell({ row: 2 }),
      viewport: { hasMore: true, totalRows: 4, loadNext: vi.fn() },
      pageSize: 4,
      boundaryIntent: () => null,
      setBoundaryIntent: vi.fn(),
      hasPaginationError: () => false,
      focusCell: vi.fn(),
      cellByCoordinate: vi.fn(),
    });

    expect(result).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("loads the next batch and focuses the resolved cell", async () => {
    const active = document.createElement("button");
    document.body.append(active);
    active.focus();

    const event = { key: "ArrowDown", preventDefault: vi.fn() };
    const focusedCell = document.createElement("div");
    const focusCell = vi.fn();
    const viewport = {
      hasMore: true,
      totalRows: 4,
      loadNext: vi.fn().mockImplementation(async () => {
        viewport.totalRows = 8;
      }),
      ensureVisible: vi.fn(),
    };

    let currentIntent = null;

    const result = navigateCursorBoundary({
      event,
      activeCell: buildCell({ row: 4, column: 2 }),
      viewport,
      pageSize: 4,
      boundaryIntent: () => currentIntent,
      setBoundaryIntent: (intent) => {
        currentIntent = intent;
      },
      hasPaginationError: () => false,
      focusCell,
      cellByCoordinate: vi.fn().mockReturnValue(focusedCell),
    });

    expect(result).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);

    await settle();

    expect(viewport.ensureVisible).toHaveBeenCalledWith(4, 2);
    expect(focusCell).toHaveBeenCalledWith(focusedCell);
    expect(currentIntent).toBe(null);
  });

  it("skips focus restoration when pagination is still in error", async () => {
    const event = { key: "PageDown", preventDefault: vi.fn() };
    const focusCell = vi.fn();
    const viewport = {
      hasMore: true,
      totalRows: 4,
      loadNext: vi.fn().mockResolvedValue(undefined),
      ensureVisible: vi.fn(),
    };
    let currentIntent = null;

    navigateCursorBoundary({
      event,
      activeCell: buildCell({ row: 4, column: 1 }),
      viewport,
      pageSize: 4,
      boundaryIntent: () => currentIntent,
      setBoundaryIntent: (intent) => {
        currentIntent = intent;
      },
      hasPaginationError: () => true,
      focusCell,
      cellByCoordinate: vi.fn().mockReturnValue(document.createElement("div")),
    });

    await settle();

    expect(viewport.ensureVisible).not.toHaveBeenCalled();
    expect(focusCell).not.toHaveBeenCalled();
    expect(currentIntent).not.toBe(null);
  });
});
