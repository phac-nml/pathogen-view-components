import { Controller } from "@hotwired/stimulus";

/**
 * APG disclosure: toggles a panel with aria-expanded / aria-controls.
 *
 * Updating aria-expanded on the focused button lets screen readers announce
 * expanded/collapsed on activation (including VoiceOver), not only on focus.
 *
 * @example
 * <div data-controller="pathogen--disclosure" data-pathogen--disclosure-open-value="false">
 *   <button type="button"
 *           data-pathogen--disclosure-target="button"
 *           data-action="click->pathogen--disclosure#toggle"
 *           aria-expanded="false"
 *           aria-controls="panel-1">
 *     Details
 *   </button>
 *   <div id="panel-1" data-pathogen--disclosure-target="panel" hidden>
 *     Hidden content
 *   </div>
 * </div>
 */
export default class DisclosureController extends Controller {
  static targets = ["button", "panel"];
  static values = {
    open: { type: Boolean, default: false },
  };

  initialize() {
    this.hasConnected = false;
  }

  connect() {
    this.applyDom({ dispatch: false });
    this.hasConnected = true;
  }

  disconnect() {
    this.hasConnected = false;
  }

  toggle(event) {
    event?.preventDefault();
    this.openValue = !this.openValue;
  }

  open() {
    this.openValue = true;
  }

  close() {
    this.openValue = false;
  }

  openValueChanged() {
    this.applyDom({ dispatch: this.hasConnected });
  }

  applyDom({ dispatch }) {
    if (!this.hasButtonTarget || !this.hasPanelTarget) {
      return;
    }

    const isOpen = this.openValue;

    this.buttonTarget.setAttribute("aria-expanded", String(isOpen));
    if (this.panelTarget.id) {
      this.buttonTarget.setAttribute("aria-controls", this.panelTarget.id);
    }

    if (isOpen) {
      this.panelTarget.removeAttribute("hidden");
    } else {
      this.panelTarget.setAttribute("hidden", "");
    }

    if (dispatch) {
      this.dispatch(isOpen ? "opened" : "closed", { detail: { open: isOpen } });
    }
  }
}
