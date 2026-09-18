import { describe, expect, it } from "vitest";

import {
  connectedItemForTarget,
  initialTabStopItem,
  nextIndex,
  previousIndex,
  setInitialTabStop,
  setTabStopForItems,
} from "pathogen_view_components/toolbar_controller/roving_focus";

const button = (configure = () => {}) => {
  const element = document.createElement("button");
  element.type = "button";
  configure(element);
  document.body.appendChild(element);
  return element;
};

describe("toolbar_controller/roving_focus", () => {
  it("advances and wraps indices", () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(0);
    expect(previousIndex(0, 3)).toBe(2);
    expect(previousIndex(2, 3)).toBe(1);
  });

  it("sets the active item as the only tab stop", () => {
    const items = [button(), button(), button()];

    setTabStopForItems(items, items[1]);

    expect(items.map((item) => item.tabIndex)).toEqual([-1, 0, -1]);
  });

  it("chooses the first enabled item for the initial tab stop", () => {
    const disabled = button((el) => el.setAttribute("aria-disabled", "true"));
    const enabled = button();

    expect(initialTabStopItem([disabled, enabled])).toBe(enabled);
  });

  it("falls back to the first item when every candidate is aria-disabled", () => {
    const first = button((el) => el.setAttribute("aria-disabled", "true"));
    const second = button((el) => el.setAttribute("aria-disabled", "true"));

    expect(initialTabStopItem([first, second])).toBe(first);
  });

  it("assigns the initial tab stop across the item set", () => {
    const first = button();
    const second = button();

    setInitialTabStop([first, second]);

    expect(first.tabIndex).toBe(0);
    expect(second.tabIndex).toBe(-1);
  });

  it("does nothing when there are no visible items", () => {
    const hidden = button((el) => (el.hidden = true));
    hidden.tabIndex = 5;

    setInitialTabStop([hidden]);

    expect(hidden.tabIndex).toBe(5);
  });

  it("finds the connected item that owns a target", () => {
    const item = button();
    const child = document.createElement("span");
    item.appendChild(child);

    expect(connectedItemForTarget([item], item)).toBe(item);
    expect(connectedItemForTarget([item], child)).toBe(item);
  });

  it("returns null when the target is not a node", () => {
    const item = button();

    expect(connectedItemForTarget([item], "not-a-node")).toBeNull();
    expect(connectedItemForTarget([item], null)).toBeNull();
  });

  it("returns null when no item owns the target", () => {
    const item = button();
    const outside = button();

    expect(connectedItemForTarget([item], outside)).toBeNull();
  });
});
