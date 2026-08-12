import { Application } from "@hotwired/stimulus";
import axe from "axe-core";
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

const appendSidebar = ({ id = "specimen-sidebar", open = true } = {}) => {
  const provider = document.createElement("div");
  provider.className = "pathogen-sidebar-provider";
  provider.setAttribute("data-controller", "pathogen--sidebar");
  provider.setAttribute("data-pathogen--sidebar-open-value", String(open));
  provider.setAttribute("data-pathogen--sidebar-breakpoint-value", "(min-width: 80rem)");
  provider.setAttribute("data-pathogen--sidebar-storage-key-value", `pathogen.sidebar.${id}.open`);
  provider.setAttribute("data-pathogen--sidebar-collapse-label-value", "Collapse sidebar");
  provider.setAttribute("data-pathogen--sidebar-expand-label-value", "Expand sidebar");
  provider.setAttribute("data-pathogen--sidebar-open-label-value", "Open sidebar");
  provider.setAttribute("data-pathogen--sidebar-close-label-value", "Close sidebar");
  const overlay = document.createElement("div");
  overlay.className = "pathogen-sidebar-overlay hidden";
  overlay.setAttribute("aria-hidden", "true");
  overlay.setAttribute("data-action", "click->pathogen--sidebar#closeOffcanvas");
  overlay.setAttribute("data-pathogen--sidebar-target", "overlay");

  const dialog = document.createElement("div");
  dialog.id = `${id}-dialog`;
  dialog.className = "pathogen-sidebar-dialog";
  dialog.tabIndex = -1;
  dialog.setAttribute("data-pathogen--sidebar-target", "dialog");

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "pathogen-sidebar-dialog__close";
  closeButton.setAttribute("aria-label", "Open sidebar");
  closeButton.setAttribute("data-action", "click->pathogen--sidebar#closeOffcanvas");
  closeButton.setAttribute("data-pathogen--sidebar-target", "close");

  const nav = document.createElement("nav");
  nav.id = id;
  nav.setAttribute("aria-label", "Primary navigation");
  nav.setAttribute("data-pathogen--sidebar-target", "sidebar");
  nav.innerHTML = `
    <button type="button">first</button>
    <a href="#">second</a>
  `;
  dialog.append(closeButton, nav);

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.setAttribute("data-pathogen--sidebar-target", "trigger");
  trigger.setAttribute("data-action", "click->pathogen--sidebar#toggle");

  const inset = document.createElement("div");
  inset.className = "pathogen-sidebar-inset";
  inset.innerHTML = '<button type="button">Background action</button>';

  provider.append(overlay, dialog, trigger, inset);
  document.body.append(provider);

  return { provider, overlay, dialog, closeButton, nav, trigger, inset };
};

describe("sidebar_controller", () => {
  let application;

  beforeEach(() => {
    document.documentElement.removeAttribute("data-pathogen-sidebar-open");
    document.documentElement.removeAttribute("data-pathogen-sidebar-viewport");
    document.body.removeAttribute("style");
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
    expect(document.documentElement.getAttribute("data-pathogen-sidebar-viewport")).toBe("desktop");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-label")).toBe("Collapse sidebar");
  });

  it("restores desktop rail preference from localStorage", async () => {
    setupMatchMedia({ matches: true });
    window.localStorage.setItem("pathogen.sidebar.specimen-sidebar.open", "false");

    const { provider, trigger } = appendSidebar({ open: true });
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("rail");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.documentElement.getAttribute("data-pathogen-sidebar-open")).toBe("false");
  });

  it("keeps the configured desktop state when localStorage is inaccessible", async () => {
    setupMatchMedia({ matches: true });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable");
    });

    const { provider } = appendSidebar({ open: false });
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("rail");
  });

  it("toggles desktop mode and persists preference without a redundant live announcement", async () => {
    setupMatchMedia({ matches: true });
    const { provider, trigger } = appendSidebar({ open: true });
    await waitForController();

    trigger.click();
    await waitForController();
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("rail");
    expect(window.localStorage.getItem("pathogen.sidebar.specimen-sidebar.open")).toBe("false");
    expect(provider.querySelector("[aria-live]")).toBeNull();
  });

  it("keeps multiple triggers synchronized to the same controlled region", async () => {
    setupMatchMedia({ matches: true });
    const { provider, dialog, trigger } = appendSidebar({ open: true });
    const secondTrigger = trigger.cloneNode(true);
    provider.append(secondTrigger);
    await waitForController();

    secondTrigger.click();
    await waitForController();

    for (const control of [trigger, secondTrigger]) {
      expect(control.getAttribute("aria-controls")).toBe(dialog.id);
      expect(control.getAttribute("aria-expanded")).toBe("false");
      expect(control.getAttribute("aria-label")).toBe("Expand sidebar");
    }
  });

  it("opens as a named modal dialog and makes content outside it inert", async () => {
    setupMatchMedia({ matches: false });
    const outside = document.createElement("button");
    outside.textContent = "Outside provider";
    document.body.prepend(outside);
    const { provider, overlay, dialog, closeButton, trigger, inset, nav } = appendSidebar({ open: true });
    await waitForController();

    expect(document.documentElement.getAttribute("data-pathogen-sidebar-viewport")).toBe("mobile");
    expect(dialog.getAttribute("aria-hidden")).toBe("true");
    expect(dialog.hasAttribute("inert")).toBe(true);

    trigger.focus();
    trigger.click();
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("offcanvas");
    expect(provider.dataset.pathogenSidebarOpen).toBe("true");
    expect(overlay.classList.contains("hidden")).toBe(false);
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("Primary navigation");
    expect(nav.getAttribute("aria-label")).toBe("Primary navigation");
    expect(inset.hasAttribute("inert")).toBe(true);
    expect(outside.hasAttribute("inert")).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.activeElement).toBe(closeButton);
    expect(trigger.getAttribute("aria-controls")).toBe(dialog.id);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("closes with Escape and restores focus to the exact invoking trigger", async () => {
    setupMatchMedia({ matches: false });
    const { overlay, dialog, trigger, inset } = appendSidebar({ open: true });
    await waitForController();

    trigger.focus();
    trigger.click();
    await waitForController();

    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
    document.dispatchEvent(escape);
    await waitForController();

    expect(overlay.classList.contains("hidden")).toBe(true);
    expect(dialog.hasAttribute("role")).toBe(false);
    expect(dialog.hasAttribute("aria-modal")).toBe(false);
    expect(dialog.getAttribute("aria-hidden")).toBe("true");
    expect(dialog.hasAttribute("inert")).toBe(true);
    expect(inset.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(trigger);
    expect(window.localStorage.getItem("pathogen.sidebar.specimen-sidebar.open")).toBeNull();
  });

  it("closes through pointer interaction on the overlay", async () => {
    setupMatchMedia({ matches: false });
    const { overlay, trigger } = appendSidebar();
    await waitForController();

    trigger.click();
    await waitForController();
    overlay.click();
    await waitForController();

    expect(document.activeElement).toBe(trigger);
  });

  it("cycles Tab and Shift+Tab within the modal dialog", async () => {
    setupMatchMedia({ matches: false });
    const { trigger, closeButton, nav } = appendSidebar({ open: true });
    await waitForController();

    trigger.click();
    await waitForController();

    const focusables = nav.querySelectorAll("button, a");
    focusables[1].focus();

    const tabForward = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
    document.dispatchEvent(tabForward);

    expect(document.activeElement).toBe(closeButton);

    const tabBackward = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
    });
    document.dispatchEvent(tabBackward);

    expect(document.activeElement).toBe(focusables[1]);
  });

  it("excludes disabled controls, hidden ancestors, and unchecked radios from the modal tab cycle", async () => {
    setupMatchMedia({ matches: false });
    const { trigger, closeButton, nav } = appendSidebar();
    nav.insertAdjacentHTML(
      "beforeend",
      `
        <button type="button" disabled>disabled</button>
        <div hidden><button type="button">hidden</button></div>
        <input type="radio" name="choice" aria-label="Choice one">
        <input type="radio" name="choice" aria-label="Choice two" checked>
      `,
    );
    await waitForController();

    trigger.click();
    await waitForController();
    const checkedRadio = nav.querySelector("input:checked");
    checkedRadio.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));

    expect(document.activeElement).toBe(closeButton);
  });

  it("cleans modal state when resizing to desktop and preserves useful focus", async () => {
    const media = setupMatchMedia({ matches: false });
    const { dialog, closeButton, nav, trigger, inset } = appendSidebar({ open: true });
    await waitForController();

    trigger.click();
    await waitForController();
    expect(document.activeElement).toBe(closeButton);

    media.setMatches(true);
    await waitForController();

    expect(dialog.hasAttribute("role")).toBe(false);
    expect(inset.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(nav.querySelector("button"));
  });

  it("moves focus to an external trigger when resizing to closed mobile mode", async () => {
    const media = setupMatchMedia({ matches: true });
    const { provider, nav, trigger, dialog } = appendSidebar({ open: true });
    await waitForController();

    nav.querySelector("a").focus();
    media.setMatches(false);
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("offcanvas");
    expect(dialog.hasAttribute("inert")).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it("cleans global modal state when the controller disconnects", async () => {
    setupMatchMedia({ matches: false });
    const outside = document.createElement("button");
    document.body.prepend(outside);
    const { provider, trigger } = appendSidebar();
    await waitForController();

    trigger.click();
    await waitForController();
    provider.remove();
    await waitForController();

    expect(outside.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("");
  });

  it("cleans modal state before Turbo caches the page without moving focus", async () => {
    setupMatchMedia({ matches: false });
    const { dialog, trigger, inset } = appendSidebar();
    await waitForController();

    trigger.click();
    await waitForController();
    document.dispatchEvent(new Event("turbo:before-cache"));
    await waitForController();

    expect(dialog.hasAttribute("role")).toBe(false);
    expect(inset.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("");
  });

  it("preserves inert and scroll-lock state that existed before opening", async () => {
    setupMatchMedia({ matches: false });
    document.body.style.overflow = "clip";
    const outside = document.createElement("div");
    outside.setAttribute("inert", "");
    document.body.prepend(outside);
    const { trigger } = appendSidebar();
    await waitForController();

    trigger.click();
    await waitForController();
    trigger.click();
    await waitForController();

    expect(outside.hasAttribute("inert")).toBe(true);
    expect(document.body.style.overflow).toBe("clip");
  });

  it("keeps generated references unique and closes an existing modal before opening another", async () => {
    setupMatchMedia({ matches: false });
    const first = appendSidebar({ id: "first-sidebar" });
    const second = appendSidebar({ id: "second-sidebar" });
    await waitForController();

    first.trigger.click();
    await waitForController();
    second.trigger.click();
    await waitForController();

    expect(first.dialog.id).not.toBe(second.dialog.id);
    expect(first.provider.dataset.pathogenSidebarOpen).toBe("false");
    expect(first.dialog.hasAttribute("role")).toBe(false);
    expect(second.dialog.getAttribute("role")).toBe("dialog");
    expect(second.trigger.getAttribute("aria-controls")).toBe(second.dialog.id);
  });

  it("passes axe scans in desktop expanded, desktop rail, mobile closed, and mobile open states", async () => {
    const media = setupMatchMedia({ matches: true });
    const sidebar = appendSidebar({ open: true });
    await waitForController();

    for (const state of ["desktop expanded", "desktop rail", "mobile closed", "mobile open", "dark mobile open"]) {
      if (state === "desktop rail") sidebar.trigger.click();
      if (state === "mobile closed") media.setMatches(false);
      if (state === "mobile open") sidebar.trigger.click();
      if (state === "dark mobile open") sidebar.provider.classList.add("dark");
      await waitForController();

      const results = await axe.run(sidebar.provider);
      expect(results.violations, state).toEqual([]);
    }
  });
});
