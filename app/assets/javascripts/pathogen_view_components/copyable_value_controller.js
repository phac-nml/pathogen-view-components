import { Controller } from "@hotwired/stimulus";

const COPY_STATES = {
  idle: "idle",
  success: "success",
  error: "error",
};

/**
 * Copies text via the Clipboard API with a selection-based fallback.
 *
 * @param {string} text - Text to copy
 * @param {HTMLElement} fallbackElement - Element used for execCommand fallback selection
 * @returns {Promise<void>}
 */
async function writeTextToClipboard(text, fallbackElement) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const selection = window.getSelection();
  const range = document.createRange();

  range.selectNodeContents(fallbackElement);
  selection?.removeAllRanges();
  selection?.addRange(range);

  const copied = typeof document.execCommand === "function" && document.execCommand("copy");

  selection?.removeAllRanges();

  if (!copied) {
    throw new Error("Clipboard API unavailable and fallback copy failed");
  }
}

/**
 * Pathogen::CopyableValue Stimulus controller.
 *
 * Copies the displayed value to the clipboard and provides visual + screen-reader
 * feedback via semantic `data-state`, icon swap CSS, and an aria-live region.
 */
export default class extends Controller {
  static targets = ["text", "announcement"];

  static values = {
    copiedMessage: { type: String, default: "Copied to clipboard" },
    copyFailedMessage: { type: String, default: "Unable to copy to clipboard" },
    resetDelay: { type: Number, default: 2000 },
  };

  #resetTimeout = null;

  connect() {
    this.#setState(COPY_STATES.idle);
    this.element.dataset.controllerConnected = "true";
  }

  disconnect() {
    this.#clearResetTimeout();
    delete this.element.dataset.controllerConnected;
  }

  async copy() {
    const text = this.textTarget.textContent ?? "";

    try {
      await writeTextToClipboard(text, this.textTarget);
      this.#showSuccess();
    } catch {
      this.#showFailure();
    }
  }

  #showSuccess() {
    this.#clearResetTimeout();
    this.#setState(COPY_STATES.success, { replay: true });
    this.#announce(this.copiedMessageValue);
    this.#resetTimeout = window.setTimeout(() => this.#reset(), this.resetDelayValue);
  }

  #showFailure() {
    this.#clearResetTimeout();
    this.#setState(COPY_STATES.error);
    this.#announce(this.copyFailedMessageValue);
    this.#resetTimeout = window.setTimeout(() => this.#reset(), this.resetDelayValue);
  }

  #reset() {
    this.#setState(COPY_STATES.idle);
    this.#clearAnnouncement();
    this.#resetTimeout = null;
  }

  #setState(state, { replay = false } = {}) {
    if (replay && state === COPY_STATES.success && this.element.dataset.state === COPY_STATES.success) {
      this.element.dataset.state = COPY_STATES.idle;
      void this.element.offsetWidth;
    }

    this.element.dataset.state = state;
  }

  #announce(message) {
    this.announcementTarget.textContent = message;
  }

  #clearAnnouncement() {
    this.announcementTarget.textContent = "";
  }

  #clearResetTimeout() {
    if (this.#resetTimeout) {
      clearTimeout(this.#resetTimeout);
      this.#resetTimeout = null;
    }
  }
}
