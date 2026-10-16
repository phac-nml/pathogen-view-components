import { Controller } from "@hotwired/stimulus";
import { updateDialogLayout } from "pathogen_view_components/dialog_controller/layout";
import { DialogSession } from "pathogen_view_components/dialog_controller/session";

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
    !element.matches(":disabled") &&
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
    this.session = null;
    this.updateLayout = () => {
      if (this.hasDialogTarget) updateDialogLayout(this);
    };
    this.onCancel = this.onCancel.bind(this);
    this.onNativeClose = this.onNativeClose.bind(this);
    this.onBeforeCache = this.onBeforeCache.bind(this);
  }

  connect() {
    this.connected = true;
    document.addEventListener("turbo:before-cache", this.onBeforeCache);
    window.addEventListener("resize", this.updateLayout);
    window.visualViewport?.addEventListener("resize", this.updateLayout);
    window.visualViewport?.addEventListener("scroll", this.updateLayout);
    this.resizeObserver = new ResizeObserver(this.updateLayout);
    this.observeLayout();
    if (this.openValue) this.open();
  }

  disconnect() {
    this.connected = false;
    this.close({ restoreFocus: false, reason: "disconnect" });
    document.removeEventListener("turbo:before-cache", this.onBeforeCache);
    window.removeEventListener("resize", this.updateLayout);
    window.visualViewport?.removeEventListener("resize", this.updateLayout);
    window.visualViewport?.removeEventListener("scroll", this.updateLayout);
    this.resizeObserver?.disconnect();
  }

  dialogTargetConnected(target) {
    target.addEventListener("cancel", this.onCancel);
    target.addEventListener("close", this.onNativeClose);
    if (this.connected) this.observeLayout();
  }

  dialogTargetDisconnected(target) {
    target.removeEventListener("cancel", this.onCancel);
    target.removeEventListener("close", this.onNativeClose);
    if (this.session?.dialog === target) this.close({ restoreFocus: false, reason: "disconnect" });
    if (this.connected) this.resizeObserver.disconnect();
  }

  observeLayout() {
    [...this.panelTargets, ...this.headerTargets, ...this.contentTargets, ...this.footerTargets].forEach((target) => {
      this.resizeObserver.observe(target);
    });
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
    if (!this.hasDialogTarget || this.dialogTarget.open) return;

    // Native close events are queued; release their session before reopening.
    this.session?.close({ restoreFocus: false });
    // A host's closed-event listener may already have opened or removed the dialog.
    if (!this.hasDialogTarget || this.dialogTarget.open) return;

    const session = new DialogSession({
      dialog: this.dialogTarget,
      trigger,
      onClose: (details) => this.handleSessionClose(session, details),
    });
    this.session = session;
    session.open();
    this.openValue = true;
    this.updateLayout();
    const selected = selectorTarget(this.dialogTarget, this.initialFocusValue);
    const target = canFocus(selected) ? selected : this.titleTarget;
    target.focus({ preventScroll: true });
    this.updateLayout();
    this.dispatch("opened", { detail: { trigger } });
  }

  requestClose(event = null, { reason = "close-button" } = {}) {
    event?.preventDefault();
    if (!this.hasDialogTarget || !this.dialogTarget.open) return;
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
    if (this.session) {
      this.session.close({ restoreFocus, reason });
    } else if (this.hasDialogTarget && this.dialogTarget.open) {
      this.dialogTarget.close();
    }
  }

  onNativeClose() {
    // Ignore an old queued close event if the same dialog already reopened.
    this.session?.nativeClose();
  }

  handleSessionClose(session, { reason, restoreFocus, trigger }) {
    if (this.session !== session) return;

    this.session = null;
    this.openValue = false;
    if (restoreFocus) this.restoreFocus(trigger);
    this.dispatch("closed", { detail: { reason } });
  }

  restoreFocus(trigger) {
    const target = canFocus(trigger) ? trigger : selectorTarget(document, this.returnFocusValue);
    if (canFocus(target)) target.focus();
  }

  onBeforeCache() {
    this.close({ restoreFocus: false, reason: "cache" });
  }
}
