import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["list", "polite", "assertive", "toast"];
  static values = {
    maxVisible: { type: Number, default: 3 },
  };

  #expanded = false;
  #queue = { polite: [], assertive: [] };
  #flushHandle = null;

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

  announce(event) {
    const detail = event?.detail ?? {};
    const message = typeof detail.message === "string" ? detail.message.trim() : "";
    if (message.length === 0) return;

    const politeness = detail.politeness === "assertive" ? "assertive" : "polite";
    this.#queue[politeness].push(message);
    this.#scheduleFlush();
  }

  #scheduleFlush() {
    if (this.#flushHandle) return;

    this.#flushHandle = requestAnimationFrame(() => {
      this.#flushHandle = null;
      this.#flushRegion("polite");
      this.#flushRegion("assertive");
    });
  }

  #flushRegion(politeness) {
    const messages = this.#queue[politeness];
    this.#queue[politeness] = [];

    const target = politeness === "assertive" ? this.#assertiveRegion() : this.#politeRegion();
    if (!target || messages.length === 0) return;

    const text = messages
      .map((part, index) => (index < messages.length - 1 && !/[.!?]$/.test(part) ? `${part}.` : part))
      .join(" ");
    // Clear first, then write on the next frame so the region reports a change
    // and re-announces even when the same message repeats.
    target.textContent = "";
    requestAnimationFrame(() => {
      target.textContent = text;
    });
  }

  #politeRegion() {
    return this.hasPoliteTarget ? this.politeTarget : null;
  }

  #assertiveRegion() {
    return this.hasAssertiveTarget ? this.assertiveTarget : null;
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
