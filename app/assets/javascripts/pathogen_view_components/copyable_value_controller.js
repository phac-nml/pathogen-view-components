import { Controller } from "@hotwired/stimulus";

/**
 * Pathogen::CopyableValue Stimulus controller.
 *
 * Copies the displayed value to the clipboard using the modern Clipboard API
 * and provides visual + screen-reader feedback via icon swap and aria-live region.
 */
export default class extends Controller {
  static targets = ["text", "icon", "successIcon", "announcement"];
  static values = {
    copiedMessage: { type: String, default: "Copied to clipboard" },
    copyFailedMessage: { type: String, default: "Unable to copy to clipboard" },
  };

  connect() {
    this._resetTimeout = null;
  }

  async copy() {
    const text = this.textTarget.textContent ?? "";

    try {
      await this._copyText(text);
      this._showSuccess();
    } catch {
      this._showFailure();
    }
  }

  disconnect() {
    this._clearTimeout();
  }

  // -- Private --

  async _copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const selection = window.getSelection();
    const range = document.createRange();

    range.selectNodeContents(this.textTarget);
    selection?.removeAllRanges();
    selection?.addRange(range);

    const copied = typeof document.execCommand === "function" && document.execCommand("copy");

    selection?.removeAllRanges();

    if (!copied) {
      throw new Error("Clipboard API unavailable and fallback copy failed");
    }
  }

  _showSuccess() {
    this._clearTimeout();

    // Swap icons
    this.iconTarget.classList.add("hidden");
    this.successIconTarget.classList.remove("hidden");

    // Announce to screen readers
    this.announcementTarget.textContent = this.copiedMessageValue;

    // Revert after 2 seconds
    this._resetTimeout = window.setTimeout(() => {
      this._reset();
    }, 2000);
  }

  _showFailure() {
    this._clearTimeout();
    this._showDefaultIcon();
    this.announcementTarget.textContent = this.copyFailedMessageValue;

    this._resetTimeout = window.setTimeout(() => {
      this.announcementTarget.textContent = "";
      this._resetTimeout = null;
    }, 2000);
  }

  _reset() {
    this._showDefaultIcon();
    this.announcementTarget.textContent = "";
    this._resetTimeout = null;
  }

  _showDefaultIcon() {
    this.iconTarget.classList.remove("hidden");
    this.successIconTarget.classList.add("hidden");
  }

  _clearTimeout() {
    if (this._resetTimeout) {
      clearTimeout(this._resetTimeout);
      this._resetTimeout = null;
    }
  }
}
