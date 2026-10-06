import { acquireScrollLock, releaseScrollLock } from "pathogen_view_components/scroll_lock";
import { registerModal, unregisterModal } from "pathogen_view_components/modal_stack";

export class DialogSession {
  constructor({ dialog, trigger, onClose }) {
    this.dialog = dialog;
    this.trigger = trigger;
    this.onClose = onClose;
    this.active = false;
  }

  open() {
    if (this.dialog.open) return false;

    this.dialog.showModal();
    this.active = true;
    registerModal(this.dialog);
    acquireScrollLock(this);
    return true;
  }

  close({ restoreFocus = true, reason = "programmatic" } = {}) {
    if (!this.active && !this.dialog.open) return false;

    if (this.dialog.open) this.dialog.close();
    this.finish(reason, restoreFocus);
    return true;
  }

  nativeClose() {
    if (!this.dialog.open) this.finish();
  }

  finish(reason = "programmatic", restoreFocus = true) {
    if (!this.active) return;

    this.active = false;
    unregisterModal(this.dialog);
    releaseScrollLock(this);
    this.onClose({ reason, restoreFocus, trigger: this.trigger });
  }
}
