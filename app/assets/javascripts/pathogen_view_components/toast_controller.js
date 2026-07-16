import { Controller } from "@hotwired/stimulus";

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
  #startedAt = null;
  #remainingMs = 0;
  #state = "open";
  #restoreFocusElement = null;
  #abortController = null;

  connect() {
    this.#applyHostDurationPreference();
    this.#remainingMs = this.timeoutValue > 0 && !this.dialogMode ? this.timeoutValue : 0;
    this.#bindEvents();
    this.#startTimer();

    if (this.dialogMode) {
      this.#captureRestoreFocus();
      this.#focusDialog();
      return;
    }

    this.#announce();
  }

  disconnect() {
    this.#clearTimer();
    this.#abortController?.abort();
    this.#abortController = null;
  }

  get dialogMode() {
    return this.modeValue === "dialog";
  }

  dismiss(event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.#dismiss({ reason: "manual", restoreFocus: true });
  }

  /** Host / toaster may promote a status toast to a persistent dialog (e.g. duration forever). */
  promoteToDialog({ focus = true } = {}) {
    if (this.dialogMode) return;

    this.modeValue = "dialog";
    this.timeoutValue = 0;
    this.dismissibleValue = true;
    this.persistentValue = true;
    this.#remainingMs = 0;
    this.#clearTimer(true);

    this.element.setAttribute("role", "listitem");
    this.element.removeAttribute("aria-modal");
    this.element.removeAttribute("aria-labelledby");
    this.element.removeAttribute("tabindex");

    if (!this.hasDialogTarget) {
      const shell = document.createElement("div");
      shell.setAttribute("role", "dialog");
      shell.setAttribute("aria-modal", "false");
      shell.tabIndex = -1;
      shell.setAttribute("data-pathogen--toast-target", "dialog");
      if (this.hasMessageTarget) {
        shell.setAttribute("aria-labelledby", this.messageTarget.id);
      }
      while (this.element.firstChild) {
        shell.appendChild(this.element.firstChild);
      }
      this.element.appendChild(shell);
    } else {
      this.dialogTarget.setAttribute("role", "dialog");
      this.dialogTarget.setAttribute("aria-modal", "false");
      this.dialogTarget.tabIndex = -1;
      if (this.hasMessageTarget) {
        this.dialogTarget.setAttribute("aria-labelledby", this.messageTarget.id);
      }
    }

    if (this.hasDismissTarget) {
      this.dismissTarget.hidden = false;
    }

    if (focus) {
      this.#captureRestoreFocus();
      this.#focusDialog();
    }
  }

  #applyHostDurationPreference() {
    if (this.dialogMode) return;

    const preference = this.#hostDurationPreference();
    if (preference === null) return;

    if (preference === 0) {
      this.promoteToDialog({ focus: false });
      return;
    }

    if (preference > 0) {
      this.timeoutValue = preference;
    }
  }

  #hostDurationPreference() {
    const host = this.element.closest("[data-controller~='pathogen--toaster']");
    const attr = host?.getAttribute("data-pathogen--toaster-duration-preference-value");
    if (attr !== null && attr !== undefined && attr !== "") {
      const fromHost = Number(attr);
      if (Number.isFinite(fromHost) && fromHost >= 0) return fromHost;
    }

    try {
      const raw = window.localStorage?.getItem("pathogen.toast.durationMs");
      if (raw === null || raw === undefined || raw === "") return null;
      if (raw === "forever") return 0;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) return null;
      return parsed;
    } catch {
      return null;
    }
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
    requestAnimationFrame(() => {
      if (!this.element.isConnected || this.#state !== "open") return;

      // Focus the dialog shell so AT announces aria-labelledby (the message).
      // Focusing dismiss first only said "Dismiss notification" with no context.
      const dialog = this.hasDialogTarget ? this.dialogTarget : this.element;
      if (dialog instanceof HTMLElement) {
        dialog.focus({ preventScroll: true });
      }
    });
  }

  #startTimer() {
    if (this.dialogMode) return;
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
    if (this.dialogMode) return;
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
    if (this.dialogMode) return;

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
