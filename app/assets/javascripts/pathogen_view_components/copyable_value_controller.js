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
    this.announcementTarget.textContent =
      state === COPY_STATES.success ? this.copiedMessageValue : this.copyFailedMessageValue;
    this.#resetTimeout = window.setTimeout(() => this.#reset(), this.resetDelayValue);
  }

  #reset() {
    this.#setState(COPY_STATES.idle);
    this.announcementTarget.textContent = "";
    this.#resetTimeout = null;
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
