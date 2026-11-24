import { Controller } from "@hotwired/stimulus";

const COPY_STATES = {
  idle: "idle",
  success: "success",
  error: "error",
};
const DEFAULT_TOOLTIP_BACKGROUND_CLASS = "bg-neutral-950";
const SUCCESS_TOOLTIP_BACKGROUND_CLASS = "bg-(--pvc-color-success-solid)";

/**
 * Copies text via the Clipboard API with a selection-based fallback.
 *
 * @param {string} text - Text to copy
 * @param {HTMLElement} fallbackElement - Element beside which to insert the temporary copy field
 * @returns {Promise<void>}
 */
async function writeTextToClipboard(text, fallbackElement) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const activeElement = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.readOnly = true;
  textarea.tabIndex = -1;
  textarea.style.cssText = "position: fixed; top: 0; left: 0; opacity: 0;";
  fallbackElement.after(textarea);

  try {
    textarea.focus({ preventScroll: true });
    textarea.select();
    const copied = typeof document.execCommand === "function" && document.execCommand("copy");
    if (!copied) {
      throw new Error("Clipboard API unavailable and fallback copy failed");
    }
  } finally {
    textarea.remove();
    activeElement.focus({ preventScroll: true });
  }
}

/**
 * Pathogen::CopyableValue Stimulus controller.
 *
 * Copies the displayed value to the clipboard and provides visual + screen-reader
 * feedback via semantic `data-state`, icon swap CSS, and an aria-live region.
 */
export default class extends Controller {
  static targets = ["text", "button", "announcement"];

  static values = {
    copiedMessage: { type: String, default: "Copied to clipboard" },
    copyFailedMessage: { type: String, default: "Unable to copy to clipboard" },
    copyTooltipMessage: { type: String, default: "Copy identifier" },
    copiedTooltipMessage: { type: String, default: "Copied" },
    resetDelay: { type: Number, default: 2000 },
  };

  #resetTimeout = null;
  #connectionGeneration = 0;

  connect() {
    this.#reset();
    this.element.dataset.controllerConnected = "true";
  }

  disconnect() {
    this.#connectionGeneration += 1;
    this.#clearResetTimeout();
    delete this.element.dataset.controllerConnected;
  }

  async copy() {
    const text = this.textTarget.textContent ?? "";
    const connectionGeneration = this.#connectionGeneration;
    let state = COPY_STATES.success;

    try {
      await writeTextToClipboard(text, this.textTarget);
    } catch {
      state = COPY_STATES.error;
    }

    if (connectionGeneration !== this.#connectionGeneration || !this.element.isConnected) return;

    this.#showFeedback(state);
  }

  #showFeedback(state) {
    this.#clearResetTimeout();
    this.#setState(state);
    const tooltipMessage = state === COPY_STATES.success ? this.copiedTooltipMessageValue : this.copyFailedMessageValue;
    this.announcementTarget.textContent =
      state === COPY_STATES.success ? this.copiedMessageValue : this.copyFailedMessageValue;
    this.#setTooltipMessage(tooltipMessage);
    this.#setTooltipTone(state);
    this.#resetTimeout = window.setTimeout(() => this.#reset(), this.resetDelayValue);
  }

  #reset() {
    this.#setState(COPY_STATES.idle);
    this.#setTooltipMessage(this.copyTooltipMessageValue);
    this.#setTooltipTone(COPY_STATES.idle);
    this.announcementTarget.textContent = "";
    this.#resetTimeout = null;
  }

  #setTooltipMessage(message) {
    const tooltipText = this.#tooltipTextElement();
    if (!tooltipText) return;

    tooltipText.textContent = message;
  }

  #setTooltipTone(state) {
    const tooltip = this.#tooltipElement();
    if (!tooltip) return;

    const arrow = tooltip.querySelector('[data-pathogen--tooltip-target="arrow"]');
    const successState = state === COPY_STATES.success;

    tooltip.classList.toggle(DEFAULT_TOOLTIP_BACKGROUND_CLASS, !successState);
    tooltip.classList.toggle(SUCCESS_TOOLTIP_BACKGROUND_CLASS, successState);
    arrow?.classList.toggle(DEFAULT_TOOLTIP_BACKGROUND_CLASS, !successState);
    arrow?.classList.toggle(SUCCESS_TOOLTIP_BACKGROUND_CLASS, successState);
  }

  #tooltipElement() {
    const tooltipId = this.buttonTarget.getAttribute("aria-describedby");
    if (!tooltipId) return null;

    return document.getElementById(tooltipId);
  }

  #tooltipTextElement() {
    return this.#tooltipElement()?.querySelector("[data-pathogen-copyable-value-tooltip-text]");
  }

  #setState(state) {
    if (state === COPY_STATES.success && this.element.dataset.state === COPY_STATES.success) {
      this.element.dataset.state = COPY_STATES.idle;
      void this.element.offsetWidth;
    }

    this.element.dataset.state = state;
  }

  #clearResetTimeout() {
    if (this.#resetTimeout) {
      clearTimeout(this.#resetTimeout);
      this.#resetTimeout = null;
    }
  }
}
