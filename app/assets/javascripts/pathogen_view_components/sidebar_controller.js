import { Controller } from "@hotwired/stimulus";

const MODAL_OPEN_EVENT = "pathogen:sidebar:modal-open";

export default class SidebarController extends Controller {
  static targets = ["close", "dialog", "flyout", "panel", "sidebar", "submenuTrigger", "trigger"];

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
    this.activeFlyout = null;
    this.activeFlyoutTrigger = null;
    this.onBreakpointChange = this.onBreakpointChange.bind(this);
    this.onDocumentPointerDown = this.onDocumentPointerDown.bind(this);
    this.onDocumentKeyDown = this.onDocumentKeyDown.bind(this);
    this.onViewportReflow = this.onViewportReflow.bind(this);
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
    document.addEventListener("pointerdown", this.onDocumentPointerDown);
    document.addEventListener("keydown", this.onDocumentKeyDown);
    window.addEventListener("resize", this.onViewportReflow, { passive: true });
    window.addEventListener("scroll", this.onViewportReflow, true);
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
    document.removeEventListener("pointerdown", this.onDocumentPointerDown);
    document.removeEventListener("keydown", this.onDocumentKeyDown);
    window.removeEventListener("resize", this.onViewportReflow);
    window.removeEventListener("scroll", this.onViewportReflow, true);
    document.removeEventListener(MODAL_OPEN_EVENT, this.onModalOpen);
    document.removeEventListener("turbo:before-cache", this.onBeforeCache);
    this.closeFlyout({ restoreFocus: false });
    this.closeDialog();
    this.unlockBodyScroll();
    this.movePanelOutsideDialog();
  }

  toggleFlyout(event) {
    event?.preventDefault();
    if (!this.isRailMode()) return;

    const trigger = event?.currentTarget;
    const flyout = this.findFlyoutForTrigger(trigger);
    if (!trigger || !flyout) return;

    if (this.activeFlyout === flyout) {
      this.closeFlyout({ restoreFocus: true });
      return;
    }

    this.openFlyout(trigger, flyout);
  }

  handleFlyoutTriggerKeydown(event) {
    if (!this.isRailMode()) return;

    const openDirection = this.isRtl() ? "ArrowLeft" : "ArrowRight";
    const closeDirection = this.isRtl() ? "ArrowRight" : "ArrowLeft";

    if (event.key === openDirection) {
      event.preventDefault();
      this.toggleFlyout(event);
      this.focusFirstFlyoutItem();
      return;
    }

    if (event.key === closeDirection || event.key === "Escape") {
      if (!this.activeFlyout) return;

      event.preventDefault();
      this.closeFlyout({ restoreFocus: true });
    }
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

    this.closeFlyout({ restoreFocus: false });

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

  onDocumentPointerDown(event) {
    if (!this.activeFlyout) return;
    if (this.activeFlyout.contains(event.target)) return;
    if (this.activeFlyoutTrigger?.contains(event.target)) return;

    this.closeFlyout({ restoreFocus: false });
  }

  onDocumentKeyDown(event) {
    if (event.key !== "Escape" || !this.activeFlyout) return;

    event.preventDefault();
    this.closeFlyout({ restoreFocus: true });
  }

  onViewportReflow() {
    if (!this.activeFlyout || !this.activeFlyoutTrigger) {
      return;
    }

    if (!this.isRailMode()) {
      this.closeFlyout({ restoreFocus: false });
      return;
    }

    this.positionFlyout(this.activeFlyoutTrigger, this.activeFlyout);
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

    if (mode !== "rail") {
      this.closeFlyout({ restoreFocus: false });
    }

    this.element.dataset.pathogenSidebarMode = mode;
    this.element.dataset.pathogenSidebarOpen = String(visibleOpen);

    this.syncDialogState({ desktop, visibleOpen });

    this.syncTriggerAttributes({ desktop, visibleOpen });
    this.syncSidebarTooltips({ mode });

    this.element.removeAttribute("data-pathogen-sidebar-boot-open");
    this.element.removeAttribute("data-pathogen-sidebar-boot-viewport");

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

    this.submenuTriggerTargets.forEach((trigger) => {
      const flyout = this.findFlyoutForTrigger(trigger);
      trigger.setAttribute("aria-expanded", String(this.activeFlyout === flyout));
      if (flyout?.id) {
        trigger.setAttribute("aria-controls", flyout.id);
      }
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
    if (trigger) {
      trigger.focus();
      return;
    }

    if (!this.element.hasAttribute("tabindex")) {
      this.element.setAttribute("tabindex", "-1");
    }
    this.element.focus({ preventScroll: true });
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

  syncSidebarTooltips({ mode }) {
    const disableTooltips = mode !== "rail";
    const roots = this.element.querySelectorAll(".pathogen-sidebar-item__tooltip-root");

    roots.forEach((root) => {
      root.setAttribute("data-pathogen--tooltip-disabled-value", String(disableTooltips));
    });
  }

  openFlyout(trigger, flyout) {
    this.closeFlyout({ restoreFocus: false });

    this.activeFlyout = flyout;
    this.activeFlyoutTrigger = trigger;

    flyout.hidden = false;
    flyout.dataset.state = "open";
    trigger.setAttribute("aria-expanded", "true");
    this.positionFlyout(trigger, flyout);
  }

  closeFlyout({ restoreFocus } = { restoreFocus: false }) {
    if (!this.activeFlyout) {
      return;
    }

    const trigger = this.activeFlyoutTrigger;

    this.activeFlyout.hidden = true;
    delete this.activeFlyout.dataset.state;
    this.activeFlyout.style.removeProperty("top");
    this.activeFlyout.style.removeProperty("left");
    this.activeFlyout.style.removeProperty("right");

    if (trigger?.isConnected) {
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus && typeof trigger.focus === "function") {
        trigger.focus();
      }
    }

    this.activeFlyout = null;
    this.activeFlyoutTrigger = null;
  }

  focusFirstFlyoutItem() {
    if (!this.activeFlyout) return;

    const first = this.activeFlyout.querySelector("a[href], button:not(:disabled), [tabindex]:not([tabindex='-1'])");
    first?.focus();
  }

  findFlyoutForTrigger(trigger) {
    const id = trigger?.dataset?.pathogenSidebarFlyoutId;
    if (!id) return null;

    return this.flyoutTargets.find((candidate) => candidate.id === id) || null;
  }

  isRailMode() {
    return this.isDesktop() && this.element.dataset.pathogenSidebarMode === "rail";
  }

  positionFlyout(trigger, flyout) {
    const triggerRect = trigger.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 8;
    const isRtl = this.isRtl();

    const width = Math.min(288, window.innerWidth - viewportPadding * 2);
    flyout.style.maxWidth = `${width}px`;

    const measuredHeight = flyout.getBoundingClientRect().height;
    const maxTop = Math.max(viewportPadding, window.innerHeight - measuredHeight - viewportPadding);
    const top = Math.min(Math.max(triggerRect.top, viewportPadding), maxTop);

    flyout.style.top = `${top}px`;

    if (isRtl) {
      const right = Math.max(viewportPadding, window.innerWidth - triggerRect.left + gap);
      flyout.style.right = `${right}px`;
      flyout.style.removeProperty("left");
      return;
    }

    const left = Math.max(viewportPadding, triggerRect.right + gap);
    flyout.style.left = `${left}px`;
    flyout.style.removeProperty("right");
  }

  isRtl() {
    return document.documentElement.dir === "rtl";
  }
}
