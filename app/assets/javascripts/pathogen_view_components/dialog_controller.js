import { Controller } from "@hotwired/stimulus";
import { acquireScrollLock, releaseScrollLock } from "pathogen_view_components/scroll_lock";
import { registerModal, unregisterModal } from "pathogen_view_components/modal_stack";
import { updateDialogLayout } from "pathogen_view_components/dialog_controller/layout";

function selectorTarget(scope, selector) {
  if (!selector) return null;
  try {
    return scope.querySelector(selector);
  } catch {
    return null;
  }
}

function canFocus(element) {
  const blocker = element?.closest("[inert], [hidden]");
  const modal = element?.closest("dialog[open]");
  const blocked = blocker && (!modal || modal.contains(blocker) || blocker.hasAttribute("hidden"));
  return (
    element?.isConnected &&
    !element.disabled &&
    !blocked &&
    element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== "hidden" &&
    (element.tabIndex >= 0 || element.hasAttribute("tabindex") || element.isContentEditable) &&
    typeof element.focus === "function"
  );
}

export default class DialogController extends Controller {
  static targets = ["dialog", "panel", "header", "title", "body", "content", "footer"];
  static values = { open: Boolean, initialFocus: String, returnFocus: String };

  initialize() {
    this.connected = false;
    this.trigger = null;
    this.closeReason = "programmatic";
    this.restoreOnClose = true;
    this.modalActive = false;
    this.updateLayout = () => updateDialogLayout(this);
    this.onCancel = this.onCancel.bind(this);
    this.onNativeClose = this.onNativeClose.bind(this);
    this.onBeforeCache = this.onBeforeCache.bind(this);
  }

  connect() {
    this.connected = true;
    this.dialogTarget.addEventListener("cancel", this.onCancel);
    this.dialogTarget.addEventListener("close", this.onNativeClose);
    document.addEventListener("turbo:before-cache", this.onBeforeCache);
    window.addEventListener("resize", this.updateLayout);
    window.visualViewport?.addEventListener("resize", this.updateLayout);
    window.visualViewport?.addEventListener("scroll", this.updateLayout);
    this.resizeObserver = new ResizeObserver(this.updateLayout);
    [this.panelTarget, this.headerTarget, this.contentTarget, ...this.footerTargets].forEach((target) => {
      this.resizeObserver.observe(target);
    });
    if (this.openValue) this.open();
  }

  disconnect() {
    this.connected = false;
    this.close({ restoreFocus: false, reason: "disconnect" });
    this.dialogTarget.removeEventListener("cancel", this.onCancel);
    this.dialogTarget.removeEventListener("close", this.onNativeClose);
    document.removeEventListener("turbo:before-cache", this.onBeforeCache);
    window.removeEventListener("resize", this.updateLayout);
    window.visualViewport?.removeEventListener("resize", this.updateLayout);
    window.visualViewport?.removeEventListener("scroll", this.updateLayout);
    this.resizeObserver?.disconnect();
    releaseScrollLock(this);
  }

  contentTargetConnected(target) {
    this.resizeObserver?.observe(target);
    if (this.connected) this.updateLayout();
  }

  footerTargetConnected(target) {
    this.resizeObserver?.observe(target);
    if (this.connected) this.updateLayout();
  }

  openValueChanged(value) {
    if (!this.connected) return;
    if (value) this.open();
    else this.close();
  }

  openFromTrigger(event) {
    event.preventDefault();
    this.open({ trigger: event.currentTarget });
  }

  open({ trigger = document.activeElement } = {}) {
    if (this.dialogTarget.open) return;
    this.trigger = trigger;
    this.dialogTarget.showModal();
    registerModal(this.dialogTarget);
    this.modalActive = true;
    this.openValue = true;
    acquireScrollLock(this);
    this.updateLayout();
    const selected = selectorTarget(this.dialogTarget, this.initialFocusValue);
    const target = canFocus(selected) ? selected : this.titleTarget;
    target.focus({ preventScroll: true });
    this.updateLayout();
    this.dispatch("opened", { detail: { trigger: this.trigger } });
  }

  requestClose(event = null, { reason = "close-button" } = {}) {
    event?.preventDefault();
    if (!this.dialogTarget.open) return;
    const requestedReason = event?.params?.reason ?? reason;
    const request = this.dispatch("before-close", { cancelable: true, detail: { reason: requestedReason } });
    if (!request.defaultPrevented) this.close({ reason: requestedReason });
  }

  onCancel(event) {
    // Native cancel does not bubble. Let the browser select the topmost modal;
    // this handler only routes its request through the host's dismissal guard.
    event.preventDefault();
    this.requestClose(null, { reason: "escape" });
  }

  close({ restoreFocus = true, reason = "programmatic" } = {}) {
    if (!this.modalActive && !this.dialogTarget.open) return;
    this.restoreOnClose = restoreFocus;
    this.closeReason = reason;
    if (this.dialogTarget.open) this.dialogTarget.close();
    // Finalize synchronously so locks are released during Turbo removal. The
    // browser's queued close event becomes harmless after this completion.
    this.finishClose();
  }

  onNativeClose() {
    // Ignore an old queued close event if the same dialog already reopened.
    if (!this.dialogTarget.open) this.finishClose();
  }

  finishClose() {
    if (!this.modalActive) return;
    this.modalActive = false;
    this.openValue = false;
    unregisterModal(this.dialogTarget);
    releaseScrollLock(this);
    if (this.restoreOnClose) this.restoreFocus();
    this.dispatch("closed", { detail: { reason: this.closeReason } });
    this.closeReason = "programmatic";
    this.restoreOnClose = true;
  }

  restoreFocus() {
    const target = canFocus(this.trigger) ? this.trigger : selectorTarget(document, this.returnFocusValue);
    if (canFocus(target)) target.focus();
    this.trigger = null;
  }

  onBeforeCache() {
    this.close({ restoreFocus: false, reason: "cache" });
  }
}
