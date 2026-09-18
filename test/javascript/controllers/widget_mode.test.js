import { afterEach, describe, expect, it, vi } from "vitest";

import {
  activateInteractiveElement,
  focusInteractiveElement,
  handleInteractiveKeydown,
  handleTab,
  handleWidgetArrow,
  hasInteractiveElements,
  interactiveElements,
  resolveInteractiveTarget,
} from "pathogen_view_components/data_grid_controller/widget_mode";

const buildCell = (html, { interactive = true } = {}) => {
  const cell = document.createElement("td");
  cell.innerHTML = html;
  if (interactive) cell.setAttribute("data-pathogen--data-grid-has-interactive", "true");
  document.body.appendChild(cell);
  return cell;
};

const keydown = (key, target, extra = {}) => {
  const event = new KeyboardEvent("keydown", { key, cancelable: true, ...extra });
  Object.defineProperty(event, "target", { value: target, configurable: true });
  return event;
};

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("interactiveElements / hasInteractiveElements", () => {
  it("collects interactive descendants in document order", () => {
    const cell = buildCell('<button>a</button><a href="#">b</a><span>x</span>');
    expect(interactiveElements(cell).map((el) => el.tagName)).toEqual(["BUTTON", "A"]);
  });

  it("reads the interactive flag", () => {
    const cell = buildCell("", { interactive: false });
    expect(hasInteractiveElements(cell)).toBe(false);
    cell.setAttribute("data-pathogen--data-grid-has-interactive", "true");
    expect(hasInteractiveElements(cell)).toBe(true);
  });
});

describe("resolveInteractiveTarget", () => {
  it("returns null for non-element targets or a missing cell", () => {
    const cell = buildCell("<button>b</button>");
    const button = cell.querySelector("button");
    expect(resolveInteractiveTarget(null, cell)).toBeNull();
    expect(resolveInteractiveTarget(button, null)).toBeNull();
  });

  it("returns null when the target is not inside an interactive element", () => {
    const cell = buildCell("<span>x</span>");
    expect(resolveInteractiveTarget(cell.querySelector("span"), cell)).toBeNull();
  });

  it("returns the interactive element only when it lives in the cell", () => {
    const cell = buildCell("<button>in</button>");
    const inside = cell.querySelector("button");
    const other = buildCell("<button>out</button>").querySelector("button");
    expect(resolveInteractiveTarget(inside, cell)).toBe(inside);
    expect(resolveInteractiveTarget(other, cell)).toBeNull();
  });
});

describe("activateInteractiveElement", () => {
  it("moves the roving tabindex onto the target element", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const [a, b] = interactiveElements(cell);
    activateInteractiveElement(cell, b);
    expect(cell.tabIndex).toBe(-1);
    expect(a.tabIndex).toBe(-1);
    expect(b.tabIndex).toBe(0);
  });

  it("no-ops without elements or without a target element", () => {
    const empty = buildCell("", { interactive: false });
    const cell = buildCell("<button>a</button>");
    expect(() => activateInteractiveElement(empty, null)).not.toThrow();
    expect(() => activateInteractiveElement(cell, null)).not.toThrow();
  });
});

describe("focusInteractiveElement", () => {
  it("focuses the specified element and calls onVisible", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const [, b] = interactiveElements(cell);
    const onVisible = vi.fn();
    focusInteractiveElement(cell, b, onVisible);
    expect(document.activeElement).toBe(b);
    expect(onVisible).toHaveBeenCalledWith(cell);
  });

  it("falls back to the first element for missing or foreign targets", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const [a] = interactiveElements(cell);
    const foreign = document.createElement("button");
    focusInteractiveElement(cell, foreign, undefined);
    expect(document.activeElement).toBe(a);
    focusInteractiveElement(cell, null, undefined);
    expect(document.activeElement).toBe(a);
  });

  it("no-ops for an empty cell", () => {
    const empty = buildCell("", { interactive: false });
    expect(() => focusInteractiveElement(empty, null)).not.toThrow();
  });
});

describe("handleInteractiveKeydown", () => {
  it("exits widget mode on Escape", () => {
    const cell = buildCell("<button>a</button>");
    const exitWidgetMode = vi.fn();
    const event = keydown("Escape", cell);
    handleInteractiveKeydown(event, cell, { exitWidgetMode, moveToInteractiveCell: vi.fn() });
    expect(event.defaultPrevented).toBe(true);
    expect(exitWidgetMode).toHaveBeenCalledWith(cell);
  });

  it("routes Tab through handleTab", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const [a, b] = interactiveElements(cell);
    const event = keydown("Tab", a);
    handleInteractiveKeydown(event, cell, { exitWidgetMode: vi.fn(), moveToInteractiveCell: vi.fn() });
    expect(document.activeElement).toBe(b);
  });

  it("routes arrow keys through handleWidgetArrow in both directions", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const [a, b] = interactiveElements(cell);
    handleInteractiveKeydown(keydown("ArrowRight", a), cell, {
      exitWidgetMode: vi.fn(),
      moveToInteractiveCell: vi.fn(),
    });
    expect(document.activeElement).toBe(b);
    handleInteractiveKeydown(keydown("ArrowLeft", b), cell, {
      exitWidgetMode: vi.fn(),
      moveToInteractiveCell: vi.fn(),
    });
    expect(document.activeElement).toBe(a);
  });

  it("ignores unrelated keys", () => {
    const cell = buildCell("<button>a</button>");
    expect(() =>
      handleInteractiveKeydown(keydown("x", cell), cell, {
        exitWidgetMode: vi.fn(),
        moveToInteractiveCell: vi.fn(),
      }),
    ).not.toThrow();
  });
});

describe("handleTab", () => {
  it("does nothing when the cell has no interactive elements", () => {
    const cell = buildCell("<button>a</button>", { interactive: false });
    const event = keydown("Tab", cell.querySelector("button"));
    handleTab(event, cell, { moveToInteractiveCell: vi.fn() });
    expect(event.defaultPrevented).toBe(false);
  });

  it("does nothing when focus is on the cell (activeIndex < 0)", () => {
    const cell = buildCell("<button>a</button>");
    const event = keydown("Tab", cell);
    handleTab(event, cell, { moveToInteractiveCell: vi.fn() });
    expect(event.defaultPrevented).toBe(false);
  });

  it("does nothing when the event has no element target", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const event = new KeyboardEvent("keydown", { key: "Tab", cancelable: true });
    handleTab(event, cell, { moveToInteractiveCell: vi.fn() });
    expect(event.defaultPrevented).toBe(false);
  });

  it("moves to the previous element on Shift+Tab", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const [a, b] = interactiveElements(cell);
    const event = keydown("Tab", b, { shiftKey: true });
    handleTab(event, cell, { moveToInteractiveCell: vi.fn() });
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(a);
  });

  it("delegates past the first element on Shift+Tab when a move is accepted", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const [a] = interactiveElements(cell);
    const event = keydown("Tab", a, { shiftKey: true });
    handleTab(event, cell, { moveToInteractiveCell: () => true });
    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves Shift+Tab uncaught past the first element when no move is accepted", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const [a] = interactiveElements(cell);
    const event = keydown("Tab", a, { shiftKey: true });
    handleTab(event, cell, {});
    expect(event.defaultPrevented).toBe(false);
  });

  it("moves to the next element on Tab", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const [a, b] = interactiveElements(cell);
    const event = keydown("Tab", a);
    handleTab(event, cell, { moveToInteractiveCell: vi.fn() });
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(b);
  });

  it("delegates past the last element on Tab when a move is accepted", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const [, b] = interactiveElements(cell);
    const event = keydown("Tab", b);
    handleTab(event, cell, { moveToInteractiveCell: () => true });
    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves Tab uncaught past the last element when no move is accepted", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const [, b] = interactiveElements(cell);
    const event = keydown("Tab", b);
    handleTab(event, cell, {});
    expect(event.defaultPrevented).toBe(false);
  });
});

describe("handleWidgetArrow", () => {
  it("ignores modified arrow presses", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const [a] = interactiveElements(cell);
    const event = keydown("ArrowRight", a, { ctrlKey: true });
    handleWidgetArrow(event, cell);
    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores cells without interactive elements", () => {
    const cell = buildCell("<button>a</button><button>b</button>", { interactive: false });
    const [a] = interactiveElements(cell);
    const event = keydown("ArrowRight", a);
    handleWidgetArrow(event, cell);
    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores cells with fewer than two interactive elements", () => {
    const cell = buildCell("<button>a</button>");
    const [a] = interactiveElements(cell);
    const event = keydown("ArrowRight", a);
    handleWidgetArrow(event, cell);
    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores arrows when focus is not on an interactive element", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const event = keydown("ArrowRight", cell);
    handleWidgetArrow(event, cell);
    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores arrows when the event has no element target", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const event = new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true });
    handleWidgetArrow(event, cell);
    expect(event.defaultPrevented).toBe(false);
  });

  it("moves focus forward and backward between widgets", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const [a, b] = interactiveElements(cell);
    const forward = keydown("ArrowDown", a);
    handleWidgetArrow(forward, cell);
    expect(forward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(b);

    const backward = keydown("ArrowUp", b);
    handleWidgetArrow(backward, cell);
    expect(backward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(a);
  });

  it("stops at the range boundaries", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const [a, b] = interactiveElements(cell);
    const beforeStart = keydown("ArrowLeft", a);
    handleWidgetArrow(beforeStart, cell);
    expect(beforeStart.defaultPrevented).toBe(false);

    const afterEnd = keydown("ArrowRight", b);
    handleWidgetArrow(afterEnd, cell);
    expect(afterEnd.defaultPrevented).toBe(false);
  });

  it("leaves arrows to inputs, textareas, and selects that consume them", () => {
    const cases = [
      '<input type="text"><button>b</button>',
      "<textarea></textarea><button>b</button>",
      "<select></select><button>b</button>",
    ];
    cases.forEach((html) => {
      const cell = buildCell(html);
      const [first] = interactiveElements(cell);
      const event = keydown("ArrowRight", first);
      handleWidgetArrow(event, cell);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  it("moves focus from controls that do not consume arrows", () => {
    const cell = buildCell('<input type="checkbox"><button>b</button>');
    const [checkbox, button] = interactiveElements(cell);
    const event = keydown("ArrowRight", checkbox);
    handleWidgetArrow(event, cell);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button);
  });

  it("defaults inputs without a type to text and consumes arrows", () => {
    const cell = buildCell("<input><button>b</button>");
    const [input] = interactiveElements(cell);
    const event = keydown("ArrowRight", input);
    handleWidgetArrow(event, cell);
    expect(event.defaultPrevented).toBe(false);
  });

  it("treats contenteditable widgets as arrow consumers", () => {
    const cell = buildCell('<a href="#">a</a><button>b</button>');
    const [link] = interactiveElements(cell);
    Object.defineProperty(link, "isContentEditable", { value: true, configurable: true });
    const event = keydown("ArrowRight", link);
    handleWidgetArrow(event, cell);
    expect(event.defaultPrevented).toBe(false);
  });
});
