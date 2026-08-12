import { Controller } from "@hotwired/stimulus";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "iframe",
  "object",
  "embed",
  "summary",
  "[contenteditable]",
  "[tabindex]",
].join(",");

const MODAL_OPEN_EVENT = "pathogen:sidebar:modal-open";

export default class SidebarController extends Controller {
  static targets = ["close", "dialog", "overlay", "sidebar", "trigger"];

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
    this.modalActive = false;
    this.inertedElements = new Set();
    this.originalBodyOverflow = "";
    this.onBreakpointChange = this.onBreakpointChange.bind(this);
    this.onDocumentKeydown = this.onDocumentKeydown.bind(this);
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

    document.addEventListener("keydown", this.onDocumentKeydown);
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

    document.removeEventListener("keydown", this.onDocumentKeydown);
    document.removeEventListener(MODAL_OPEN_EVENT, this.onModalOpen);
    document.removeEventListener("turbo:before-cache", this.onBeforeCache);
    this.deactivateModal();
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
    this.focusDialog();
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

  onModalOpen(event) {
    if (event.detail?.controller === this || !this.offcanvasOpen) {
      return;
    }

    this.closeOffcanvas(null, { restoreFocus: false });
  }

  onBeforeCache() {
    if (!this.offcanvasOpen) {
      return;
    }

    this.closeOffcanvas(null, { restoreFocus: false });
  }

  onBreakpointChange() {
    const focusWasInDialog = this.hasDialogTarget && this.dialogTarget.contains(document.activeElement);
    const movingToDesktop = this.isDesktop();

    if (movingToDesktop) {
      this.offcanvasOpen = false;
    }

    this.applyState({ shouldPersist: false });

    if (!focusWasInDialog) {
      return;
    }

    if (movingToDesktop) {
      this.focusFirstSidebarItem();
    } else {
      this.focusAvailableExternalTrigger();
    }
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

    if (event.key === "Tab") {
      this.trapFocus(event);
    }
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

    if (this.hasOverlayTarget) {
      this.overlayTarget.classList.toggle("hidden", desktop || !visibleOpen);
      this.overlayTarget.setAttribute("aria-hidden", "true");
    }

    this.syncHtmlOpenData();
    this.syncTriggerAttributes({ desktop, visibleOpen });

    if (shouldPersist && desktop) {
      this.persistDesktopPreference();
    }
  }

  syncDialogState({ desktop, visibleOpen }) {
    if (!this.hasDialogTarget) {
      return;
    }

    if (!desktop && visibleOpen) {
      this.dialogTarget.removeAttribute("aria-hidden");
      this.dialogTarget.removeAttribute("inert");
      this.activateModal();
      return;
    }

    this.deactivateModal();
    if (desktop) {
      this.dialogTarget.removeAttribute("aria-hidden");
      this.dialogTarget.removeAttribute("inert");
    } else {
      this.dialogTarget.setAttribute("aria-hidden", "true");
      this.dialogTarget.setAttribute("inert", "");
    }
  }

  activateModal() {
    this.dialogTarget.setAttribute("role", "dialog");
    this.dialogTarget.setAttribute("aria-modal", "true");
    this.copyNavigationNameToDialog();

    if (this.modalActive) {
      return;
    }

    this.modalActive = true;
    this.inertOutsideDialog();
    this.originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  deactivateModal() {
    if (this.hasDialogTarget) {
      this.dialogTarget.removeAttribute("role");
      this.dialogTarget.removeAttribute("aria-modal");
      this.dialogTarget.removeAttribute("aria-label");
      this.dialogTarget.removeAttribute("aria-labelledby");
    }

    if (!this.modalActive) {
      return;
    }

    this.inertedElements.forEach((element) => element.removeAttribute("inert"));
    this.inertedElements.clear();
    document.body.style.overflow = this.originalBodyOverflow;
    this.modalActive = false;
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

  inertOutsideDialog() {
    let branch = this.dialogTarget;
    const overlay = this.hasOverlayTarget ? this.overlayTarget : null;

    while (branch.parentElement) {
      const parent = branch.parentElement;
      Array.from(parent.children).forEach((sibling) => {
        if (sibling === branch || sibling === overlay || sibling.hasAttribute("inert")) {
          return;
        }

        sibling.setAttribute("inert", "");
        this.inertedElements.add(sibling);
      });

      if (parent === document.body) {
        break;
      }
      branch = parent;
    }
  }

  syncHtmlOpenData() {
    document.documentElement.setAttribute("data-pathogen-sidebar-open", String(this.openValue));
    document.documentElement.setAttribute("data-pathogen-sidebar-viewport", this.isDesktop() ? "desktop" : "mobile");
  }

  syncTriggerAttributes({ desktop, visibleOpen }) {
    const label = this.currentTriggerLabel({ desktop, visibleOpen });

    this.triggerTargets.forEach((trigger) => {
      if (this.hasDialogTarget && this.dialogTarget.id) {
        trigger.setAttribute("aria-controls", this.dialogTarget.id);
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

  focusDialog() {
    if (this.hasCloseTarget) {
      this.closeTarget.focus();
      return;
    }

    this.dialogTarget?.focus();
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
    const first = this.focusableIn(this.sidebarTarget)[0];
    if (first) {
      first.focus();
      return;
    }

    this.sidebarTarget?.focus();
  }

  trapFocus(event) {
    if (!this.hasDialogTarget) {
      return;
    }

    const focusable = this.focusableIn(this.dialogTarget);
    if (focusable.length === 0) {
      event.preventDefault();
      this.dialogTarget.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!this.dialogTarget.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  }

  focusableIn(container) {
    if (!container) {
      return [];
    }

    const candidates = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) =>
      this.isTabbable(element),
    );

    return candidates.filter((element) => {
      if (element.tagName !== "INPUT" || element.type !== "radio" || !element.name) {
        return true;
      }

      const group = candidates.filter(
        (candidate) =>
          candidate.tagName === "INPUT" &&
          candidate.type === "radio" &&
          candidate.name === element.name &&
          candidate.form === element.form,
      );
      return (group.find((radio) => radio.checked) || group[0]) === element;
    });
  }

  isTabbable(element) {
    if (element.tabIndex < 0 || element.matches(":disabled") || element.closest("[hidden], [inert]")) {
      return false;
    }

    const closedDetails = element.closest("details:not([open])");
    if (closedDetails && closedDetails.querySelector(":scope > summary") !== element) {
      return false;
    }

    for (
      let current = element;
      current && current !== this.dialogTarget.parentElement;
      current = current.parentElement
    ) {
      const style = window.getComputedStyle(current);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }
    }

    return true;
  }
}
