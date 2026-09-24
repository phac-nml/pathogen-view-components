import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["message", "description"];
  static values = {
    timeout: Number,
    type: String,
    typeLabel: { type: String, default: "" },
    dismissDuration: { type: Number, default: 160 },
    dismissible: { type: Boolean, default: true },
  };

  #timerId = null;
  #startedAt = null;
  #remainingMs = 0;
  #state = "open";
  #restoreFocusElement = null;
  #abortController = null;

  connect() {
    this.#remainingMs = this.timeoutValue > 0 ? this.timeoutValue : 0;
    this.#bindEvents();
    this.#startTimer();
    this.#announce();
  }

  disconnect() {
    this.#clearTimer();
    this.#abortController?.abort();
    this.#abortController = null;
  }

  dismiss(event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.#dismiss({ reason: "manual", restoreFocus: true });
  }

  #bindEvents() {
    this.#abortController?.abort();
    this.#abortController = new AbortController();
    const { signal } = this.#abortController;

    this.element.addEventListener("mouseenter", () => this.#pauseTimer(), { signal });
    this.element.addEventListener("mouseleave", () => this.#resumeTimer(), { signal });

    this.element.addEventListener(
      "focusin",
      (event) => {
        const previous = event.relatedTarget;
        if (previous instanceof HTMLElement && !this.element.contains(previous) && previous !== document.body) {
          this.#restoreFocusElement = previous;
        }
        this.#pauseTimer();
      },
      { signal },
    );

    this.element.addEventListener(
      "focusout",
      (event) => {
        if (event.relatedTarget instanceof HTMLElement && this.element.contains(event.relatedTarget)) return;
        this.#resumeTimer();
      },
      { signal },
    );

    this.element.addEventListener("keydown", (event) => this.#handleKeydown(event), { signal });
  }

  #handleKeydown(event) {
    if (event.key !== "Escape") return;
    if (!this.dismissibleValue) return;
    if (!this.element.contains(document.activeElement)) return;

    event.preventDefault();
    event.stopPropagation();
    this.#dismiss({ reason: "escape", restoreFocus: true });
  }

  #startTimer() {
    if (this.#remainingMs <= 0) return;
    if (this.#state !== "open") return;

    this.#clearTimer();
    this.#startedAt = Date.now();
    this.#timerId = window.setTimeout(() => {
      this.#dismiss({ reason: "timeout", restoreFocus: false });
    }, this.#remainingMs);
  }

  #pauseTimer() {
    if (!this.#timerId || this.#remainingMs <= 0) return;

    this.#clearTimer(false);
    const elapsed = Date.now() - (this.#startedAt || Date.now());
    this.#remainingMs = Math.max(0, this.#remainingMs - elapsed);
  }

  #resumeTimer() {
    if (this.#remainingMs <= 0) return;
    if (this.#state !== "open") return;
    if (this.element.contains(document.activeElement)) return;
    if (this.element.matches(":hover")) return;

    this.#startTimer();
  }

  #clearTimer(resetRemaining = false) {
    if (this.#timerId) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }
    this.#startedAt = null;
    if (resetRemaining) this.#remainingMs = 0;
  }

  #dismiss({ reason, restoreFocus }) {
    if (this.#state === "closing") return;

    this.#state = "closing";
    this.#clearTimer(true);
    this.element.dataset.state = "closing";

    const restoreTarget = restoreFocus ? this.#resolveRestoreFocusTarget() : null;
    const duration = this.#dismissDuration();

    window.setTimeout(() => {
      const parent = this.element.parentElement;
      if (parent) {
        this.dispatch("dismissed", {
          prefix: "pathogen:toast",
          target: parent,
          detail: { reason },
        });
      }
      this.element.remove();

      if (restoreTarget?.isConnected) {
        restoreTarget.focus({ preventScroll: true });
      }
    }, duration);
  }

  #dismissDuration() {
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reducedMotion) return 0;
    return this.dismissDurationValue > 0 ? this.dismissDurationValue : 160;
  }

  #resolveRestoreFocusTarget() {
    if (this.#restoreFocusElement?.isConnected) return this.#restoreFocusElement;
    return null;
  }

  #announce() {
    const message = this.#announcementMessage();
    if (!message) return;

    this.dispatch("announce", {
      prefix: "pathogen:toast",
      detail: {
        message,
        politeness: this.typeValue === "error" ? "assertive" : "polite",
      },
    });
  }

  #announcementMessage() {
    const bodyParts = [];

    if (this.hasMessageTarget) {
      const text = this.messageTarget.textContent?.trim();
      if (text) bodyParts.push(text);
    }

    if (this.hasDescriptionTarget) {
      const text = this.descriptionTarget.textContent?.trim();
      if (text) bodyParts.push(text);
    }

    const content = bodyParts
      .map((part, index) => (index < bodyParts.length - 1 && !/[.!?]$/.test(part) ? `${part}.` : part))
      .join(" ");

    const typeLabel = this.typeLabelValue?.trim();
    if (!typeLabel) return content || null;
    if (!content) return typeLabel;

    const escapedTypeLabel = typeLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const prefixedPattern = new RegExp(`^${escapedTypeLabel}(?:\\b|\\s*[:.!?])`, "i");
    if (prefixedPattern.test(content)) return content;

    return `${typeLabel}: ${content}`;
  }
}
