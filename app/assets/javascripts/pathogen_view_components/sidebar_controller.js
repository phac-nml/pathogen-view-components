import { Controller } from "@hotwired/stimulus";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default class SidebarController extends Controller {
  static targets = ["sidebar", "overlay", "liveRegion", "trigger"];

  static values = {
    open: { type: Boolean, default: true },
    breakpoint: { type: String, default: "(min-width: 80rem)" },
    storageKey: { type: String, default: "pathogen.sidebar.sidebar.open" },
    collapseLabel: String,
    expandLabel: String,
    openLabel: String,
    closeLabel: String,
    announceExpanded: String,
    announceRail: String,
    announceOpened: String,
    announceClosed: String,
  };

  initialize() {
    this.offcanvasOpen = false;
    this.lastTrigger = null;
    this.matchMediaList = null;
    this.onBreakpointChange = this.onBreakpointChange.bind(this);
    this.onDocumentKeydown = this.onDocumentKeydown.bind(this);
  }

  connect() {
    this.matchMediaList = window.matchMedia(this.breakpointValue);

    if (typeof this.matchMediaList.addEventListener === "function") {
      this.matchMediaList.addEventListener("change", this.onBreakpointChange);
    } else {
      this.matchMediaList.addListener(this.onBreakpointChange);
    }

    this.restoreDesktopPreference();
    this.applyState({ announce: false, shouldPersist: false });

    document.addEventListener("keydown", this.onDocumentKeydown);
  }

  disconnect() {
    if (this.matchMediaList) {
      if (typeof this.matchMediaList.removeEventListener === "function") {
        this.matchMediaList.removeEventListener("change", this.onBreakpointChange);
      } else {
        this.matchMediaList.removeListener(this.onBreakpointChange);
      }
    }

    document.removeEventListener("keydown", this.onDocumentKeydown);
  }

  toggle(event) {
    event?.preventDefault();

    if (event?.currentTarget) {
      this.lastTrigger = event.currentTarget;
    }

    if (this.isDesktop()) {
      this.openValue = !this.openValue;
      this.applyState({ announce: true, shouldPersist: true });
      return;
    }

    this.offcanvasOpen = !this.offcanvasOpen;
    this.applyState({ announce: true, shouldPersist: false });

    if (this.offcanvasOpen) {
      this.focusSidebar();
    } else {
      this.restoreTriggerFocus();
    }
  }

  closeOffcanvas(event) {
    event?.preventDefault();
    if (this.isDesktop() || !this.offcanvasOpen) {
      return;
    }

    this.offcanvasOpen = false;
    this.applyState({ announce: true, shouldPersist: false });
    this.restoreTriggerFocus();
  }

  onBreakpointChange() {
    if (this.isDesktop()) {
      this.offcanvasOpen = false;
    }

    this.applyState({ announce: false, shouldPersist: false });
  }

  onDocumentKeydown(event) {
    if (!this.offcanvasOpen || this.isDesktop()) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      this.closeOffcanvas();
      return;
    }

    if (event.key !== "Tab" || !this.hasSidebarTarget) {
      return;
    }

    this.trapFocus(event);
  }

  isDesktop() {
    return this.matchMediaList?.matches;
  }

  restoreDesktopPreference() {
    try {
      const stored = window.localStorage.getItem(this.storageKeyValue);
      if (stored === "true") {
        this.openValue = true;
      }
      if (stored === "false") {
        this.openValue = false;
      }
    } catch {
      this.openValue = this.openValue !== false;
    }
  }

  applyState({ announce, shouldPersist }) {
    const desktop = this.isDesktop();
    const visibleOpen = desktop ? this.openValue : this.offcanvasOpen;
    const mode = this.effectiveMode(desktop, visibleOpen);

    this.element.dataset.pathogenSidebarMode = mode;
    this.element.dataset.pathogenSidebarOpen = String(visibleOpen);

    if (this.hasSidebarTarget) {
      this.sidebarTarget.setAttribute("aria-hidden", desktop || visibleOpen ? "false" : "true");
      if (!desktop && !visibleOpen) {
        this.sidebarTarget.setAttribute("inert", "");
      } else {
        this.sidebarTarget.removeAttribute("inert");
      }
    }

    if (this.hasOverlayTarget) {
      this.overlayTarget.classList.toggle("hidden", desktop || !visibleOpen);
      this.overlayTarget.setAttribute("aria-hidden", String(desktop || !visibleOpen));
      this.overlayTarget.tabIndex = desktop || !visibleOpen ? -1 : 0;
    }

    this.syncHtmlOpenData();
    this.syncTriggerAttributes({ desktop, visibleOpen });

    if (shouldPersist && desktop) {
      this.persistDesktopPreference();
    }

    if (announce) {
      this.announce(mode, visibleOpen, desktop);
    }
  }

  effectiveMode(desktop, visibleOpen) {
    if (!desktop) {
      return "offcanvas";
    }

    return visibleOpen ? "expanded" : "rail";
  }

  syncHtmlOpenData() {
    document.documentElement.setAttribute("data-pathogen-sidebar-open", String(this.openValue));
  }

  syncTriggerAttributes({ desktop, visibleOpen }) {
    const label = this.currentTriggerLabel({ desktop, visibleOpen });

    this.triggerTargets.forEach((trigger) => {
      if (this.hasSidebarTarget && this.sidebarTarget.id) {
        trigger.setAttribute("aria-controls", this.sidebarTarget.id);
      }
      trigger.setAttribute("aria-expanded", String(visibleOpen));
      trigger.setAttribute("aria-label", label);
      trigger.setAttribute("title", label);
    });
  }

  currentTriggerLabel({ desktop, visibleOpen }) {
    if (desktop) {
      return visibleOpen ? this.collapseLabelValue : this.expandLabelValue;
    }

    return visibleOpen ? this.closeLabelValue : this.openLabelValue;
  }

  persistDesktopPreference() {
    try {
      window.localStorage.setItem(this.storageKeyValue, String(this.openValue));
    } catch {
      // Ignore storage errors in private browsing contexts.
    }
  }

  announce(mode, visibleOpen, desktop) {
    if (!this.hasLiveRegionTarget) {
      return;
    }

    let text = "";
    if (desktop) {
      text = mode === "expanded" ? this.announceExpandedValue : this.announceRailValue;
    } else {
      text = visibleOpen ? this.announceOpenedValue : this.announceClosedValue;
    }

    this.liveRegionTarget.textContent = "";
    requestAnimationFrame(() => {
      this.liveRegionTarget.textContent = text;
    });
  }

  focusSidebar() {
    if (!this.hasSidebarTarget) {
      return;
    }

    const focusable = this.focusableInSidebar();
    if (focusable.length > 0) {
      focusable[0].focus();
      return;
    }

    this.sidebarTarget.focus();
  }

  restoreTriggerFocus() {
    if (this.lastTrigger && typeof this.lastTrigger.focus === "function") {
      this.lastTrigger.focus();
    }
  }

  trapFocus(event) {
    if (!this.hasSidebarTarget || !this.sidebarTarget.contains(document.activeElement)) {
      return;
    }

    const focusable = this.focusableInSidebar();
    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  }

  focusableInSidebar() {
    if (!this.hasSidebarTarget) {
      return [];
    }

    return Array.from(this.sidebarTarget.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
      if (element.hasAttribute("hidden")) {
        return false;
      }

      return window.getComputedStyle(element).display !== "none";
    });
  }
}
