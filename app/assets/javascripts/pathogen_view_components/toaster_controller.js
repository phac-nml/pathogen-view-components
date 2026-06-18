import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["list", "assertive", "toast"];
  static values = {
    maxVisible: { type: Number, default: 3 },
  };

  #expanded = false;

  connect() {
    this.#applyStack();
  }

  toastTargetConnected() {
    this.#applyStack();
  }

  toastTargetDisconnected() {
    this.#applyStack();
  }

  expand() {
    this.#expanded = true;
    this.#applyStack();
  }

  collapseIfIdle() {
    requestAnimationFrame(() => {
      if (this.element.matches(":hover")) return;
      if (this.element.contains(document.activeElement)) return;

      this.#expanded = false;
      this.#applyStack();
    });
  }

  handleToastDismissed() {
    this.#applyStack();
  }

  announceAssertive(event) {
    if (!this.hasAssertiveTarget) return;

    const message = typeof event?.detail?.message === "string" ? event.detail.message.trim() : "";
    if (message.length === 0) return;

    this.assertiveTarget.textContent = "";
    requestAnimationFrame(() => {
      this.assertiveTarget.textContent = message;
    });
  }

  #applyStack() {
    const toasts = this.toastTargets.filter((toast) => toast.isConnected);
    if (toasts.length === 0) return;

    const maxVisible = this.maxVisibleValue > 0 ? this.maxVisibleValue : 1;
    const hiddenCount = this.#expanded ? 0 : Math.max(0, toasts.length - maxVisible);

    toasts.forEach((toast, index) => {
      const isHiddenOverflow = index < hiddenCount;
      toast.hidden = isHiddenOverflow;
      toast.setAttribute("aria-hidden", isHiddenOverflow ? "true" : "false");
      toast.dataset.collapsed = isHiddenOverflow ? "true" : "false";
    });
  }
}
