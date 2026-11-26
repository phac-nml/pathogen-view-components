import { Controller } from "@hotwired/stimulus";

import { SidebarFlyout } from "pathogen_view_components/sidebar_controller/flyout";

const MODAL_OPEN_EVENT = "pathogen:sidebar:modal-open";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const HOVERLESS_QUERY = "(hover: none)";
const FOCUSABLE =
  "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])";

// Attributes this controller writes after connecting. A Turbo morph must not
// reset them to their server-rendered values while the controller stays alive.
const OWNED_PROVIDER_ATTRIBUTES = [
  "data-pathogen-sidebar-mode",
  "data-pathogen-sidebar-open",
  "data-pathogen-sidebar-ready",
];
const OWNED_TRIGGER_ATTRIBUTES = ["aria-controls", "aria-expanded", "aria-label", "title"];
const OWNED_TOOLTIP_ATTRIBUTES = ["data-pathogen--tooltip-disabled-value"];
const OPEN_VALUE_ATTRIBUTE = "data-pathogen--sidebar-open-value";

export default class SidebarController extends Controller {
  static targets = ["close", "dialog", "flyout", "panel", "sidebar", "submenuTrigger", "tooltipRoot", "trigger"];

  static values = {
    open: { type: Boolean, default: true },
    breakpoint: { type: String, default: "(min-width: 80rem)" },
    storageKey: String,
    cookieName: String,
    collapseLabel: String,
    expandLabel: String,
    openLabel: String,
    closeLabel: String,
  };

  #flyout = new SidebarFlyout(this);
  #listeners = null;
  #desktopMedia = null;
  #hoverlessMedia = null;
  #mode = null;
  #offcanvasOpen = false;
  #lastTrigger = null;
  #scrollLocked = false;
  #originalBodyOverflow = "";

  connect() {
    this.#listeners = new AbortController();
    const { signal } = this.#listeners;

    this.#desktopMedia = window.matchMedia(this.breakpointValue);
    this.#hoverlessMedia = window.matchMedia(HOVERLESS_QUERY);
    this.#desktopMedia.addEventListener("change", () => this.#onBreakpointChange(), { signal });
    this.#hoverlessMedia.addEventListener("change", () => this.syncTooltips(), { signal });

    this.dialogTarget.addEventListener("close", () => this.#onDialogClose(), { signal });
    this.element.addEventListener("turbo:before-morph-attribute", (event) => this.#onBeforeMorphAttribute(event), {
      signal,
    });
    document.addEventListener(MODAL_OPEN_EVENT, (event) => this.#onModalOpen(event), { signal });
    document.addEventListener("turbo:before-cache", () => this.#resetForSnapshot(), { signal });
    document.addEventListener("turbo:before-render", (event) => this.#onBeforeRender(event), { signal });
    document.addEventListener("turbo:render", () => this.#render(), { signal });

    this.#restoreDesktopPreference();
    this.#render();
    this.element.dataset.pathogenSidebarReady = "true";
  }

  disconnect() {
    this.#listeners.abort();
    this.#listeners = null;
    this.#desktopMedia = null;
    this.#flyout.close();
    this.#closeDialog();
    this.#unlockBodyScroll();
    this.#movePanelOutsideDialog();
  }

  // The current presentation: "expanded", "rail", or "offcanvas".
  get mode() {
    return this.#mode;
  }

  // Lets a host drive the desktop state by writing the open value after connect.
  // Stimulus also calls this before connect(), when there is nothing to render yet.
  openValueChanged() {
    if (this.#desktopMedia) this.#render();
  }

  toggleFlyout(event) {
    this.#flyout.toggle(event);
  }

  handleFlyoutTriggerKeydown(event) {
    this.#flyout.handleTriggerKeydown(event);
  }

  handleFlyoutKeydown(event) {
    this.#flyout.handleFlyoutKeydown(event);
  }

  toggle(event) {
    event?.preventDefault();

    if (event?.currentTarget) {
      this.#lastTrigger = event.currentTarget;
    }

    if (this.#isDesktop()) {
      this.openValue = !this.openValue;
      this.#persistDesktopPreference();
      this.#render();
      this.dispatch("toggle", { detail: { open: this.openValue } });
      return;
    }

    if (this.#offcanvasOpen) {
      this.closeOffcanvas();
      return;
    }

    document.dispatchEvent(new CustomEvent(MODAL_OPEN_EVENT, { detail: { controller: this } }));
    this.#offcanvasOpen = true;
    this.#render();
    this.closeTarget.focus();
  }

  closeOffcanvas(event, { restoreFocus = true } = {}) {
    event?.preventDefault();
    if (this.#isDesktop() || !this.#offcanvasOpen) {
      return;
    }

    this.#offcanvasOpen = false;
    this.#render();
    if (restoreFocus) {
      this.#restoreTriggerFocus();
    }
  }

  closeOnBackdrop(event) {
    if (event.target !== this.dialogTarget) return;

    const bounds = this.dialogTarget.getBoundingClientRect();
    const withinDialog =
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom;

    if (!withinDialog) this.closeOffcanvas(event);
  }

  // Rail tooltips are the visible label for icon-only rows. They stay off
  // outside rail mode, on devices that cannot hover (where the first tap would
  // be spent showing the tooltip), and on a trigger whose flyout is open, since
  // the flyout heading already shows the same label in the same place.
  syncTooltips() {
    const unavailable = this.#mode !== "rail" || this.#hoverlessMedia.matches;
    const activeTrigger = this.#flyout.activeTrigger;

    this.tooltipRootTargets.forEach((root) => {
      const disabled = unavailable || root.contains(activeTrigger);
      root.setAttribute("data-pathogen--tooltip-disabled-value", String(disabled));
    });
  }

  #isDesktop() {
    return this.#desktopMedia.matches;
  }

  #render() {
    const desktop = this.#isDesktop();
    const visibleOpen = desktop ? this.openValue : this.#offcanvasOpen;

    if (desktop) {
      this.#mode = visibleOpen ? "expanded" : "rail";
    } else {
      this.#mode = "offcanvas";
    }

    if (this.#mode !== "rail") {
      this.#flyout.close();
    }

    this.element.dataset.pathogenSidebarMode = this.#mode;
    this.element.dataset.pathogenSidebarOpen = String(visibleOpen);

    this.#syncDialogState({ desktop, visibleOpen });
    this.#syncTriggerAttributes({ desktop, visibleOpen });
    this.syncTooltips();
  }

  #onModalOpen(event) {
    if (event.detail.controller === this || !this.#offcanvasOpen) {
      return;
    }

    this.closeOffcanvas(null, { restoreFocus: false });
  }

  // Leaves the DOM in its server-rendered shape: nothing open, and the panel
  // back beside the dialog rather than inside it.
  #resetForSnapshot() {
    this.closeOffcanvas(null, { restoreFocus: false });
    this.#flyout.close();
    this.#movePanelOutsideDialog();
  }

  // A morph compares against server-rendered markup, so hand it that shape and
  // re-apply the live state once it has rendered (see the turbo:render listener).
  #onBeforeRender(event) {
    if (event.detail.renderMethod === "morph") this.#resetForSnapshot();
  }

  #onBeforeMorphAttribute(event) {
    if (this.#ownedAttributes(event.target).includes(event.detail.attributeName)) {
      event.preventDefault();
    }
  }

  #ownedAttributes(element) {
    if (element === this.element) {
      // With cookie persistence the server renders the real state, so its open
      // value is allowed through. Otherwise only the client knows the preference.
      return this.cookieNameValue ? OWNED_PROVIDER_ATTRIBUTES : [...OWNED_PROVIDER_ATTRIBUTES, OPEN_VALUE_ATTRIBUTE];
    }

    if (this.tooltipRootTargets.includes(element)) return OWNED_TOOLTIP_ATTRIBUTES;

    const triggers = [...this.triggerTargets, ...this.closeTargets, ...this.submenuTriggerTargets];
    return triggers.includes(element) ? OWNED_TRIGGER_ATTRIBUTES : [];
  }

  #onBreakpointChange() {
    const focusWasInPanel = this.panelTarget.contains(document.activeElement);
    const movingToDesktop = this.#isDesktop();

    if (movingToDesktop) {
      this.#offcanvasOpen = false;
    }

    this.#render();

    if (!focusWasInPanel) {
      return;
    }

    if (movingToDesktop) {
      this.#focusFirstSidebarItem();
    } else {
      this.#focusAvailableExternalTrigger();
    }
  }

  #onDialogClose() {
    if (!this.#offcanvasOpen) return;

    this.#offcanvasOpen = false;
    this.#render();
    this.#restoreTriggerFocus();
  }

  #restoreDesktopPreference() {
    // A cookie-backed sidebar is already rendered in its persisted state.
    if (this.cookieNameValue || !this.storageKeyValue) return;

    try {
      const stored = window.localStorage.getItem(this.storageKeyValue);
      if (stored === "true") this.openValue = true;
      if (stored === "false") this.openValue = false;
    } catch {
      // Storage may be unavailable in private or restricted browsing contexts.
    }
  }

  #persistDesktopPreference() {
    if (this.cookieNameValue) {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      const name = encodeURIComponent(this.cookieNameValue);
      document.cookie = `${name}=${this.openValue}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
      return;
    }

    if (!this.storageKeyValue) return;

    try {
      window.localStorage.setItem(this.storageKeyValue, String(this.openValue));
    } catch {
      // Storage may be unavailable in private or restricted browsing contexts.
    }
  }

  #syncDialogState({ desktop, visibleOpen }) {
    if (desktop) {
      this.#closeDialog();
      this.#unlockBodyScroll();
      this.#movePanelOutsideDialog();
      return;
    }

    this.#movePanelIntoDialog();

    if (visibleOpen) {
      this.#copyNavigationNameToDialog();
      if (!this.dialogTarget.open) this.dialogTarget.showModal();
      this.#lockBodyScroll();
      return;
    }

    this.#closeDialog();
    this.#unlockBodyScroll();
  }

  #lockBodyScroll() {
    if (this.#scrollLocked) return;

    this.#originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    this.#scrollLocked = true;
  }

  #unlockBodyScroll() {
    if (!this.#scrollLocked) return;

    document.body.style.overflow = this.#originalBodyOverflow;
    this.#scrollLocked = false;
  }

  #copyNavigationNameToDialog() {
    const labelledby = this.sidebarTarget.getAttribute("aria-labelledby");
    const label = this.sidebarTarget.getAttribute("aria-label");
    if (labelledby) {
      this.dialogTarget.setAttribute("aria-labelledby", labelledby);
    } else if (label) {
      this.dialogTarget.setAttribute("aria-label", label);
    }
  }

  #movePanelIntoDialog() {
    if (this.panelTarget.parentElement !== this.dialogTarget) {
      this.dialogTarget.append(this.panelTarget);
    }
  }

  #movePanelOutsideDialog() {
    if (this.panelTarget.parentElement === this.dialogTarget) {
      this.dialogTarget.after(this.panelTarget);
    }
  }

  #closeDialog() {
    if (this.dialogTarget.open) this.dialogTarget.close();

    this.dialogTarget.removeAttribute("aria-label");
    this.dialogTarget.removeAttribute("aria-labelledby");
  }

  #syncTriggerAttributes({ desktop, visibleOpen }) {
    const label = this.#currentTriggerLabel({ desktop, visibleOpen });
    const controlledElement = desktop ? this.panelTarget : this.dialogTarget;

    this.triggerTargets.forEach((trigger) => {
      if (controlledElement.id) {
        trigger.setAttribute("aria-controls", controlledElement.id);
      }
      trigger.setAttribute("aria-expanded", String(visibleOpen));
      trigger.setAttribute("aria-label", label);
      trigger.setAttribute("title", label);
    });

    this.closeTargets.forEach((trigger) => {
      trigger.setAttribute("aria-label", this.closeLabelValue);
      trigger.setAttribute("title", this.closeLabelValue);
    });

    this.submenuTriggerTargets.forEach((trigger) => {
      const flyout = this.#flyout.findFlyoutForTrigger(trigger);
      trigger.setAttribute("aria-expanded", String(this.#flyout.isActiveFor(flyout)));
      if (flyout) {
        trigger.setAttribute("aria-controls", flyout.id);
      }
    });
  }

  #currentTriggerLabel({ desktop, visibleOpen }) {
    if (desktop) {
      return visibleOpen ? this.collapseLabelValue : this.expandLabelValue;
    }

    return visibleOpen ? this.closeLabelValue : this.openLabelValue;
  }

  #restoreTriggerFocus() {
    if (this.#lastTrigger?.isConnected) {
      this.#lastTrigger.focus();
      return;
    }

    this.#focusAvailableExternalTrigger();
  }

  #focusAvailableExternalTrigger() {
    const trigger = this.triggerTargets.find((candidate) => !this.dialogTarget.contains(candidate));
    if (trigger) {
      trigger.focus();
      return;
    }

    if (!this.element.hasAttribute("tabindex")) {
      this.element.setAttribute("tabindex", "-1");
    }
    this.element.focus({ preventScroll: true });
  }

  #focusFirstSidebarItem() {
    (this.sidebarTarget.querySelector(FOCUSABLE) || this.sidebarTarget).focus();
  }
}
