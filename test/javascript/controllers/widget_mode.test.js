import { describe, expect, it, vi } from "vitest";

import {
  focusInteractiveElement,
  handleInteractiveKeydown,
  interactiveElements,
  resolveInteractiveTarget,
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
