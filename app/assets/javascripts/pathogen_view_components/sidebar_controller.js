import { Controller } from "@hotwired/stimulus";

const MODAL_OPEN_EVENT = "pathogen:sidebar:modal-open";

export default class SidebarController extends Controller {
  static targets = ["close", "dialog", "panel", "sidebar", "trigger"];

  static values = {
    open: { type: Boolean, default: true },
    breakpoint: { type: String, default: "(min-width: 80rem)" },
    storageKey: String,
    collapseLabel: String,
    expandLabel: String,
    openLabel: String,
    closeLabel: String,
  };

  initialize() {
    this.offcanvasOpen = false;
    this.lastTrigger = null;
    this.matchMediaList = null;
    this.scrollLocked = false;
    this.originalBodyOverflow = "";
    this.onBreakpointChange = this.onBreakpointChange.bind(this);
    this.onDialogClose = this.onDialogClose.bind(this);
    this.onModalOpen = this.onModalOpen.bind(this);
    this.onBeforeCache = this.onBeforeCache.bind(this);
  }

  connect() {
    this.matchMediaList = window.matchMedia(this.breakpointValue);

    if (typeof this.matchMediaList.addEventListener === "function") {
      this.matchMediaList.addEventListener("change", this.onBreakpointChange);
    } else {
      this.matchMediaList.addListener(this.onBreakpointChange);
    }

    this.restoreDesktopPreference();
    this.applyState({ shouldPersist: false });

    this.dialogTarget.addEventListener("close", this.onDialogClose);
    document.addEventListener(MODAL_OPEN_EVENT, this.onModalOpen);
    document.addEventListener("turbo:before-cache", this.onBeforeCache);
  }

  disconnect() {
    if (this.matchMediaList) {
      if (typeof this.matchMediaList.removeEventListener === "function") {
        this.matchMediaList.removeEventListener("change", this.onBreakpointChange);
      } else {
        this.matchMediaList.removeListener(this.onBreakpointChange);
      }
    }

    this.dialogTarget.removeEventListener("close", this.onDialogClose);
    document.removeEventListener(MODAL_OPEN_EVENT, this.onModalOpen);
    document.removeEventListener("turbo:before-cache", this.onBeforeCache);
    this.closeDialog();
    this.unlockBodyScroll();
    this.movePanelOutsideDialog();
  }

  toggle(event) {
    event?.preventDefault();

    if (event?.currentTarget) {
      this.lastTrigger = event.currentTarget;
    }

    if (this.isDesktop()) {
      this.openValue = !this.openValue;
      this.applyState({ shouldPersist: true });
      return;
    }

    if (this.offcanvasOpen) {
      this.closeOffcanvas();
      return;
    }

    document.dispatchEvent(new CustomEvent(MODAL_OPEN_EVENT, { detail: { controller: this } }));
    this.offcanvasOpen = true;
    this.applyState({ shouldPersist: false });
    this.focusCloseControl();
  }

  closeOffcanvas(event, { restoreFocus = true } = {}) {
    event?.preventDefault();
    if (this.isDesktop() || !this.offcanvasOpen) {
      return;
    }

    this.offcanvasOpen = false;
    this.applyState({ shouldPersist: false });
    if (restoreFocus) {
      this.restoreTriggerFocus();
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

  onModalOpen(event) {
    if (event.detail?.controller === this || !this.offcanvasOpen) {
      return;
    }

    this.closeOffcanvas(null, { restoreFocus: false });
  }

  onBeforeCache() {
    if (this.offcanvasOpen) {
      this.closeOffcanvas(null, { restoreFocus: false });
    }

    this.movePanelOutsideDialog();
  }

  onBreakpointChange() {
    const focusWasInPanel = this.hasPanelTarget && this.panelTarget.contains(document.activeElement);
    const movingToDesktop = this.isDesktop();

    if (movingToDesktop) {
      this.offcanvasOpen = false;
    }

    this.applyState({ shouldPersist: false });

    if (!focusWasInPanel) {
      return;
    }

    if (movingToDesktop) {
      this.focusFirstSidebarItem();
    } else {
      this.focusAvailableExternalTrigger();
    }
  }

  onDialogClose() {
    if (!this.offcanvasOpen) return;

    this.offcanvasOpen = false;
    this.applyState({ shouldPersist: false });
    this.restoreTriggerFocus();
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

  applyState({ shouldPersist }) {
    const desktop = this.isDesktop();
    const visibleOpen = desktop ? this.openValue : this.offcanvasOpen;
    const mode = desktop ? (visibleOpen ? "expanded" : "rail") : "offcanvas";

    this.element.dataset.pathogenSidebarMode = mode;
    this.element.dataset.pathogenSidebarOpen = String(visibleOpen);

    this.syncDialogState({ desktop, visibleOpen });

    this.syncHtmlOpenData();
    this.syncTriggerAttributes({ desktop, visibleOpen });

    if (shouldPersist && desktop) {
      this.persistDesktopPreference();
    }
  }

  syncDialogState({ desktop, visibleOpen }) {
    if (!this.hasDialogTarget || !this.hasPanelTarget) {
      return;
    }

    if (desktop) {
      this.closeDialog();
      this.unlockBodyScroll();
      this.movePanelOutsideDialog();
      return;
    }

    this.movePanelIntoDialog();

    if (visibleOpen) {
      this.copyNavigationNameToDialog();
      if (!this.dialogTarget.open) this.dialogTarget.showModal();
      this.lockBodyScroll();
      return;
    }

    this.closeDialog();
    this.unlockBodyScroll();
  }

  lockBodyScroll() {
    if (this.scrollLocked) return;

    this.originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    this.scrollLocked = true;
  }

  unlockBodyScroll() {
    if (!this.scrollLocked) return;

    document.body.style.overflow = this.originalBodyOverflow;
    this.scrollLocked = false;
  }

  copyNavigationNameToDialog() {
    if (!this.hasSidebarTarget) {
      return;
    }

    const labelledby = this.sidebarTarget.getAttribute("aria-labelledby");
    const label = this.sidebarTarget.getAttribute("aria-label");
    if (labelledby) {
      this.dialogTarget.setAttribute("aria-labelledby", labelledby);
    } else if (label) {
      this.dialogTarget.setAttribute("aria-label", label);
    }
  }

  movePanelIntoDialog() {
    if (this.panelTarget.parentElement !== this.dialogTarget) {
      this.dialogTarget.append(this.panelTarget);
    }
  }

  movePanelOutsideDialog() {
    if (this.panelTarget.parentElement === this.dialogTarget && this.dialogTarget.parentElement) {
      this.dialogTarget.after(this.panelTarget);
    }
  }

  closeDialog() {
    if (this.dialogTarget.open) this.dialogTarget.close();

    this.dialogTarget.removeAttribute("aria-label");
    this.dialogTarget.removeAttribute("aria-labelledby");
  }

  syncHtmlOpenData() {
    document.documentElement.setAttribute("data-pathogen-sidebar-open", String(this.openValue));
    document.documentElement.setAttribute("data-pathogen-sidebar-viewport", this.isDesktop() ? "desktop" : "mobile");
  }

  syncTriggerAttributes({ desktop, visibleOpen }) {
    const label = this.currentTriggerLabel({ desktop, visibleOpen });
    const controlledElement = desktop ? this.panelTarget : this.dialogTarget;

    this.triggerTargets.forEach((trigger) => {
      if (controlledElement?.id) {
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
      // Storage may be unavailable in private or restricted browsing contexts.
    }
  }

  focusCloseControl() {
    if (this.hasCloseTarget) {
      this.closeTarget.focus();
    }
  }

  restoreTriggerFocus() {
    if (this.lastTrigger?.isConnected && typeof this.lastTrigger.focus === "function") {
      this.lastTrigger.focus();
      return;
    }

    this.focusAvailableExternalTrigger();
  }

  focusAvailableExternalTrigger() {
    const trigger = this.triggerTargets.find((candidate) => !this.dialogTarget?.contains(candidate));
    trigger?.focus();
  }

  focusFirstSidebarItem() {
    const first = this.sidebarTarget.querySelector(
      "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])",
    );
    if (first) {
      first.focus();
      return;
    }

    this.sidebarTarget?.focus();
  }
}
