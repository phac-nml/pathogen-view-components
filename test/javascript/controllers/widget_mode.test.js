import { describe, expect, it, vi } from "vitest";

import {
  focusInteractiveElement,
  handleInteractiveKeydown,
  interactiveElements,
  hasInteractiveElements,
  resolveInteractiveTarget,
  activateInteractiveElement,
  handleTab,
  handleWidgetArrow,
} from "pathogen_view_components/data_grid_controller/widget_mode";

function renderCell(content) {
  document.body.innerHTML = `
    <div role="gridcell" tabindex="0" data-pathogen--data-grid-has-interactive="true">${content}</div>
  `;
  return document.querySelector('[role="gridcell"]');
}

function dispatchKey(cell, target, key, options = {}, callbacks = {}) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...options });
  cell.addEventListener("keydown", (keyEvent) => handleInteractiveKeydown(keyEvent, cell, callbacks), { once: true });
  target.dispatchEvent(event);
  return event;
}

describe("data_grid_controller/widget_mode", () => {
  it("checks available widgets once when entering widget mode", () => {
    const cell = renderCell('<button tabindex="-1">Open</button><button tabindex="-1">Edit</button>');
    const query = vi.spyOn(cell, "querySelectorAll");

    expect(focusInteractiveElement(cell, null)).toBe(true);
    expect(document.activeElement.textContent).toBe("Open");
    expect(query).toHaveBeenCalledTimes(1);
  });

  it.each(["Tab", "ArrowRight"])("checks available widgets once during %s traversal", (key) => {
    const cell = renderCell('<button tabindex="-1">Open</button><button tabindex="-1">Edit</button>');
    const first = cell.querySelector("button");
    focusInteractiveElement(cell, first);
    const query = vi.spyOn(cell, "querySelectorAll");

    const event = dispatchKey(cell, first, key);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement.textContent).toBe("Edit");
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("rechecks changed disabled and hidden states on the next interaction", () => {
    const cell = renderCell(`
      <button id="first" tabindex="-1">Open</button>
      <button id="second" disabled tabindex="-1">Edit</button>
      <button id="third" hidden tabindex="-1">Save</button>
    `);
    const first = cell.querySelector("#first");
    const second = cell.querySelector("#second");
    const third = cell.querySelector("#third");
    focusInteractiveElement(cell, first);

    second.disabled = false;
    expect(dispatchKey(cell, first, "Tab").defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(second);

    focusInteractiveElement(cell, first);
    second.style.display = "none";
    third.hidden = false;
    expect(dispatchKey(cell, first, "Tab").defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(third);
  });

  it.each([
    ["disabled button", "<button disabled>Unavailable</button>"],
    ["disabled fieldset", "<fieldset disabled><button>Unavailable</button></fieldset>"],
    ["hidden input", '<input type="hidden" value="secret">'],
    ["anchor without href", '<a tabindex="-1">Placeholder</a>'],
    ["hidden ancestor", "<div hidden><button>Unavailable</button></div>"],
    ["inert ancestor", "<div inert><button>Unavailable</button></div>"],
    ["display none", '<button style="display: none">Unavailable</button>'],
    ["display none ancestor", '<div style="display: none"><button>Unavailable</button></div>'],
    ["hidden visibility", '<div style="visibility: hidden"><button>Unavailable</button></div>'],
    ["collapsed visibility", '<button style="visibility: collapse">Unavailable</button>'],
    ["hidden content", '<div style="content-visibility: hidden"><button>Unavailable</button></div>'],
    ["closed details", "<details><summary>More</summary><button>Unavailable</button></details>"],
  ])("does not enter widget mode for a %s", (_description, html) => {
    const cell = renderCell(html);
    const onVisible = vi.fn();
    cell.focus();

    expect(interactiveElements(cell)).toEqual([]);
    expect(focusInteractiveElement(cell, null, onVisible)).toBe(false);
    expect(document.activeElement).toBe(cell);
    expect(cell.tabIndex).toBe(0);
    expect(onVisible).not.toHaveBeenCalled();
  });

  it("preserves aria-disabled widgets and native legend exceptions", () => {
    const cell = renderCell(`
      <fieldset disabled>
        <legend><button id="legend" tabindex="-1">Legend action</button></legend>
        <button>Unavailable</button>
      </fieldset>
      <a id="link" href="/details" aria-disabled="true" tabindex="-1">Details</a>
      <button id="button" aria-disabled="true" tabindex="-1">Unavailable action</button>
    `);

    expect(interactiveElements(cell).map((element) => element.id)).toEqual(["legend", "link", "button"]);
    expect(focusInteractiveElement(cell, cell.querySelector("#button"))).toBe(true);
    expect(document.activeElement.id).toBe("button");
  });

  it("allows a visible descendant to override inherited hidden visibility", () => {
    const cell = renderCell('<div style="visibility: hidden"><button style="visibility: visible">Open</button></div>');

    expect(focusInteractiveElement(cell, null)).toBe(true);
    expect(document.activeElement).toBe(cell.querySelector("button"));
  });

  it("keeps focusable controls in a closed details summary available", () => {
    const cell = renderCell("<details><summary><button>Summary action</button></summary><input></details>");

    expect(interactiveElements(cell)).toEqual([cell.querySelector("button")]);
  });

  it("ignores clicks on unavailable widgets when resolving the interactive target", () => {
    const cell = renderCell('<button disabled><span>Unavailable</span></button><a href="/open"><span>Open</span></a>');

    expect(resolveInteractiveTarget(cell.querySelector("button span"), cell)).toBeNull();
    expect(resolveInteractiveTarget(cell.querySelector("a span"), cell)).toBe(cell.querySelector("a"));
  });

  it("does not change the roving tabindex when native focus fails", () => {
    const cell = renderCell('<button tabindex="-1">Open</button>');
    const button = cell.querySelector("button");
    const onVisible = vi.fn();
    cell.focus();
    vi.spyOn(button, "focus").mockImplementation(() => {});

    expect(focusInteractiveElement(cell, button, onVisible)).toBe(false);
    expect(document.activeElement).toBe(cell);
    expect(cell.tabIndex).toBe(0);
    expect(button.tabIndex).toBe(-1);
    expect(onVisible).not.toHaveBeenCalled();
  });

  it.each(["Tab", "ArrowRight"])("skips unavailable widgets when moving with %s", (key) => {
    const cell = renderCell(`
      <a href="/open" tabindex="-1">Open</a>
      <button disabled tabindex="-1">Disabled</button>
      <button hidden tabindex="-1">Hidden</button>
      <button id="next" tabindex="-1">Edit</button>
    `);
    const link = cell.querySelector("a");
    focusInteractiveElement(cell, link);

    const event = dispatchKey(cell, link, key);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement.id).toBe("next");
    expect(link.tabIndex).toBe(-1);
    expect(document.activeElement.tabIndex).toBe(0);
  });

  it.each(["Tab", "ArrowLeft"])("skips unavailable widgets when moving backward with %s", (key) => {
    const cell = renderCell(`
      <a href="/open" tabindex="-1">Open</a>
      <button disabled tabindex="-1">Disabled</button>
      <button id="last" tabindex="-1">Edit</button>
    `);
    const last = cell.querySelector("#last");
    focusInteractiveElement(cell, last);

    const event = dispatchKey(cell, last, key, { shiftKey: key === "Tab" });

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(cell.querySelector("a"));
  });

  it.each(["Tab", "ArrowRight"])("does not consume %s when the destination refuses focus", (key) => {
    const cell = renderCell('<a href="/open" tabindex="-1">Open</a><button tabindex="-1">Edit</button>');
    const link = cell.querySelector("a");
    const button = cell.querySelector("button");
    focusInteractiveElement(cell, link);
    vi.spyOn(button, "focus").mockImplementation(() => {});

    const event = dispatchKey(cell, link, key);

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(link);
    expect(link.tabIndex).toBe(0);
    expect(button.tabIndex).toBe(-1);
  });

  it.each(["radio", "text", "range"])("leaves native arrow handling available for %s inputs", (type) => {
    const cell = renderCell(`<input type="${type}" tabindex="-1"><button tabindex="-1">Apply</button>`);
    const input = cell.querySelector("input");
    focusInteractiveElement(cell, input);
    const query = vi.spyOn(cell, "querySelectorAll");

    const event = dispatchKey(cell, input, "ArrowRight");

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(input);
    expect(query).not.toHaveBeenCalled();
  });

  it("only consumes Escape after focus returns to the cell", () => {
    const cell = renderCell('<button tabindex="-1">Edit</button>');
    const button = cell.querySelector("button");
    focusInteractiveElement(cell, button);

    const failed = dispatchKey(cell, button, "Escape", {}, { exitWidgetMode: () => {} });
    expect(failed.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(button);

    const succeeded = dispatchKey(cell, button, "Escape", {}, { exitWidgetMode: (target) => target.focus() });
    expect(succeeded.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(cell);
  });
});

describe("data_grid_controller/widget_mode direct branch coverage", () => {
  const makeEvent = (overrides = {}) => ({
    key: "Tab",
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    target: null,
    preventDefault: vi.fn(),
    ...overrides,
  });

  it("resolves no interactive target for invalid arguments", () => {
    const cell = renderCell("<button>Open</button>");

    expect(resolveInteractiveTarget(null, cell)).toBeNull();
    expect(resolveInteractiveTarget(cell.querySelector("button"), null)).toBeNull();
  });

  it("ignores activation requests for elements outside the checked widget set", () => {
    const cell = renderCell('<button tabindex="0">One</button>');

    activateInteractiveElement(cell, document.createElement("button"));

    expect(cell.tabIndex).toBe(0);
  });

  it("ignores unknown keys in widget mode", () => {
    const cell = renderCell('<button tabindex="0">Edit</button>');
    const event = makeEvent({ key: "a", target: cell.querySelector("button") });

    handleInteractiveKeydown(event, cell, {});

    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  describe("handleTab", () => {
    it("ignores cells not marked as interactive", () => {
      const cell = renderCell('<button tabindex="-1">Edit</button>');
      cell.setAttribute("data-pathogen--data-grid-has-interactive", "false");
      const event = makeEvent({ target: cell.querySelector("button") });

      handleTab(event, cell, {});

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("ignores events without an interactive target element", () => {
      const cell = renderCell('<button tabindex="-1">Edit</button>');
      const event = makeEvent({ target: null });

      handleTab(event, cell, {});

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("ignores focus that lives outside the active cell", () => {
      const cell = renderCell('<button tabindex="-1">Edit</button>');
      const outside = document.createElement("button");
      document.body.append(outside);
      const event = makeEvent({ target: outside });

      handleTab(event, cell, {});

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("ignores focus on an element that is no longer an available widget", () => {
      const cell = renderCell('<button disabled tabindex="-1">One</button><button tabindex="-1">Two</button>');
      const event = makeEvent({ target: cell.querySelector("button") });

      handleTab(event, cell, {});

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("moves to the previous cell when Shift+Tab leaves the first widget", () => {
      const cell = renderCell('<button tabindex="0">One</button><button tabindex="-1">Two</button>');
      const first = cell.querySelector("button");
      focusInteractiveElement(cell, first);
      const moveToInteractiveCell = vi.fn(() => true);
      const event = makeEvent({ target: first, shiftKey: true });

      handleTab(event, cell, { moveToInteractiveCell });

      expect(moveToInteractiveCell).toHaveBeenCalledWith(cell, -1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("does not consume Shift+Tab when the previous widget refuses focus", () => {
      const cell = renderCell('<button tabindex="-1">One</button><button tabindex="0">Two</button>');
      const [first, second] = cell.querySelectorAll("button");
      focusInteractiveElement(cell, second);
      vi.spyOn(first, "focus").mockImplementation(() => {});
      const event = makeEvent({ target: second, shiftKey: true });

      handleTab(event, cell, {});

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("does not consume Shift+Tab at the first widget when no previous cell accepts focus", () => {
      const cell = renderCell('<button tabindex="0">One</button><button tabindex="-1">Two</button>');
      const first = cell.querySelector("button");
      focusInteractiveElement(cell, first);
      const event = makeEvent({ target: first, shiftKey: true });

      handleTab(event, cell, { moveToInteractiveCell: () => false });

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("ignores Shift+Tab at the first widget when no cell handler is provided", () => {
      const cell = renderCell('<button tabindex="0">One</button><button tabindex="-1">Two</button>');
      const first = cell.querySelector("button");
      focusInteractiveElement(cell, first);
      const event = makeEvent({ target: first, shiftKey: true });

      handleTab(event, cell, {});

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("handleWidgetArrow", () => {
    it("ignores arrow keys pressed with a modifier", () => {
      const cell = renderCell('<button tabindex="0">A</button><button tabindex="-1">B</button>');
      const event = makeEvent({ key: "ArrowRight", altKey: true, target: cell.querySelector("button") });

      handleWidgetArrow(event, cell);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("ignores cells not marked as interactive", () => {
      const cell = renderCell('<button tabindex="0">A</button><button tabindex="-1">B</button>');
      cell.setAttribute("data-pathogen--data-grid-has-interactive", "false");
      const event = makeEvent({ key: "ArrowRight", target: cell.querySelector("button") });

      handleWidgetArrow(event, cell);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("does nothing when the cell holds a single widget", () => {
      const cell = renderCell('<button tabindex="0">Only</button>');
      const event = makeEvent({ key: "ArrowRight", target: cell.querySelector("button") });

      handleWidgetArrow(event, cell);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("ignores arrow events without an interactive target element", () => {
      const cell = renderCell('<button tabindex="0">A</button><button tabindex="-1">B</button>');
      const event = makeEvent({ key: "ArrowRight", target: null });

      handleWidgetArrow(event, cell);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("ignores focus on an element that is no longer an available widget", () => {
      const cell = renderCell(
        '<button disabled>X</button><button tabindex="0">A</button><button tabindex="-1">B</button>',
      );
      const event = makeEvent({ key: "ArrowRight", target: cell.querySelector("button") });

      handleWidgetArrow(event, cell);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it.each([
      ["textarea", '<textarea tabindex="0"></textarea><button tabindex="-1">A</button>'],
      ["select", '<select tabindex="0"><option>x</option></select><button tabindex="-1">A</button>'],
    ])("leaves arrow handling to a %s widget", (selector, html) => {
      const cell = renderCell(html);
      const focused = cell.querySelector(selector);
      const event = makeEvent({ key: "ArrowRight", target: focused });

      handleWidgetArrow(event, cell);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("leaves arrow handling to a content-editable widget", () => {
      const cell = renderCell('<button tabindex="0">A</button><button tabindex="-1">B</button>');
      const focused = cell.querySelector("button");
      Object.defineProperty(focused, "isContentEditable", { configurable: true, value: true });
      const event = makeEvent({ key: "ArrowRight", target: focused });

      handleWidgetArrow(event, cell);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("treats a typeless input as a text field that consumes arrow keys", () => {
      const cell = renderCell('<input tabindex="0"><button tabindex="-1">A</button>');
      const event = makeEvent({ key: "ArrowRight", target: cell.querySelector("input") });

      handleWidgetArrow(event, cell);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});

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

describe("widget-mode selection and navigation boundaries", () => {
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

  it("does nothing when focus is on the cell (activeIndex < 0)", () => {
    const cell = buildCell("<button>a</button>");
    const event = keydown("Tab", cell);
    handleTab(event, cell, { moveToInteractiveCell: vi.fn() });
    expect(event.defaultPrevented).toBe(false);
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

  it("ignores arrows when focus is not on an interactive element", () => {
    const cell = buildCell("<button>a</button><button>b</button>");
    const event = keydown("ArrowRight", cell);
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

  it("moves focus from controls that do not consume arrows", () => {
    const cell = buildCell('<input type="checkbox"><button>b</button>');
    const [checkbox, button] = interactiveElements(cell);
    const event = keydown("ArrowRight", checkbox);
    handleWidgetArrow(event, cell);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button);
  });
});
