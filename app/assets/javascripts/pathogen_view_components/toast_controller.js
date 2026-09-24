import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["message", "description", "dismiss", "action", "dialog", "typeLabel"];
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
    const serverRenderedDialog = this.dialogMode;
    this.#applyHostDurationPreference();
    this.#remainingMs = this.timeoutValue > 0 && !this.dialogMode ? this.timeoutValue : 0;
    this.#bindEvents();
    this.#startTimer();

    if (!this.dialogMode) {
      // Plain status toast: polite live-region announcement, no focus move.
      this.#announce();
      return;
    }

    if (this.interruptValue) {
      // Emergency error: broadcast assertively instead of hijacking focus, so a
      // system- or stream-triggered alert reaches screen readers without
      // pulling the user out of what they are doing.
      this.#announce();
      return;
    }

    if (serverRenderedDialog && this.#mayMoveFocus()) {
      // Intentional notification dialog (error / warning / dismissible / action):
      // move focus in so the user can read and act on it.
      this.#captureRestoreFocus();
      this.#focusDialog();
      return;
    }

    // A status toast auto-promoted to a dialog (duration preference), or a
    // dialog we should not focus right now (active text entry, or another toast
    // already holds focus): announce politely instead of stealing focus.
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
      this.#applyDialogLabels(shell);
      while (this.element.firstChild) {
        shell.appendChild(this.element.firstChild);
      }
      this.element.appendChild(shell);
    } else {
      this.dialogTarget.setAttribute("role", "dialog");
      this.dialogTarget.setAttribute("aria-modal", "false");
      this.dialogTarget.tabIndex = -1;
      this.#applyDialogLabels(this.dialogTarget);
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

  // Decides whether it is safe to move focus into a freshly mounted dialog.
  // Focus is only moved for intentional, non-disruptive cases.
  #mayMoveFocus() {
    const active = document.activeElement;

    // Never interrupt active text entry.
    if (this.#isEditableElement(active)) return false;

    // Never yank focus from a toast that already holds it: the first dialog to
    // mount wins, which prevents focus thrashing when several arrive together.
    const host = this.element.closest("[data-controller~='pathogen--toaster']");
    if (host && active instanceof HTMLElement && host.contains(active) && !this.element.contains(active)) {
      return false;
    }

    return true;
  }

  #isEditableElement(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element.isContentEditable) return true;

    const tag = element.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag === "INPUT") {
      const nonTextTypes = ["button", "submit", "reset", "checkbox", "radio", "range", "color", "file", "image"];
      return !nonTextTypes.includes((element.type || "text").toLowerCase());
    }

    return false;
  }

  // Pairs the severity label ("Error:") with the message for the dialog's
  // accessible name, and associates the description via aria-describedby so a
  // client-promoted dialog matches the server-rendered markup.
  #applyDialogLabels(element) {
    const labelIds = [];
    if (this.hasTypeLabelTarget && this.typeLabelTarget.id) labelIds.push(this.typeLabelTarget.id);
    if (this.hasMessageTarget && this.messageTarget.id) labelIds.push(this.messageTarget.id);
    if (labelIds.length > 0) {
      element.setAttribute("aria-labelledby", labelIds.join(" "));
    }

    if (this.hasDescriptionTarget && this.descriptionTarget.id) {
      element.setAttribute("aria-describedby", this.descriptionTarget.id);
    } else {
      element.removeAttribute("aria-describedby");
    }
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
