import { describe, expect, it } from "vitest";

import { joinAsSentences } from "pathogen_view_components/announcement_text";

describe("joinAsSentences", () => {
  it("returns an empty string for no parts", () => {
    expect(joinAsSentences([])).toBe("");
  });

  it("leaves a single part untouched", () => {
    expect(joinAsSentences(["Saved"])).toBe("Saved");
  });

  it("adds a period after a non-final fragment that lacks sentence punctuation", () => {
    expect(joinAsSentences(["Saved", "Undo available"])).toBe("Saved. Undo available");
  });

  it("does not double punctuation when a non-final fragment already ends a sentence", () => {
    expect(joinAsSentences(["Saved!", "Undo available"])).toBe("Saved! Undo available");
    expect(joinAsSentences(["Done.", "Next", "Last"])).toBe("Done. Next. Last");
  });
});
