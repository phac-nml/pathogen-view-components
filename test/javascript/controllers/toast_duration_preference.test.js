import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DURATION_STORAGE_KEY,
  QUEUED_DURATION_PREFERENCE_ATTRIBUTE,
  parseDurationPreference,
  readDurationPreferenceFromStorage,
  resolveDurationPreference,
  writeDurationPreference,
} from "../../../app/assets/javascripts/pathogen_view_components/toast_duration_preference";

afterEach(() => {
  vi.restoreAllMocks();
  writeDurationPreference("");
  writeDurationPreference("", "custom.key");
  window.localStorage?.clear();
});

describe("toast_duration_preference", () => {
  it("exposes the shared storage key and queued-preference attribute", () => {
    expect(DURATION_STORAGE_KEY).toBe("pathogen.toast.durationMs");
    expect(QUEUED_DURATION_PREFERENCE_ATTRIBUTE).toBe("data-pathogen--toast-duration-preference-value");
  });

  describe("parseDurationPreference", () => {
    it("treats blank-ish values as no preference", () => {
      expect(parseDurationPreference(null)).toBeNull();
      expect(parseDurationPreference(undefined)).toBeNull();
      expect(parseDurationPreference("")).toBeNull();
    });

    it("maps the forever sentinel to zero", () => {
      expect(parseDurationPreference("forever")).toBe(0);
    });

    it("rejects non-finite and negative values", () => {
      expect(parseDurationPreference("not-a-number")).toBeNull();
      expect(parseDurationPreference("-5")).toBeNull();
      expect(parseDurationPreference(Infinity)).toBeNull();
    });

    it("truncates valid numeric values", () => {
      expect(parseDurationPreference("20000")).toBe(20000);
      expect(parseDurationPreference("1500.9")).toBe(1500);
      expect(parseDurationPreference(0)).toBe(0);
    });
  });

  describe("readDurationPreferenceFromStorage", () => {
    it("parses the value stored under the default key", () => {
      window.localStorage.setItem(DURATION_STORAGE_KEY, "12000");
      expect(readDurationPreferenceFromStorage()).toBe(12000);
    });

    it("reads from a custom key", () => {
      window.localStorage.setItem("custom.key", "forever");
      expect(readDurationPreferenceFromStorage("custom.key")).toBe(0);
    });

    it("returns null when storage access throws", () => {
      const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("storage blocked");
      });

      expect(readDurationPreferenceFromStorage()).toBeNull();
      expect(getItem).toHaveBeenCalled();
    });
  });

  describe("writeDurationPreference", () => {
    it("retains the preference in memory when browser storage is unavailable", () => {
      vi.spyOn(window, "localStorage", "get").mockReturnValue(undefined);
      writeDurationPreference("forever");
      expect(resolveDurationPreference()).toBe(0);
    });

    it("can reset a stale stored preference when removal fails", () => {
      window.localStorage.setItem(DURATION_STORAGE_KEY, "forever");
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("storage blocked");
      });
      writeDurationPreference("");
      expect(resolveDurationPreference()).toBeNull();
    });

    it("isolates failed writes by key and returns to storage after recovery", () => {
      const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("storage blocked");
      });
      writeDurationPreference("forever", "custom.key");
      expect(resolveDurationPreference()).toBeNull();
      expect(resolveDurationPreference({ storageKey: "custom.key" })).toBe(0);
      setItem.mockRestore();

      writeDurationPreference("20000", "custom.key");
      expect(window.localStorage.getItem("custom.key")).toBe("20000");
      window.localStorage.setItem("custom.key", "30000");
      expect(resolveDurationPreference({ storageKey: "custom.key" })).toBe(30000);
    });
  });

  describe("resolveDurationPreference", () => {
    it("returns the parsed explicit preference when provided", () => {
      window.localStorage.setItem(DURATION_STORAGE_KEY, "9000");
      expect(resolveDurationPreference({ explicitPreference: "3000" })).toBe(3000);
    });

    it("falls back to storage when the explicit preference is absent", () => {
      window.localStorage.setItem(DURATION_STORAGE_KEY, "9000");
      expect(resolveDurationPreference({ explicitPreference: null })).toBe(9000);
    });

    it("returns null when neither an explicit nor stored preference exists", () => {
      expect(resolveDurationPreference()).toBeNull();
    });
  });
});
