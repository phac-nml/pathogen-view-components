import { Controller } from "@hotwired/stimulus";

const ANNOUNCE_DEBOUNCE_MS = 75;

export default class extends Controller {
  static targets = ["polite", "assertive", "toast"];
  static values = {
    maxVisible: { type: Number, default: 3 },
  };

  #expanded = false;
  #queue = { polite: [], assertive: [] };
  #flushTimeout = null;
  #flushHandle = null;

  connect() {
    this.#applyStack();
  }

  disconnect() {
    if (this.#flushTimeout) {
      clearTimeout(this.#flushTimeout);
      this.#flushTimeout = null;
    }
    if (this.#flushHandle) {
      cancelAnimationFrame(this.#flushHandle);
      this.#flushHandle = null;
    }
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
      if (!this.element.isConnected) return;
      if (this.element.matches(":hover")) return;
      if (this.element.contains(document.activeElement)) return;

      this.#expanded = false;
      this.#applyStack();
    });
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
    if (this.#flushTimeout) clearTimeout(this.#flushTimeout);

    this.#flushTimeout = window.setTimeout(() => {
      this.#flushTimeout = null;
      if (!this.element.isConnected) return;

      this.#flushHandle = requestAnimationFrame(() => {
        this.#flushHandle = null;
        if (!this.element.isConnected) return;

        this.#flushRegion("polite");
        this.#flushRegion("assertive");
      });
    }, ANNOUNCE_DEBOUNCE_MS);
  }

  #flushRegion(politeness) {
    const messages = this.#queue[politeness];
    this.#queue[politeness] = [];

    const target = politeness === "assertive" ? this.#assertiveRegion() : this.#politeRegion();
    if (!target || messages.length === 0) return;

    const text = messages
      .map((part, index) => (index < messages.length - 1 && !/[.!?]$/.test(part) ? `${part}.` : part))
      .join(" ");

    this.#writeLiveRegion(target, text);
  }

  #writeLiveRegion(target, text) {
    if (target.textContent === text) {
      // Clear first, then write on the next frame so the region reports a change
      // and re-announces even when the same message repeats.
      target.textContent = "";
      requestAnimationFrame(() => {
        if (!target.isConnected) return;
        target.textContent = text;
      });
      return;
    }

    target.textContent = text;
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
    const hiddenNonPersistentCount = this.#expanded
      ? 0
      : Math.max(0, toasts.filter((toast) => !this.#isPersistent(toast)).length - maxVisible);
    let nonPersistentIndex = 0;

    toasts.forEach((toast) => {
      const isPersistent = this.#isPersistent(toast);
      const isHiddenOverflow = !isPersistent && nonPersistentIndex < hiddenNonPersistentCount;
      if (!isPersistent) nonPersistentIndex += 1;
      toast.hidden = isHiddenOverflow;
      toast.setAttribute("aria-hidden", isHiddenOverflow ? "true" : "false");
    });
  }

  // Persistent toasts are flagged in markup via data-pathogen--toast-persistent-value.
  // timeout <= 0 is a fallback for DOM built without the Ruby component.
  #isPersistent(toast) {
    if (toast.getAttribute("data-pathogen--toast-persistent-value") === "true") return true;

    const timeoutValue = toast.getAttribute("data-pathogen--toast-timeout-value");
    if (timeoutValue === null) return false;

    const timeout = Number(timeoutValue);
    return Number.isFinite(timeout) && timeout <= 0;
  }
}

export { ANNOUNCE_DEBOUNCE_MS };
