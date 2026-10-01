import { describe, expect, it } from "vitest";
import {
  acquireScrollLock,
  releaseScrollLock,
} from "../../app/assets/javascripts/pathogen_view_components/scroll_lock";

describe("shared modal scroll lock", () => {
  it("preserves all original styles until the last owner releases in either order", () => {
    for (const reversed of [false, true]) {
      const first = {};
      const second = {};
      const root = document.documentElement;
      root.style.overflow = "clip";
      root.style.scrollbarGutter = "stable both-edges";
      document.body.style.overflow = "auto";
      acquireScrollLock(first);
      acquireScrollLock(first);
      acquireScrollLock(second);
      releaseScrollLock({});
      releaseScrollLock(reversed ? second : first);
      expect(root.style.overflow).toBe("hidden");
      expect(document.body.style.overflow).toBe("hidden");
      releaseScrollLock(reversed ? first : second);
      expect(root.style.overflow).toBe("clip");
      expect(root.style.scrollbarGutter).toBe("stable both-edges");
      expect(document.body.style.overflow).toBe("auto");
      releaseScrollLock(first);
      releaseScrollLock(second);
      root.style.overflow = "";
      root.style.scrollbarGutter = "";
      document.body.style.overflow = "";
    }
  });
});
