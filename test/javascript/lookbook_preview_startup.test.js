import { describe, expect, it, vi } from "vitest";

const startupEvents = vi.hoisted(() => []);

vi.mock("application", () => {
  startupEvents.push("application");
  return {};
});

vi.mock("lookbook_mocks/tabs_lazy_load", () => ({
  enableTabsLazyLoadMocks: () => {
    startupEvents.push("mocks");
    return Promise.resolve();
  },
}));

describe("Lookbook preview startup", () => {
  it("starts the Stimulus application before awaiting preview mocks", async () => {
    await import("../../demo/app/javascript/lookbook_preview.js");

    expect(startupEvents).toEqual(["application", "mocks"]);
  });
});
