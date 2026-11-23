import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ANNOUNCE_DEBOUNCE_MS,
  LiveRegionAnnouncer,
} from "../../../app/assets/javascripts/pathogen_view_components/toaster_controller/live_region_announcer";

const nextFrame = () => vi.advanceTimersByTimeAsync(20);

describe("LiveRegionAnnouncer", () => {
  let host;
  let polite;
  let assertive;

  const buildAnnouncer = (overrides = {}) =>
    new LiveRegionAnnouncer({
      hostElement: host,
      politeTarget: () => polite,
      assertiveTarget: () => assertive,
      ...overrides,
    });

  beforeEach(() => {
    vi.useFakeTimers();
    host = document.createElement("div");
    polite = document.createElement("div");
    assertive = document.createElement("div");
    host.append(polite, assertive);
    document.body.appendChild(host);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  const flush = async () => {
    await vi.advanceTimersByTimeAsync(ANNOUNCE_DEBOUNCE_MS);
    await nextFrame();
  };

  it("ignores empty or non-string messages", async () => {
    const announcer = buildAnnouncer();

    announcer.announce({ message: "   " });
    announcer.announce({ message: 42 });
    await flush();

    expect(polite.textContent).toBe("");
    expect(assertive.textContent).toBe("");
  });

  it("writes polite messages to the polite region after debounce", async () => {
    const announcer = buildAnnouncer();

    announcer.announce({ message: "Saved" });
    await flush();

    expect(polite.textContent).toBe("Saved");
    expect(assertive.textContent).toBe("");
  });

  it("routes assertive messages to the assertive region", async () => {
    const announcer = buildAnnouncer();

    announcer.announce({ message: "Error", politeness: "assertive" });
    await flush();

    expect(assertive.textContent).toBe("Error");
  });

  it("joins queued messages, adding periods only where needed", async () => {
    const announcer = buildAnnouncer();

    announcer.announce({ message: "Saved" });
    announcer.announce({ message: "Done!" });
    announcer.announce({ message: "Ready" });
    await flush();

    expect(polite.textContent).toBe("Saved. Done! Ready");
  });

  it("re-writes identical text through a clear-and-restore cycle", async () => {
    const announcer = buildAnnouncer();

    announcer.announce({ message: "Saved" });
    await flush();
    expect(polite.textContent).toBe("Saved");

    announcer.announce({ message: "Saved" });
    await flush();
    // The clear-and-restore cycle schedules a nested frame to repaint the text.
    await nextFrame();

    expect(polite.textContent).toBe("Saved");
  });

  it("skips restoring identical text when the region detaches mid-cycle", async () => {
    const announcer = buildAnnouncer();

    announcer.announce({ message: "Saved" });
    await flush();

    announcer.announce({ message: "Saved" });
    await vi.advanceTimersByTimeAsync(ANNOUNCE_DEBOUNCE_MS);
    await nextFrame();
    polite.remove();
    await nextFrame();

    expect(polite.textContent).toBe("");
  });

  it("does nothing when a region target is unavailable", async () => {
    const announcer = buildAnnouncer({ politeTarget: () => null });

    announcer.announce({ message: "Saved" });
    await flush();

    expect(assertive.textContent).toBe("");
  });

  it("skips flushing when the host has detached before the debounce fires", async () => {
    const announcer = buildAnnouncer();

    announcer.announce({ message: "Saved" });
    host.remove();
    await flush();

    expect(polite.textContent).toBe("");
  });

  it("skips flushing when the host detaches before the animation frame", async () => {
    const announcer = buildAnnouncer();

    announcer.announce({ message: "Saved" });
    await vi.advanceTimersByTimeAsync(ANNOUNCE_DEBOUNCE_MS);
    host.remove();
    await nextFrame();

    expect(polite.textContent).toBe("");
  });

  it("clears a pending debounce timeout on disconnect", async () => {
    const announcer = buildAnnouncer();

    announcer.announce({ message: "Saved" });
    announcer.disconnect();
    await flush();

    expect(polite.textContent).toBe("");
  });

  it("cancels a scheduled animation frame on disconnect", async () => {
    const announcer = buildAnnouncer();

    announcer.announce({ message: "Saved" });
    await vi.advanceTimersByTimeAsync(ANNOUNCE_DEBOUNCE_MS);
    announcer.disconnect();
    await nextFrame();

    expect(polite.textContent).toBe("");
  });

  it("honours a custom debounce interval", async () => {
    const announcer = buildAnnouncer({ debounceMs: 200 });

    announcer.announce({ message: "Saved" });
    await vi.advanceTimersByTimeAsync(ANNOUNCE_DEBOUNCE_MS);
    await nextFrame();
    expect(polite.textContent).toBe("");

    await vi.advanceTimersByTimeAsync(200);
    await nextFrame();
    expect(polite.textContent).toBe("Saved");
  });
});
