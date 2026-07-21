import { Controller } from "@hotwired/stimulus";

/**
 * Accessible disclosure: toggles a panel with aria-expanded / aria-controls.
 *
 * @example
 * <div data-controller="pathogen--disclosure" data-pathogen--disclosure-open-value="false" data-state="closed">
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

  connect() {
    this.applyDom();
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

  openValueChanged(value, previousValue) {
    this.applyDom();

    // Skip the initial Stimulus value callback (no previous value yet).
    if (previousValue === undefined) {
      return;
    }

    this.dispatch(value ? "opened" : "closed", { detail: { open: value } });
  }

  applyDom() {
    if (!this.hasButtonTarget || !this.hasPanelTarget) {
      return;
    }

    const isOpen = this.openValue;

    this.buttonTarget.setAttribute("aria-expanded", String(isOpen));
    this.buttonTarget.setAttribute("aria-controls", this.panelTarget.id);

    if (isOpen) {
      this.panelTarget.removeAttribute("hidden");
      this.element.dataset.state = "open";
    } else {
      this.panelTarget.setAttribute("hidden", "");
      this.element.dataset.state = "closed";
    }
  }
}
