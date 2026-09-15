import { Controller } from "@hotwired/stimulus";

import {
  QUEUED_DURATION_PREFERENCE_ATTRIBUTE,
  parseDurationPreference,
} from "pathogen_view_components/toast_duration_preference";

export default class extends Controller {
  static targets = ["message", "description", "dismiss", "action", "dialog"];
  static values = {
    timeout: Number,
    type: String,
    typeLabel: { type: String, default: "" },
    dismissDuration: { type: Number, default: 160 },
    dismissible: { type: Boolean, default: false },
    mode: { type: String, default: "status" },
    interrupt: { type: Boolean, default: false },
    persistent: { type: Boolean, default: false },
  };

  #timerId = null;
  #dismissTimerId = null;
  #startedAt = null;
  #remainingMs = 0;
  #state = "open";
  #restoreFocusElement = null;
  #abortController = null;
  #connected = false;
  #initialDialogIntent = false;
  #presented = false;

  initialize() {
    this.#initialDialogIntent = this.dialogMode;
    this.#remainingMs = this.timeoutValue > 0 && !this.dialogMode ? this.timeoutValue : 0;
  }

  connect() {
    if (this.#state === "closing") {
      this.element.remove();
      return;
    }

    this.#connected = true;
    this.#bindEvents();
    this.#applyQueuedDurationPreference();
    this.#resumeTimer();

    if (!this.#presented) {
      this.dispatch("ready", { prefix: "pathogen:toast", detail: { toast: this } });
    }
  }

  disconnect() {
    this.#connected = false;
    this.#pauseTimer();
    clearTimeout(this.#dismissTimerId);
    this.#dismissTimerId = null;
    this.#abortController?.abort();
    this.#abortController = null;
  }

  get initialDialogIntent() {
    return this.#initialDialogIntent;
  }

  get dialogMode() {
    return this.modeValue === "dialog";
  }

  get awaitingPresentation() {
    return !this.#presented && this.#connected && this.#state === "open";
  }

  // The toaster coordinates first presentation across all arriving notifications.
  present({ focus = false } = {}) {
    if (!this.awaitingPresentation) return;

    this.#presented = true;
    if (focus && this.dialogMode) {
      this.#captureRestoreFocus();
      this.#focusDialog();
      if (document.activeElement === this.dialogTarget) return;
    }

    this.#announce();
  }

  dismiss(event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.#dismiss({ reason: "manual", restoreFocus: true });
  }

  applyDurationPreference(preference, { focus = false } = {}) {
    const parsedPreference = parseDurationPreference(preference);
    if (parsedPreference === null) return;
    if (this.#state !== "open") return;

    if (parsedPreference === 0) {
      this.promoteToDialog({ focus });
      return;
    }

    if (this.dialogMode || parsedPreference === this.timeoutValue) return;

    this.timeoutValue = parsedPreference;
    this.#remainingMs = parsedPreference;
    this.#clearTimer();

    if (this.element.contains(document.activeElement)) return;
    if (this.element.matches(":hover")) return;

    this.#startTimer();
  }

  /** Host / toaster may promote a status toast to a persistent dialog (e.g. duration forever). */
  promoteToDialog({ focus = true } = {}) {
    if (this.dialogMode || this.#state !== "open") return;

    this.modeValue = "dialog";
    this.timeoutValue = 0;
    this.dismissibleValue = true;
    this.persistentValue = true;
    this.#remainingMs = 0;
    this.#clearTimer(true);

    const shell = this.dialogTarget;
    shell.setAttribute("role", "dialog");
    shell.setAttribute("aria-modal", "false");
    shell.tabIndex = -1;
    shell.setAttribute("aria-labelledby", shell.dataset.dialogLabelledby);
    if (shell.dataset.dialogDescribedby) {
      shell.setAttribute("aria-describedby", shell.dataset.dialogDescribedby);
    }

    if (this.hasDismissTarget) {
      this.dismissTarget.hidden = false;
    }

    if (focus) {
      this.#captureRestoreFocus();
      this.#focusDialog();
    }
  }

  #applyQueuedDurationPreference() {
    const raw = this.element.getAttribute(QUEUED_DURATION_PREFERENCE_ATTRIBUTE);
    this.element.removeAttribute(QUEUED_DURATION_PREFERENCE_ATTRIBUTE);
    this.applyDurationPreference(raw);
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

  #captureRestoreFocus() {
    const active = document.activeElement;
    if (active instanceof HTMLElement && !this.element.contains(active) && active !== document.body) {
      this.#restoreFocusElement = active;
    }
  }

  #focusDialog() {
    if (!this.#connected || this.#state !== "open") return;
    this.dialogTarget.focus({ preventScroll: true });
  }

  #startTimer() {
    if (!this.#connected || this.#timerId !== null) return;
    if (this.dialogMode || this.timeoutValue <= 0) return;
    if (this.#state !== "open") return;

    this.#startedAt = Date.now();
    this.#timerId = window.setTimeout(() => {
      this.#dismiss({ reason: "timeout", restoreFocus: false });
    }, this.#remainingMs);
  }

  #pauseTimer() {
    if (this.#timerId === null) return;

    const elapsed = Date.now() - this.#startedAt;
    this.#remainingMs = Math.max(0, this.#remainingMs - elapsed);
    this.#clearTimer();
  }

  #resumeTimer() {
    if (this.dialogMode) return;
    if (this.#state !== "open") return;
    if (this.element.contains(document.activeElement)) return;
    if (this.element.matches(":hover")) return;

    this.#startTimer();
  }

  #clearTimer(resetRemaining = false) {
    if (this.#timerId !== null) {
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

    this.#dismissTimerId = window.setTimeout(() => {
      this.#dismissTimerId = null;
      if (!this.#connected) return;
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
        politeness: this.interruptValue ? "assertive" : "polite",
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
