/* global jsdom -- Vitest exposes the active JSDOM instance in the jsdom environment */
import { Application } from "@hotwired/stimulus";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SidebarController from "../../../app/assets/javascripts/pathogen_view_components/sidebar_controller";

const waitForController = () => new Promise((resolve) => setTimeout(resolve, 0));
const ORIGINAL_URL = window.location.href;

const createMedia = (matches) => {
  const listeners = new Set();

  return {
    matches,
    addEventListener(_event, callback, { signal } = {}) {
      listeners.add(callback);
      signal?.addEventListener("abort", () => listeners.delete(callback));
    },
    setMatches(nextMatches) {
      this.matches = nextMatches;
      [...listeners].forEach((listener) => listener({ matches: nextMatches }));
    },
    listenerCount: () => listeners.size,
  };
};

// `matches` answers the sidebar's desktop breakpoint; `hoverless` answers the
// "(hover: none)" query the controller uses to keep rail tooltips off touch devices.
const setupMatchMedia = ({ matches, hoverless = false }) => {
  const media = createMedia(matches);
  media.hover = createMedia(hoverless);

  vi.stubGlobal(
    "matchMedia",
    vi.fn((query) => (query === "(hover: none)" ? media.hover : media)),
  );
  return media;
};

const appendSidebar = ({ id = "specimen-sidebar", open = true, persistence = "localStorage" } = {}) => {
  const provider = document.createElement("div");
  provider.className = "pathogen-sidebar-provider";
  provider.setAttribute("data-controller", "pathogen--sidebar");
  provider.setAttribute("data-pathogen--sidebar-open-value", String(open));
  provider.setAttribute("data-pathogen--sidebar-breakpoint-value", "(min-width: 80rem)");
  if (persistence === "localStorage") {
    provider.setAttribute("data-pathogen--sidebar-storage-key-value", `pathogen.sidebar.${id}.open`);
  }
  if (persistence === "cookie") {
    provider.setAttribute("data-pathogen--sidebar-cookie-name-value", "pathogen_sidebar_specimen_open");
  }
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
  nav.tabIndex = -1;
  nav.setAttribute("aria-label", "Primary navigation");
  nav.setAttribute("data-pathogen--sidebar-target", "sidebar");
  nav.innerHTML = `
    <button type="button">first</button>
    <a href="#">second</a>
    <div data-pathogen--sidebar-target="tooltipRoot" data-pathogen--tooltip-disabled-value="true"></div>
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

  return { provider, dialog, panel, closeButton, nav, trigger, inset, tooltipRoot: nav.querySelector("div") };
};

// Mirrors Pathogen::Sidebar::Item's parent markup: an expanded source list, a
// rail trigger inside its tooltip root, and a flyout that ships with an empty list.
const railItemMarkup = ({ id, name, children }) => `
  <li>
    <div>
      <ul data-pathogen-sidebar-children="source">${children}</ul>
    </div>
    <div data-pathogen--sidebar-target="tooltipRoot" data-pathogen--tooltip-disabled-value="true">
      <button
        type="button"
        data-pathogen--sidebar-target="submenuTrigger"
        data-pathogen-sidebar-flyout-id="${id}-${name}-flyout"
        data-action="click->pathogen--sidebar#toggleFlyout keydown->pathogen--sidebar#handleFlyoutTriggerKeydown"
        aria-controls="${id}-${name}-flyout"
        aria-expanded="false"
      >
        ${name}
      </button>
    </div>
    <div
      id="${id}-${name}-flyout"
      data-pathogen--sidebar-target="flyout"
      data-action="keydown->pathogen--sidebar#handleFlyoutKeydown"
      role="group"
      hidden
      aria-labelledby="${id}-${name}-flyout-heading"
    >
      <p id="${id}-${name}-flyout-heading">${name}</p>
      <ul data-pathogen-sidebar-children="flyout"></ul>
    </div>
  </li>
`;

const appendSidebarWithRailFlyout = ({ id = "specimen-sidebar", open = false } = {}) => {
  const sidebar = appendSidebar({ id, open });
  sidebar.nav.innerHTML = `<ul>
    ${railItemMarkup({
      id,
      name: "settings",
      children: `
        <li id="${id}-profile"><a href="#profile" data-controller="pathogen--tooltip">Profile</a></li>
        <li id="${id}-access"><a href="#access" aria-current="page">Access</a></li>
      `,
    })}
    ${railItemMarkup({ id, name: "reports", children: '<li><a href="#weekly">Weekly</a></li>' })}
  </ul>`;

  const [flyoutTrigger, secondTrigger] = sidebar.nav.querySelectorAll(
    "[data-pathogen--sidebar-target='submenuTrigger']",
  );
  const [flyout, secondFlyout] = sidebar.nav.querySelectorAll("[data-pathogen--sidebar-target='flyout']");

  return {
    ...sidebar,
    flyout,
    flyoutTrigger,
    secondFlyout,
    secondTrigger,
    source: sidebar.nav.querySelector('[data-pathogen-sidebar-children="source"]'),
    tooltipRoot: flyoutTrigger.parentElement,
  };
};

const keydown = (target, key, init = {}) => {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
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
    document.body.removeAttribute("dir");
    document.cookie
      .split("; ")
      .filter(Boolean)
      .forEach((cookie) => {
        document.cookie = `${cookie.split("=")[0]}=; Path=/; Max-Age=0`;
      });
    jsdom.reconfigure({ url: ORIGINAL_URL });
    Object.defineProperties(window, {
      innerHeight: { configurable: true, writable: true, value: 768 },
      innerWidth: { configurable: true, writable: true, value: 1024 },
    });
    vi.unstubAllGlobals();
    await waitForController();
  });

  it("uses expanded mode by default on desktop", async () => {
    setupMatchMedia({ matches: true });
    const { provider, trigger } = appendSidebar({ open: true });
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("expanded");
    expect(provider.dataset.pathogenSidebarOpen).toBe("true");
    expect(provider.dataset.pathogenSidebarReady).toBe("true");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-label")).toBe("Collapse sidebar");
    expect(
      provider
        .querySelector("[data-pathogen--sidebar-target='tooltipRoot']")
        .getAttribute("data-pathogen--tooltip-disabled-value"),
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
        .querySelector("[data-pathogen--sidebar-target='tooltipRoot']")
        .getAttribute("data-pathogen--tooltip-disabled-value"),
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
        .querySelector("[data-pathogen--sidebar-target='tooltipRoot']")
        .getAttribute("data-pathogen--tooltip-disabled-value"),
    ).toBe("false");

    trigger.click();
    await waitForController();

    expect(provider.dataset.pathogenSidebarMode).toBe("expanded");
    expect(
      provider
        .querySelector("[data-pathogen--sidebar-target='tooltipRoot']")
        .getAttribute("data-pathogen--tooltip-disabled-value"),
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

  it("toggles desktop state when invoked without an event target", async () => {
    setupMatchMedia({ matches: true });
    const { provider } = appendSidebar({ open: true });
    await waitForController();

    const controller = getController(provider);
    controller.toggle();
    expect(controller.mode).toBe("rail");
    expect(provider.dataset.pathogenSidebarMode).toBe("rail");

    controller.toggle(new Event("click"));
    expect(controller.mode).toBe("expanded");
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

  it("leaves submenu aria-controls unset when no matching flyout exists", async () => {
    setupMatchMedia({ matches: true });
    const { nav } = appendSidebar({ open: false });
    nav.innerHTML = `
      <button
        type="button"
        data-pathogen--sidebar-target="submenuTrigger"
        data-pathogen-sidebar-flyout-id="missing-flyout"
        aria-expanded="false"
      >
        Missing flyout
      </button>
    `;
    await waitForController();

    const submenuTrigger = nav.querySelector("[data-pathogen--sidebar-target='submenuTrigger']");
    expect(submenuTrigger).not.toBeNull();
    expect(submenuTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(submenuTrigger.hasAttribute("aria-controls")).toBe(false);
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
    const { nav, trigger } = appendSidebar({ open: true });
    nav.innerHTML = "<span>no focusable</span>";
    await waitForController();

    trigger.click();
    await waitForController();

    media.setMatches(true);
    await waitForController();

    expect(document.activeElement).toBe(nav);
  });

  describe("rail flyout", () => {
    const openFlyout = async (sidebar) => {
      sidebar.flyoutTrigger.focus();
      sidebar.flyoutTrigger.click();
      await waitForController();
    };

    it("opens from its trigger, mirrors the child links without ids, and closes on a second click", async () => {
      setupMatchMedia({ matches: true });
      const sidebar = appendSidebarWithRailFlyout();
      const { flyout, flyoutTrigger } = sidebar;
      await waitForController();

      expect(flyout.hidden).toBe(true);
      await openFlyout(sidebar);

      const links = flyout.querySelectorAll("a");
      expect(flyout.hidden).toBe(false);
      expect(flyoutTrigger.getAttribute("aria-expanded")).toBe("true");
      expect(Array.from(links, (link) => link.getAttribute("href"))).toEqual(["#profile", "#access"]);
      expect(links[1].getAttribute("aria-current")).toBe("page");
      expect(flyout.querySelectorAll("li[id], [data-controller]")).toHaveLength(0);
      expect(document.querySelectorAll("#specimen-sidebar-profile")).toHaveLength(1);
      expect(flyout.style.top).toMatch(/px$/);

      flyoutTrigger.click();
      await waitForController();

      expect(flyout.hidden).toBe(true);
      expect(flyout.style.top).toBe("");
      expect(flyoutTrigger.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(flyoutTrigger);
    });

    it("reflects changes to the expanded list the next time it opens", async () => {
      setupMatchMedia({ matches: true });
      const sidebar = appendSidebarWithRailFlyout();
      const { flyout, flyoutTrigger, source } = sidebar;
      await waitForController();

      await openFlyout(sidebar);
      flyoutTrigger.click();

      source.querySelector("[aria-current]").removeAttribute("aria-current");
      source.insertAdjacentHTML("beforeend", '<li><a href="#tokens" aria-current="page">Tokens</a></li>');
      await openFlyout(sidebar);

      expect(Array.from(flyout.querySelectorAll("a"), (link) => link.getAttribute("href"))).toEqual([
        "#profile",
        "#access",
        "#tokens",
      ]);
      expect(flyout.querySelector("[aria-current='page']").getAttribute("href")).toBe("#tokens");
    });

    it("opens only one flyout at a time", async () => {
      setupMatchMedia({ matches: true });
      const sidebar = appendSidebarWithRailFlyout();
      const { flyout, flyoutTrigger, secondFlyout, secondTrigger } = sidebar;
      await waitForController();

      await openFlyout(sidebar);
      secondTrigger.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      secondTrigger.click();
      await waitForController();

      expect(flyout.hidden).toBe(true);
      expect(flyoutTrigger.getAttribute("aria-expanded")).toBe("false");
      expect(secondFlyout.hidden).toBe(false);
      expect(secondTrigger.getAttribute("aria-expanded")).toBe("true");
    });

    it("stays closed outside rail mode and for a trigger without a flyout or lists", async () => {
      setupMatchMedia({ matches: true });
      const sidebar = appendSidebarWithRailFlyout({ open: true });
      const { provider, flyout, flyoutTrigger, trigger } = sidebar;
      await waitForController();

      flyoutTrigger.click();
      expect(keydown(flyoutTrigger, "ArrowRight").defaultPrevented).toBe(false);
      expect(flyout.hidden).toBe(true);

      trigger.click();
      await waitForController();
      expect(provider.dataset.pathogenSidebarMode).toBe("rail");

      flyoutTrigger.dataset.pathogenSidebarFlyoutId = "missing-flyout";
      flyoutTrigger.click();
      expect(keydown(flyoutTrigger, "ArrowRight").defaultPrevented).toBe(false);
      expect(flyout.hidden).toBe(true);

      flyoutTrigger.dataset.pathogenSidebarFlyoutId = flyout.id;
      flyout.querySelector("ul").remove();
      flyoutTrigger.click();
      expect(flyout.hidden).toBe(false);
      expect(flyout.querySelectorAll("a")).toHaveLength(0);
    });

    it("moves focus into the flyout with the inline-end arrow, including when it is already open", async () => {
      setupMatchMedia({ matches: true });
      const sidebar = appendSidebarWithRailFlyout();
      const { flyout, flyoutTrigger } = sidebar;
      await waitForController();

      flyoutTrigger.focus();
      expect(keydown(flyoutTrigger, "ArrowRight").defaultPrevented).toBe(true);
      expect(flyout.hidden).toBe(false);
      expect(document.activeElement).toBe(flyout.querySelector("a[href='#profile']"));

      flyoutTrigger.focus();
      keydown(flyoutTrigger, "ArrowRight");

      expect(flyout.hidden).toBe(false);
      expect(document.activeElement).toBe(flyout.querySelector("a[href='#profile']"));
    });

    it("closes with the inline-start arrow from the trigger or from inside the flyout", async () => {
      setupMatchMedia({ matches: true });
      const sidebar = appendSidebarWithRailFlyout();
      const { flyout, flyoutTrigger } = sidebar;
      await waitForController();

      expect(keydown(flyoutTrigger, "ArrowLeft").defaultPrevented).toBe(false);

      await openFlyout(sidebar);
      expect(keydown(flyoutTrigger, "ArrowLeft").defaultPrevented).toBe(true);
      expect(flyout.hidden).toBe(true);

      keydown(flyoutTrigger, "ArrowRight");
      const link = flyout.querySelector("a");
      expect(keydown(link, "ArrowDown").defaultPrevented).toBe(false);
      expect(flyout.hidden).toBe(false);

      expect(keydown(link, "ArrowLeft").defaultPrevented).toBe(true);
      expect(flyout.hidden).toBe(true);
      expect(document.activeElement).toBe(flyoutTrigger);
    });

    it("leaves modified arrow keys to the browser", async () => {
      setupMatchMedia({ matches: true });
      const sidebar = appendSidebarWithRailFlyout();
      const { flyout, flyoutTrigger } = sidebar;
      await waitForController();

      for (const modifier of ["altKey", "ctrlKey", "metaKey", "shiftKey"]) {
        expect(keydown(flyoutTrigger, "ArrowRight", { [modifier]: true }).defaultPrevented, modifier).toBe(false);
      }
      expect(flyout.hidden).toBe(true);

      await openFlyout(sidebar);
      expect(keydown(flyout.querySelector("a"), "ArrowLeft", { altKey: true }).defaultPrevented).toBe(false);
      expect(flyout.hidden).toBe(false);
    });

    it("uses mirrored arrow keys and placement when an ancestor sets dir=rtl", async () => {
      setupMatchMedia({ matches: true });
      Object.defineProperties(window, {
        innerHeight: { configurable: true, value: 200 },
        innerWidth: { configurable: true, value: 300 },
      });
      const sidebar = appendSidebarWithRailFlyout();
      const { flyout, flyoutTrigger } = sidebar;
      document.body.dir = "rtl";
      vi.spyOn(flyoutTrigger, "getBoundingClientRect").mockReturnValue({ left: 12, right: 36, top: 190 });
      vi.spyOn(flyout, "getBoundingClientRect").mockReturnValue({ height: 80 });
      await waitForController();

      keydown(flyoutTrigger, "ArrowLeft");

      expect(flyout.hidden).toBe(false);
      expect(flyout.style.right).toBe("296px");
      expect(flyout.style.left).toBe("");
      expect(flyout.style.top).toBe("112px");
      expect(flyout.style.maxHeight).toBe("80px");

      keydown(flyout.querySelector("a"), "ArrowRight");
      expect(flyout.hidden).toBe(true);
    });

    it("measures without the previous height clamp when the viewport changes", async () => {
      setupMatchMedia({ matches: true });
      Object.defineProperties(window, {
        innerHeight: { configurable: true, writable: true, value: 400 },
        innerWidth: { configurable: true, value: 1200 },
      });
      const sidebar = appendSidebarWithRailFlyout();
      const { flyout, flyoutTrigger } = sidebar;
      vi.spyOn(flyoutTrigger, "getBoundingClientRect").mockReturnValue({ left: 8, right: 52, top: 300 });
      // A 600px-tall flyout that reports its clamped height while a clamp is applied.
      vi.spyOn(flyout, "getBoundingClientRect").mockImplementation(() => ({
        height: flyout.style.maxHeight ? Math.min(600, parseFloat(flyout.style.maxHeight)) : 600,
      }));
      await waitForController();

      await openFlyout(sidebar);
      expect(flyout.style.left).toBe("60px");
      expect(flyout.style.top).toBe("8px");
      expect(flyout.style.maxHeight).toBe("384px");
      expect(flyout.style.maxWidth).toBe("");

      window.innerHeight = 1000;
      window.dispatchEvent(new Event("resize"));

      expect(flyout.style.top).toBe("300px");
      expect(flyout.style.maxHeight).toBe("692px");
    });

    it("repositions on page scroll but not when the flyout itself scrolls", async () => {
      setupMatchMedia({ matches: true });
      const sidebar = appendSidebarWithRailFlyout();
      const { flyout, flyoutTrigger } = sidebar;
      const triggerRect = vi
        .spyOn(flyoutTrigger, "getBoundingClientRect")
        .mockReturnValue({ left: 8, right: 52, top: 40 });
      await waitForController();
      await openFlyout(sidebar);
      expect(flyout.style.top).toBe("40px");

      triggerRect.mockReturnValue({ left: 8, right: 52, top: 20 });
      flyout.dispatchEvent(new Event("scroll"));
      expect(flyout.style.top).toBe("40px");

      document.dispatchEvent(new Event("scroll"));
      expect(flyout.style.top).toBe("20px");

      triggerRect.mockReturnValue({ left: 8, right: 52, top: 30 });
      window.dispatchEvent(new Event("scroll"));
      expect(flyout.style.top).toBe("30px");
    });

    it("closes on Escape and returns focus to the trigger when focus is inside", async () => {
      setupMatchMedia({ matches: true });
      const sidebar = appendSidebarWithRailFlyout();
      const { flyout, flyoutTrigger } = sidebar;
      await waitForController();

      keydown(flyoutTrigger, "ArrowRight");
      expect(keydown(document.activeElement, "Tab").defaultPrevented).toBe(false);
      const escape = keydown(document.activeElement, "Escape");

      expect(escape.defaultPrevented).toBe(true);
      expect(flyout.hidden).toBe(true);
      expect(document.activeElement).toBe(flyoutTrigger);
    });

    it("closes on Escape without taking the key or focus when focus is elsewhere", async () => {
      setupMatchMedia({ matches: true });
      const sidebar = appendSidebarWithRailFlyout();
      const { flyout, flyoutTrigger } = sidebar;
      await waitForController();

      flyoutTrigger.click();
      await waitForController();
      expect(document.activeElement).toBe(document.body);

      const escape = keydown(document.body, "Escape");

      expect(escape.defaultPrevented).toBe(false);
      expect(flyout.hidden).toBe(true);
      expect(document.activeElement).toBe(document.body);
    });

    it("closes when focus moves past it, leaving focus where the user put it", async () => {
      setupMatchMedia({ matches: true });
      const sidebar = appendSidebarWithRailFlyout();
      const { flyout, flyoutTrigger, inset } = sidebar;
      await waitForController();

      keydown(flyoutTrigger, "ArrowRight");
      flyout.querySelectorAll("a")[1].focus();
      flyoutTrigger.focus();
      expect(flyout.hidden).toBe(false);

      const backgroundAction = inset.querySelector("button");
      backgroundAction.focus();

      expect(flyout.hidden).toBe(true);
      expect(flyoutTrigger.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(backgroundAction);
    });

    it("closes on a pointer press outside, but not inside the flyout or on its trigger", async () => {
      setupMatchMedia({ matches: true });
      const sidebar = appendSidebarWithRailFlyout();
      const { flyout, flyoutTrigger, inset } = sidebar;
      await waitForController();
      await openFlyout(sidebar);

      flyout.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      flyoutTrigger.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      expect(flyout.hidden).toBe(false);

      inset.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      expect(flyout.hidden).toBe(true);
    });

    it("closes when the sidebar leaves rail mode and stops listening afterwards", async () => {
      const media = setupMatchMedia({ matches: true });
      const sidebar = appendSidebarWithRailFlyout();
      const { flyout, flyoutTrigger, inset } = sidebar;
      const positioned = vi.spyOn(flyoutTrigger, "getBoundingClientRect");
      await waitForController();
      await openFlyout(sidebar);

      media.setMatches(false);

      expect(flyout.hidden).toBe(true);
      expect(flyoutTrigger.getAttribute("aria-expanded")).toBe("false");

      positioned.mockClear();
      window.dispatchEvent(new Event("resize"));
      inset.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      expect(positioned).not.toHaveBeenCalled();
    });

    it("hides the trigger's tooltip while its flyout is open and on devices that cannot hover", async () => {
      const media = setupMatchMedia({ matches: true });
      const sidebar = appendSidebarWithRailFlyout();
      const { tooltipRoot, secondTrigger } = sidebar;
      const disabled = (root) => root.getAttribute("data-pathogen--tooltip-disabled-value");
      await waitForController();

      expect(disabled(tooltipRoot)).toBe("false");

      await openFlyout(sidebar);
      expect(disabled(tooltipRoot)).toBe("true");
      expect(disabled(secondTrigger.parentElement)).toBe("false");

      keydown(document.activeElement, "Escape");
      expect(disabled(tooltipRoot)).toBe("false");

      media.hover.setMatches(true);
      expect(disabled(tooltipRoot)).toBe("true");
    });
  });

  describe("state, persistence, and Turbo", () => {
    it("follows the open value when a host writes it after connect", async () => {
      setupMatchMedia({ matches: true });
      const { provider, trigger } = appendSidebar({ open: true });
      await waitForController();

      provider.setAttribute("data-pathogen--sidebar-open-value", "false");
      await waitForController();

      expect(provider.dataset.pathogenSidebarMode).toBe("rail");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(window.localStorage.getItem("pathogen.sidebar.specimen-sidebar.open")).toBeNull();
    });

    it("announces a desktop toggle to the host", async () => {
      setupMatchMedia({ matches: true });
      const { provider, trigger } = appendSidebar({ open: true });
      const toggled = vi.fn();
      provider.addEventListener("pathogen--sidebar:toggle", (event) => toggled(event.detail));
      await waitForController();

      trigger.click();

      expect(toggled).toHaveBeenCalledExactlyOnceWith({ open: false });
    });

    it("keeps working when localStorage rejects a write", async () => {
      setupMatchMedia({ matches: true });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("Quota exceeded");
      });
      const { provider, trigger } = appendSidebar({ open: true });
      await waitForController();

      trigger.click();

      expect(provider.dataset.pathogenSidebarMode).toBe("rail");
    });

    it("stores nothing when no persistence is configured", async () => {
      setupMatchMedia({ matches: true });
      window.localStorage.setItem("pathogen.sidebar.specimen-sidebar.open", "false");
      const { provider, trigger } = appendSidebar({ open: true, persistence: "none" });
      await waitForController();

      expect(provider.dataset.pathogenSidebarMode).toBe("expanded");

      trigger.click();

      expect(provider.dataset.pathogenSidebarMode).toBe("rail");
      expect(window.localStorage.getItem("pathogen.sidebar.specimen-sidebar.open")).toBe("false");
      expect(document.cookie).toBe("");
    });

    it("writes a cookie the server can read and trusts the server-rendered state", async () => {
      setupMatchMedia({ matches: true });
      window.localStorage.setItem("pathogen.sidebar.specimen-sidebar.open", "false");
      const { provider, trigger } = appendSidebar({ open: true, persistence: "cookie" });
      const written = vi.spyOn(document, "cookie", "set");
      await waitForController();

      expect(provider.dataset.pathogenSidebarMode).toBe("expanded");

      trigger.click();

      expect(written).toHaveBeenLastCalledWith(
        "pathogen_sidebar_specimen_open=false; Path=/; Max-Age=31536000; SameSite=Lax",
      );
      expect(document.cookie).toContain("pathogen_sidebar_specimen_open=false");
      expect(window.localStorage.getItem("pathogen.sidebar.specimen-sidebar.open")).toBe("false");

      jsdom.reconfigure({ url: "https://localhost:3000/" });
      trigger.click();

      expect(written).toHaveBeenLastCalledWith(
        "pathogen_sidebar_specimen_open=true; Path=/; Max-Age=31536000; SameSite=Lax; Secure",
      );
    });

    it("does not persist the mobile drawer state", async () => {
      setupMatchMedia({ matches: false });
      const { trigger } = appendSidebar({ open: true, persistence: "cookie" });
      await waitForController();

      trigger.click();
      trigger.click();

      expect(document.cookie).toBe("");
    });

    it("restores focus to an external trigger when the drawer was opened without one", async () => {
      setupMatchMedia({ matches: false });
      const { provider, dialog, trigger } = appendSidebar({ open: true });
      await waitForController();

      const controller = getController(provider);
      controller.closeOffcanvas();
      expect(dialog.open).toBe(false);

      controller.toggle();
      expect(controller.mode).toBe("offcanvas");
      expect(dialog.open).toBe(true);
      expect(trigger.getAttribute("aria-label")).toBe("Close sidebar");

      controller.closeOffcanvas();

      expect(dialog.open).toBe(false);
      expect(trigger.getAttribute("aria-label")).toBe("Open sidebar");
      expect(document.activeElement).toBe(trigger);
    });

    it("keeps its own attributes when Turbo morphs server markup over them", async () => {
      setupMatchMedia({ matches: true });
      const { provider, trigger, closeButton, tooltipRoot, inset } = appendSidebar({ open: true });
      await waitForController();

      const morph = (target, attributeName) => {
        const event = new CustomEvent("turbo:before-morph-attribute", {
          bubbles: true,
          cancelable: true,
          detail: { attributeName, mutationType: "updated" },
        });
        target.dispatchEvent(event);
        return event.defaultPrevented;
      };

      expect(morph(provider, "data-pathogen-sidebar-mode")).toBe(true);
      expect(morph(provider, "data-pathogen-sidebar-ready")).toBe(true);
      expect(morph(provider, "data-pathogen--sidebar-open-value")).toBe(true);
      expect(morph(provider, "class")).toBe(false);
      expect(morph(trigger, "aria-expanded")).toBe(true);
      expect(morph(closeButton, "aria-label")).toBe(true);
      expect(morph(trigger, "class")).toBe(false);
      expect(morph(tooltipRoot, "data-pathogen--tooltip-disabled-value")).toBe(true);
      expect(morph(inset, "aria-expanded")).toBe(false);
    });

    it("lets a morph update the open value when the server owns it through the cookie", async () => {
      setupMatchMedia({ matches: true });
      const { provider } = appendSidebar({ open: true, persistence: "cookie" });
      await waitForController();

      const event = new CustomEvent("turbo:before-morph-attribute", {
        bubbles: true,
        cancelable: true,
        detail: { attributeName: "data-pathogen--sidebar-open-value" },
      });
      provider.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });

    it("hands a morph the server-rendered shape and re-applies the mobile layout after it renders", async () => {
      setupMatchMedia({ matches: false });
      const { dialog, panel, trigger } = appendSidebar({ open: true });
      await waitForController();
      trigger.click();
      expect(dialog.open).toBe(true);

      document.dispatchEvent(new CustomEvent("turbo:render"));
      expect(dialog.open).toBe(true);
      expect(dialog.showModal).toHaveBeenCalledOnce();
      expect(document.body.style.overflow).toBe("hidden");

      document.dispatchEvent(new CustomEvent("turbo:before-render", { detail: { renderMethod: "replace" } }));
      expect(dialog.open).toBe(true);

      document.dispatchEvent(new CustomEvent("turbo:before-render", { detail: { renderMethod: "morph" } }));
      expect(dialog.open).toBe(false);
      expect(panel.parentElement).not.toBe(dialog);
      expect(document.body.style.overflow).toBe("");

      document.dispatchEvent(new CustomEvent("turbo:render"));
      expect(panel.parentElement).toBe(dialog);
      expect(dialog.open).toBe(false);
    });

    it("removes every listener when it disconnects", async () => {
      const media = setupMatchMedia({ matches: true });
      const { provider } = appendSidebar({ open: true });
      await waitForController();
      expect(media.listenerCount()).toBe(1);
      expect(media.hover.listenerCount()).toBe(1);

      provider.remove();
      await waitForController();

      expect(media.listenerCount()).toBe(0);
      expect(media.hover.listenerCount()).toBe(0);
      provider.setAttribute("data-pathogen--sidebar-open-value", "false");
      expect(() => document.dispatchEvent(new CustomEvent("turbo:render"))).not.toThrow();
      expect(provider.dataset.pathogenSidebarMode).toBe("expanded");
    });

    it("passes axe scans in every state, including an open rail flyout", async () => {
      const media = setupMatchMedia({ matches: true });
      const sidebar = appendSidebarWithRailFlyout({ open: true });
      await waitForController();

      const states = ["desktop expanded", "desktop rail", "rail flyout open", "mobile closed", "mobile open", "dark"];
      for (const state of states) {
        if (state === "desktop rail") sidebar.trigger.click();
        if (state === "rail flyout open") sidebar.flyoutTrigger.click();
        if (state === "mobile closed") media.setMatches(false);
        if (state === "mobile open") sidebar.trigger.click();
        if (state === "dark") sidebar.provider.classList.add("dark");
        await waitForController();

        const results = await axe.run(sidebar.provider);
        expect(results.violations, state).toEqual([]);
      }
    });
  });
});
