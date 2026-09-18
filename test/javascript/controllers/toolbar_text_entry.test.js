import { describe, expect, it } from "vitest";

import { MOVE_BACKWARD, MOVE_FORWARD } from "pathogen_view_components/toolbar_controller/constants";
import {
  ownsToolbarNavigationKeys,
  placeTextEntryCaret,
  textEntryControl,
} from "pathogen_view_components/toolbar_controller/text_entry";

describe("toolbar_controller/text_entry", () => {
  describe("textEntryControl", () => {
    it("returns the element itself when it is an input or textarea", () => {
      const input = document.createElement("input");
      const textarea = document.createElement("textarea");

      expect(textEntryControl(input)).toBe(input);
      expect(textEntryControl(textarea)).toBe(textarea);
    });

    it("returns null when the value is not an element", () => {
      expect(textEntryControl(null)).toBeNull();
      expect(textEntryControl({})).toBeNull();
    });

    it("returns a nested input when present", () => {
      const wrapper = document.createElement("div");
      const input = document.createElement("input");
      wrapper.appendChild(input);

      expect(textEntryControl(wrapper)).toBe(input);
    });

    it("returns null when a wrapper has no text-entry control", () => {
      const wrapper = document.createElement("div");
      wrapper.appendChild(document.createElement("span"));

      expect(textEntryControl(wrapper)).toBeNull();
    });
  });

  describe("placeTextEntryCaret", () => {
    it("moves the caret to the end when arrowing forward", () => {
      const input = document.createElement("input");
      input.value = "hello";
      document.body.appendChild(input);

      placeTextEntryCaret(input, MOVE_FORWARD);

      expect(input.selectionStart).toBe(5);
      expect(input.selectionEnd).toBe(5);
    });

    it("moves the caret to the start when arrowing backward", () => {
      const input = document.createElement("input");
      input.value = "hello";
      document.body.appendChild(input);
      input.setSelectionRange(5, 5);

      placeTextEntryCaret(input, MOVE_BACKWARD);

      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(0);
    });

    it("ignores items without a text-entry control", () => {
      const wrapper = document.createElement("div");

      expect(() => placeTextEntryCaret(wrapper, MOVE_FORWARD)).not.toThrow();
    });
  });

  describe("ownsToolbarNavigationKeys", () => {
    it("returns true for text-entry controls", () => {
      const input = document.createElement("input");

      expect(ownsToolbarNavigationKeys(input)).toBe(true);
    });

    it("returns false for buttons", () => {
      const button = document.createElement("button");

      expect(ownsToolbarNavigationKeys(button)).toBe(false);
    });

    it("returns false when the target is not an element", () => {
      expect(ownsToolbarNavigationKeys(null)).toBe(false);
      expect(ownsToolbarNavigationKeys(document)).toBe(false);
    });
  });
});
