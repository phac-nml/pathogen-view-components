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

const setupLegacyMatchMedia = ({ matches }) => {
  let listeners = [];

  const media = {
    matches,
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
  const dialog = document.createElement("dialog");
  dialog.id = `${id}-dialog`;
  dialog.className = "pathogen-sidebar-dialog";
  dialog.setAttribute("data-action", "click->pathogen--sidebar#closeOnBackdrop");
  dialog.setAttribute("data-pathogen--sidebar-target", "dialog");

  const panel = document.createElement("div");
  panel.id = `${id}-panel`;
  panel.className = "pathogen-sidebar-panel";
  panel.setAttribute("data-pathogen--sidebar-target", "panel");

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
    <div class="pathogen-sidebar-item__tooltip-root" data-pathogen--tooltip-disabled-value="true"></div>
  `;
  panel.append(closeButton, nav);

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.setAttribute("data-pathogen--sidebar-target", "trigger");
  trigger.setAttribute("data-action", "click->pathogen--sidebar#toggle");

  const inset = document.createElement("div");
  inset.className = "pathogen-sidebar-inset";
  inset.innerHTML = '<button type="button">Background action</button>';

  provider.append(dialog, panel, trigger, inset);
  document.body.append(provider);

  return { provider, dialog, panel, closeButton, nav, trigger, inset };
};

const appendSidebarWithRailFlyout = ({ id = "specimen-sidebar" } = {}) => {
  const sidebar = appendSidebar({ id, open: false });
  sidebar.nav.innerHTML = `
    <button
      type="button"
      data-pathogen--sidebar-target="submenuTrigger"
      data-pathogen-sidebar-flyout-id="${id}-settings-flyout"
      data-action="click->pathogen--sidebar#toggleFlyout keydown->pathogen--sidebar#handleFlyoutTriggerKeydown"
      aria-controls="${id}-settings-flyout"
      aria-expanded="false"
    >
      Settings
    </button>
    <div
      id="${id}-settings-flyout"
      data-pathogen--sidebar-target="flyout"
      role="group"
      hidden
      aria-labelledby="${id}-settings-flyout-heading"
    >
      <p id="${id}-settings-flyout-heading">Settings</p>
      <ul>
        <li><a href="#profile">Profile</a></li>
        <li><a href="#access">Access</a></li>
      </ul>
    </div>
  `;

  const flyoutTrigger = sidebar.nav.querySelector("[data-pathogen--sidebar-target='submenuTrigger']");
  const flyout = sidebar.nav.querySelector("[data-pathogen--sidebar-target='flyout']");

  return {
    ...sidebar,
    flyout,
    flyoutTrigger,
  };
};

const appendSidebarWithClonedFlyout = ({ id = "specimen-sidebar" } = {}) => {
  const sidebar = appendSidebar({ id, open: false });
  sidebar.nav.innerHTML = `
    <li class="pathogen-sidebar-item pathogen-sidebar-item--parent">
      <div class="pathogen-sidebar-item__expanded">
        <ul class="pathogen-sidebar-item__children">
          <li id="${id}-profile"><a href="#profile" data-controller="pathogen--tooltip">Profile</a></li>
          <li id="${id}-access"><a href="#access" aria-current="page">Access</a></li>
        </ul>
      </div>
      <button
        type="button"
        data-pathogen--sidebar-target="submenuTrigger"
        data-pathogen-sidebar-flyout-id="${id}-settings-flyout"
        data-action="click->pathogen--sidebar#toggleFlyout keydown->pathogen--sidebar#handleFlyoutTriggerKeydown"
        aria-controls="${id}-settings-flyout"
        aria-expanded="false"
      >
        Settings
      </button>
      <div
        id="${id}-settings-flyout"
        class="pathogen-sidebar-flyout"
        data-pathogen--sidebar-target="flyout"
        role="group"
        hidden
      >
        <p>Settings</p>
        <ul class="pathogen-sidebar-item__children"></ul>
      </div>
    </li>
  `;

  const flyoutTrigger = sidebar.nav.querySelector("[data-pathogen--sidebar-target='submenuTrigger']");
  const flyout = sidebar.nav.querySelector("[data-pathogen--sidebar-target='flyout']");

  return { ...sidebar, flyout, flyoutTrigger };
};

describe("sidebar_controller", () => {
  let application;

  const getController = (provider) => application.getControllerForElementAndIdentifier(provider, "pathogen--sidebar");

  beforeEach(() => {
    document.body.removeAttribute("style");
    window.localStorage.clear();
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal() {
      this.setAttribute("open", "");
      this.querySelector("button")?.focus();
    });
    HTMLDialogElement.prototype.close = vi.fn(function close() {
      if (!this.open) return;

      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    });
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
    expect(
      provider
        .querySelector(".pathogen-sidebar-item__tooltip-root")
        ?.getAttribute("data-pathogen--tooltip-disabled-value"),
    ).toBe("true");
  });

  it("restores desktop rail preference from localStorage", async () => {
    setupMatchMedia({ matches: true });
    window.localStorage.setItem("pathogen.sidebar.specimen-sidebar.open", "false");

    const { provider, trigger } = appendSidebar({ open: true });
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("rail");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(
      provider
        .querySelector(".pathogen-sidebar-item__tooltip-root")
        ?.getAttribute("data-pathogen--tooltip-disabled-value"),
    ).toBe("false");
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
    expect(
      provider
        .querySelector(".pathogen-sidebar-item__tooltip-root")
        ?.getAttribute("data-pathogen--tooltip-disabled-value"),
    ).toBe("false");

    trigger.click();
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("expanded");
    expect(
      provider
        .querySelector(".pathogen-sidebar-item__tooltip-root")
        ?.getAttribute("data-pathogen--tooltip-disabled-value"),
    ).toBe("true");
  });

  it("keeps multiple triggers synchronized to the same controlled region", async () => {
    setupMatchMedia({ matches: true });
    const { provider, panel, trigger } = appendSidebar({ open: true });
    const secondTrigger = trigger.cloneNode(true);
    provider.append(secondTrigger);
    await waitForController();

    secondTrigger.click();
    await waitForController();

    for (const control of [trigger, secondTrigger]) {
      expect(control.getAttribute("aria-controls")).toBe(panel.id);
      expect(control.getAttribute("aria-expanded")).toBe("false");
      expect(control.getAttribute("aria-label")).toBe("Expand sidebar");
    }
  });

  it("opens a named native modal dialog", async () => {
    setupMatchMedia({ matches: false });
    const outside = document.createElement("button");
    outside.textContent = "Outside provider";
    document.body.prepend(outside);
    const { provider, dialog, panel, closeButton, trigger, inset, nav } = appendSidebar({ open: true });
    await waitForController();

    expect(dialog.open).toBe(false);
    expect(panel.parentElement).toBe(dialog);

    trigger.focus();
    trigger.click();
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("offcanvas");
    expect(provider.dataset.pathogenSidebarOpen).toBe("true");
    expect(dialog.open).toBe(true);
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(dialog.getAttribute("aria-label")).toBe("Primary navigation");
    expect(nav.getAttribute("aria-label")).toBe("Primary navigation");
    expect(inset.hasAttribute("inert")).toBe(false);
    expect(outside.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.activeElement).toBe(closeButton);
    expect(trigger.getAttribute("aria-controls")).toBe(dialog.id);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("closes with Escape and restores focus to the exact invoking trigger", async () => {
    setupMatchMedia({ matches: false });
    const { dialog, panel, trigger, inset } = appendSidebar({ open: true });
    await waitForController();

    trigger.focus();
    trigger.click();
    await waitForController();

    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    dialog.close();
    await waitForController();

    expect(dialog.open).toBe(false);
    expect(panel.parentElement).toBe(dialog);
    expect(inset.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(trigger);
    expect(window.localStorage.getItem("pathogen.sidebar.specimen-sidebar.open")).toBeNull();
  });

  it("closes through pointer interaction on the native backdrop", async () => {
    setupMatchMedia({ matches: false });
    const { dialog, trigger } = appendSidebar();
    await waitForController();

    trigger.click();
    await waitForController();
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({
      left: 0,
      right: 320,
      top: 0,
      bottom: 800,
    });
    dialog.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 500, clientY: 400 }));
    await waitForController();

    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("leaves modal focus containment to the native dialog", async () => {
    setupMatchMedia({ matches: false });
    const { dialog, trigger, closeButton } = appendSidebar({ open: true });
    await waitForController();

    trigger.click();
    await waitForController();

    expect(dialog.open).toBe(true);
    expect(document.activeElement).toBe(closeButton);
  });

  it("cleans modal state when resizing to desktop and preserves useful focus", async () => {
    const media = setupMatchMedia({ matches: false });
    const { dialog, panel, closeButton, nav, trigger, inset } = appendSidebar({ open: true });
    await waitForController();

    trigger.click();
    await waitForController();
    expect(document.activeElement).toBe(closeButton);

    media.setMatches(true);
    await waitForController();

    expect(dialog.open).toBe(false);
    expect(panel.parentElement).toBe(dialog.parentElement);
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
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-controls")).toBe(dialog.id);
  });

  it("moves focus to the provider when no external trigger exists", async () => {
    const media = setupMatchMedia({ matches: true });
    const { provider, panel, nav } = appendSidebar({ open: true });
    panel.append(provider.querySelector('[data-pathogen--sidebar-target="trigger"]'));
    await waitForController();

    nav.querySelector("a").focus();
    media.setMatches(false);
    await waitForController();

    expect(provider.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(provider);
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

    expect(dialog.open).toBe(false);
    expect(inset.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("");
  });

  it("preserves scroll-lock state that existed before opening", async () => {
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
    expect(first.dialog.open).toBe(false);
    expect(second.dialog.open).toBe(true);
    expect(second.trigger.getAttribute("aria-controls")).toBe(second.dialog.id);
  });

  it("keeps independent desktop state for multiple sidebars", async () => {
    setupMatchMedia({ matches: true });
    const first = appendSidebar({ id: "first-sidebar", open: true });
    const second = appendSidebar({ id: "second-sidebar", open: false });
    await waitForController();

    expect(first.provider.dataset.pathogenSidebarMode).toBe("expanded");
    expect(second.provider.dataset.pathogenSidebarMode).toBe("rail");
  });

  it("opens rail flyouts from a parent trigger and updates aria-expanded", async () => {
    setupMatchMedia({ matches: true });
    const { provider, flyout, flyoutTrigger } = appendSidebarWithRailFlyout();
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("rail");
    expect(flyout.hidden).toBe(true);

    flyoutTrigger.click();
    await waitForController();

    expect(flyout.hidden).toBe(false);
    expect(flyout.dataset.state).toBe("open");
    expect(flyoutTrigger.getAttribute("aria-expanded")).toBe("true");
    expect(flyout.style.top).toMatch(/px$/);
  });

  it("closes an open rail flyout on Escape and restores focus to the trigger", async () => {
    setupMatchMedia({ matches: true });
    const { flyout, flyoutTrigger } = appendSidebarWithRailFlyout();
    await waitForController();

    flyoutTrigger.click();
    await waitForController();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await waitForController();

    expect(flyout.hidden).toBe(true);
    expect(flyoutTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(flyoutTrigger);
  });

  it("closes an open rail flyout when clicking outside the flyout and trigger", async () => {
    setupMatchMedia({ matches: true });
    const { flyout, flyoutTrigger, inset } = appendSidebarWithRailFlyout();
    await waitForController();

    flyoutTrigger.click();
    await waitForController();

    inset.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await waitForController();

    expect(flyout.hidden).toBe(true);
    expect(flyoutTrigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes rail flyouts when leaving rail mode", async () => {
    const media = setupMatchMedia({ matches: true });
    const { flyout, flyoutTrigger } = appendSidebarWithRailFlyout();
    await waitForController();

    flyoutTrigger.click();
    await waitForController();

    media.setMatches(false);
    await waitForController();

    expect(flyout.hidden).toBe(true);
    expect(flyoutTrigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("populates the flyout from the expanded panel once, without duplicate ids", async () => {
    setupMatchMedia({ matches: true });
    const { flyout, flyoutTrigger } = appendSidebarWithClonedFlyout();
    await waitForController();

    const list = flyout.querySelector("ul.pathogen-sidebar-item__children");
    expect(list.children.length).toBe(0);

    flyoutTrigger.click();
    await waitForController();

    const links = list.querySelectorAll("a");
    expect(Array.from(links).map((link) => link.getAttribute("href"))).toEqual(["#profile", "#access"]);
    expect(list.querySelectorAll("[id]").length).toBe(0);
    expect(list.querySelectorAll("[data-controller]").length).toBe(0);
    expect(document.querySelectorAll("#specimen-sidebar-profile").length).toBe(1);

    flyoutTrigger.click();
    await waitForController();
    flyoutTrigger.click();
    await waitForController();

    expect(list.querySelectorAll("a").length).toBe(2);
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

  it("supports legacy matchMedia addListener/removeListener APIs", async () => {
    setupLegacyMatchMedia({ matches: true });
    const { provider } = appendSidebar({ open: true });
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("expanded");

    provider.remove();
    await waitForController();
    expect(document.body.style.overflow).toBe("");
  });

  it("skips media cleanup when the media list is absent on disconnect", async () => {
    setupMatchMedia({ matches: true });
    const { provider } = appendSidebar({ open: true });
    await waitForController();

    const controller = getController(provider);
    controller.matchMediaList = null;

    provider.remove();
    await waitForController();
    expect(document.body.style.overflow).toBe("");
  });

  it("toggles desktop state when invoked without an event target", async () => {
    setupMatchMedia({ matches: true });
    const { provider } = appendSidebar({ open: true });
    await waitForController();

    const controller = getController(provider);
    controller.toggle();
    await waitForController();
    expect(provider.dataset.pathogenSidebarMode).toBe("rail");

    controller.toggle(new Event("click"));
    await waitForController();
    expect(provider.dataset.pathogenSidebarMode).toBe("expanded");
  });

  it("ignores closeOffcanvas on desktop or when already closed", async () => {
    const media = setupMatchMedia({ matches: true });
    const { provider } = appendSidebar({ open: true });
    await waitForController();

    const controller = getController(provider);
    expect(() => controller.closeOffcanvas()).not.toThrow();

    media.setMatches(false);
    await waitForController();
    controller.offcanvasOpen = false;
    expect(() => controller.closeOffcanvas()).not.toThrow();
  });

  it("ignores backdrop interactions on inner content and within the dialog bounds", async () => {
    setupMatchMedia({ matches: false });
    const { provider, dialog, panel, trigger } = appendSidebar({ open: true });
    await waitForController();

    trigger.click();
    await waitForController();

    const controller = getController(provider);
    const closeSpy = vi.spyOn(controller, "closeOffcanvas");
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({ left: 0, right: 320, top: 0, bottom: 800 });

    const backdrop = (clientX, clientY, target = dialog) =>
      controller.closeOnBackdrop({ target, clientX, clientY, preventDefault: () => {} });

    backdrop(100, 100, panel);
    backdrop(100, 100);
    expect(closeSpy).not.toHaveBeenCalled();

    backdrop(-10, 100);
    backdrop(500, 100);
    backdrop(100, -10);
    backdrop(100, 900);
    expect(closeSpy).toHaveBeenCalledTimes(4);
  });

  it("restores desktop expanded preference from localStorage", async () => {
    setupMatchMedia({ matches: true });
    window.localStorage.setItem("pathogen.sidebar.specimen-sidebar.open", "true");

    const { provider } = appendSidebar({ open: false });
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("expanded");
  });

  it("skips dialog sync when dialog or panel targets are missing", async () => {
    setupMatchMedia({ matches: true });
    const { provider } = appendSidebar({ open: true });
    await waitForController();

    const controller = getController(provider);

    Object.defineProperty(controller, "hasPanelTarget", { value: false, configurable: true });
    expect(() => controller.syncDialogState({ desktop: true, visibleOpen: true })).not.toThrow();

    Object.defineProperty(controller, "hasPanelTarget", { value: true, configurable: true });
    Object.defineProperty(controller, "hasDialogTarget", { value: false, configurable: true });
    expect(() => controller.syncDialogState({ desktop: true, visibleOpen: true })).not.toThrow();

    Object.defineProperty(controller, "hasDialogTarget", { value: true, configurable: true });
  });

  it("does not reopen a dialog that is already open", async () => {
    setupMatchMedia({ matches: false });
    const { provider, dialog, trigger } = appendSidebar({ open: true });
    await waitForController();

    trigger.click();
    await waitForController();

    const controller = getController(provider);
    dialog.showModal.mockClear();
    controller.syncDialogState({ desktop: false, visibleOpen: true });

    expect(dialog.showModal).not.toHaveBeenCalled();
  });

  it("locks the body scroll only once", async () => {
    setupMatchMedia({ matches: false });
    const { provider, trigger } = appendSidebar({ open: true });
    await waitForController();

    trigger.click();
    await waitForController();

    const controller = getController(provider);
    const overflow = document.body.style.overflow;
    controller.lockBodyScroll();
    expect(document.body.style.overflow).toBe(overflow);
  });

  it("skips copying a dialog name when the sidebar target is missing", async () => {
    setupMatchMedia({ matches: false });
    const { provider } = appendSidebar({ open: true });
    await waitForController();

    const controller = getController(provider);
    Object.defineProperty(controller, "hasSidebarTarget", { value: false, configurable: true });
    expect(() => controller.copyNavigationNameToDialog()).not.toThrow();
  });

  it("copies aria-labelledby onto the dialog when the sidebar uses it", async () => {
    setupMatchMedia({ matches: false });
    const { dialog, nav, trigger } = appendSidebar({ open: true });
    nav.removeAttribute("aria-label");
    nav.setAttribute("aria-labelledby", "nav-heading");
    await waitForController();

    trigger.click();
    await waitForController();

    expect(dialog.getAttribute("aria-labelledby")).toBe("nav-heading");
  });

  it("leaves the dialog unnamed when the sidebar has neither label", async () => {
    setupMatchMedia({ matches: false });
    const { dialog, nav, trigger } = appendSidebar({ open: true });
    nav.removeAttribute("aria-label");
    await waitForController();

    trigger.click();
    await waitForController();

    expect(dialog.hasAttribute("aria-label")).toBe(false);
    expect(dialog.hasAttribute("aria-labelledby")).toBe(false);
  });

  it("omits aria-controls when the controlled element has no id", async () => {
    setupMatchMedia({ matches: true });
    const { panel, trigger } = appendSidebar({ open: true });
    panel.removeAttribute("id");
    await waitForController();

    expect(trigger.hasAttribute("aria-controls")).toBe(false);
  });

  it("does not focus a missing close control", async () => {
    setupMatchMedia({ matches: false });
    const { provider } = appendSidebar({ open: true });
    await waitForController();

    const controller = getController(provider);
    Object.defineProperty(controller, "hasCloseTarget", { value: false, configurable: true });
    expect(() => controller.focusCloseControl()).not.toThrow();
  });

  it("falls back to an external trigger when no invoking trigger was recorded", async () => {
    setupMatchMedia({ matches: false });
    const { provider, trigger } = appendSidebar({ open: true });
    await waitForController();

    const controller = getController(provider);
    controller.lastTrigger = null;
    controller.restoreTriggerFocus();

    expect(document.activeElement).toBe(trigger);
  });

  it("keeps an existing provider tabindex when falling back to it", async () => {
    const media = setupMatchMedia({ matches: true });
    const { provider, panel } = appendSidebar({ open: true });
    provider.setAttribute("tabindex", "0");
    panel.append(provider.querySelector('[data-pathogen--sidebar-target="trigger"]'));
    await waitForController();

    provider.querySelector("nav a").focus();
    media.setMatches(false);
    await waitForController();

    expect(provider.getAttribute("tabindex")).toBe("0");
    expect(document.activeElement).toBe(provider);
  });

  it("focuses the sidebar itself when it has no focusable items", async () => {
    const media = setupMatchMedia({ matches: false });
    const { provider, nav, trigger } = appendSidebar({ open: true });
    nav.innerHTML = "<span>no focusable</span>";
    await waitForController();

    trigger.click();
    await waitForController();

    const controller = getController(provider);
    const focusSpy = vi.spyOn(controller.sidebarTarget, "focus");
    media.setMatches(true);
    await waitForController();

    expect(focusSpy).toHaveBeenCalled();
  });
});
