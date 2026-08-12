import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SidebarController from "../../../app/assets/javascripts/pathogen_view_components/sidebar_controller";

const waitForController = () => new Promise((resolve) => setTimeout(resolve, 0));

const setupMatchMedia = ({ matches }) => {
  let listeners = [];

  const media = {
    matches,
    addEventListener: (_event, callback) => {
      listeners.push(callback);
    },
    removeEventListener: (_event, callback) => {
      listeners = listeners.filter((listener) => listener !== callback);
    },
    addListener: (callback) => {
      listeners.push(callback);
    },
    removeListener: (callback) => {
      listeners = listeners.filter((listener) => listener !== callback);
    },
    setMatches(nextMatches) {
      this.matches = nextMatches;
      listeners.forEach((listener) => listener({ matches: nextMatches }));
    },
  };

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media),
  );
  return media;
};

const appendSidebar = ({ open = true } = {}) => {
  const provider = document.createElement("div");
  provider.className = "pathogen-sidebar-provider";
  provider.setAttribute("data-controller", "pathogen--sidebar");
  provider.setAttribute("data-pathogen--sidebar-open-value", String(open));
  provider.setAttribute("data-pathogen--sidebar-breakpoint-value", "(min-width: 80rem)");
  provider.setAttribute("data-pathogen--sidebar-storage-key-value", "pathogen.sidebar.sidebar.open");
  provider.setAttribute("data-pathogen--sidebar-collapse-label-value", "Collapse sidebar");
  provider.setAttribute("data-pathogen--sidebar-expand-label-value", "Expand sidebar");
  provider.setAttribute("data-pathogen--sidebar-open-label-value", "Open sidebar");
  provider.setAttribute("data-pathogen--sidebar-close-label-value", "Close sidebar");
  provider.setAttribute("data-pathogen--sidebar-announce-expanded-value", "Sidebar expanded.");
  provider.setAttribute("data-pathogen--sidebar-announce-rail-value", "Sidebar collapsed to icons.");
  provider.setAttribute("data-pathogen--sidebar-announce-opened-value", "Sidebar opened.");
  provider.setAttribute("data-pathogen--sidebar-announce-closed-value", "Sidebar closed.");

  const overlay = document.createElement("button");
  overlay.type = "button";
  overlay.className = "pathogen-sidebar-overlay hidden";
  overlay.setAttribute("data-action", "click->pathogen--sidebar#closeOffcanvas");
  overlay.setAttribute("data-pathogen--sidebar-target", "overlay");

  const liveRegion = document.createElement("span");
  liveRegion.className = "sr-only";
  liveRegion.setAttribute("data-pathogen--sidebar-target", "liveRegion");

  const nav = document.createElement("nav");
  nav.id = "specimen-sidebar";
  nav.tabIndex = -1;
  nav.setAttribute("data-pathogen--sidebar-target", "sidebar");
  nav.innerHTML = `
    <button type="button">first</button>
    <a href="#">second</a>
  `;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.setAttribute("data-pathogen--sidebar-target", "trigger");
  trigger.setAttribute("data-action", "click->pathogen--sidebar#toggle");

  const inset = document.createElement("div");

  provider.append(overlay, liveRegion, nav, trigger, inset);
  document.body.append(provider);

  return { provider, overlay, liveRegion, nav, trigger };
};

describe("sidebar_controller", () => {
  let application;

  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (callback) => callback());
    document.documentElement.removeAttribute("data-pathogen-sidebar-open");
    window.localStorage.clear();
    application = Application.start();
    application.register("pathogen--sidebar", SidebarController);
  });

  afterEach(async () => {
    application?.stop();
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    await waitForController();
  });

  it("uses expanded mode by default on desktop", async () => {
    setupMatchMedia({ matches: true });
    const { provider, trigger } = appendSidebar({ open: true });
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("expanded");
    expect(provider.dataset.pathogenSidebarOpen).toBe("true");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-label")).toBe("Collapse sidebar");
  });

  it("restores desktop rail preference from localStorage", async () => {
    setupMatchMedia({ matches: true });
    window.localStorage.setItem("pathogen.sidebar.sidebar.open", "false");

    const { provider, trigger } = appendSidebar({ open: true });
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("rail");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.documentElement.getAttribute("data-pathogen-sidebar-open")).toBe("false");
  });

  it("toggles desktop mode, persists preference, and announces change", async () => {
    setupMatchMedia({ matches: true });
    const { provider, trigger, liveRegion } = appendSidebar({ open: true });
    await waitForController();

    trigger.click();
    await waitForController();
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("rail");
    expect(window.localStorage.getItem("pathogen.sidebar.sidebar.open")).toBe("false");
    expect(liveRegion.textContent).toBe("Sidebar collapsed to icons.");
  });

  it("opens and closes off-canvas mode without persisting mobile state", async () => {
    setupMatchMedia({ matches: false });
    const { provider, overlay, trigger, nav } = appendSidebar({ open: true });
    await waitForController();

    trigger.focus();
    trigger.click();
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("offcanvas");
    expect(provider.dataset.pathogenSidebarOpen).toBe("true");
    expect(overlay.classList.contains("hidden")).toBe(false);
    expect(nav.hasAttribute("inert")).toBe(false);

    const escape = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(escape);
    await waitForController();

    expect(provider.dataset.pathogenSidebarOpen).toBe("false");
    expect(overlay.classList.contains("hidden")).toBe(true);
    expect(nav.hasAttribute("inert")).toBe(true);
    expect(document.activeElement).toBe(trigger);
    expect(window.localStorage.getItem("pathogen.sidebar.sidebar.open")).toBeNull();
  });

  it("cycles focus within sidebar while off-canvas is open", async () => {
    setupMatchMedia({ matches: false });
    const { trigger, nav } = appendSidebar({ open: true });
    await waitForController();

    trigger.click();
    await waitForController();

    const focusables = nav.querySelectorAll("button, a");
    focusables[1].focus();

    const tabForward = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
    document.dispatchEvent(tabForward);

    expect(document.activeElement).toBe(focusables[0]);

    const tabBackward = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
    });
    document.dispatchEvent(tabBackward);

    expect(document.activeElement).toBe(focusables[1]);
  });

  it("re-derives mode without announcing on breakpoint changes", async () => {
    const media = setupMatchMedia({ matches: true });
    const { provider, liveRegion } = appendSidebar({ open: true });
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("expanded");
    media.setMatches(false);
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("offcanvas");
    expect(liveRegion.textContent).toBe("");
  });
});
