import { describe, expect, it } from "vitest";

import {
  isAriaDisabled,
  isNativeDisabled,
  isNavigableItem,
  isVisibleItem,
  visibleItems,
} from "pathogen_view_components/toolbar_controller/visibility";

const button = (configure = () => {}) => {
  const element = document.createElement("button");
  element.type = "button";
  configure(element);
  document.body.appendChild(element);
  return element;
};

describe("toolbar_controller/visibility", () => {
  it("reads the aria-disabled state", () => {
    expect(isAriaDisabled(button((el) => el.setAttribute("aria-disabled", "true")))).toBe(true);
    expect(isAriaDisabled(button())).toBe(false);
  });

  it("reads the native disabled state", () => {
    expect(isNativeDisabled(button((el) => (el.disabled = true)))).toBe(true);
    expect(isNativeDisabled(button())).toBe(false);
  });

  it("returns false for values that are not HTML elements", () => {
    expect(isVisibleItem(null)).toBe(false);
    expect(isVisibleItem(undefined)).toBe(false);
    expect(isVisibleItem({})).toBe(false);
  });

  it("treats hidden, inert, and aria-hidden ancestors as not visible", () => {
    expect(isVisibleItem(button((el) => (el.hidden = true)))).toBe(false);
    expect(isVisibleItem(button((el) => el.setAttribute("inert", "")))).toBe(false);
    expect(isVisibleItem(button((el) => el.setAttribute("aria-hidden", "true")))).toBe(false);
    expect(isVisibleItem(button((el) => (el.style.display = "none")))).toBe(false);
    expect(isVisibleItem(button())).toBe(true);
  });

  it("combines visibility and native disabled state for navigability", () => {
    expect(isNavigableItem(button())).toBe(true);
    expect(isNavigableItem(button((el) => (el.disabled = true)))).toBe(false);
    expect(isNavigableItem(button((el) => (el.hidden = true)))).toBe(false);
  });

  it("filters a list down to navigable items", () => {
    const visible = button();
    const disabled = button((el) => (el.disabled = true));
    const hidden = button((el) => (el.hidden = true));

    expect(visibleItems([visible, disabled, hidden])).toEqual([visible]);
  });
});
