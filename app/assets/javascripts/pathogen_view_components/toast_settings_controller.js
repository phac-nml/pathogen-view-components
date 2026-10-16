import { Controller } from "@hotwired/stimulus";
import {
  DURATION_STORAGE_KEY,
  readStoredDurationPreference,
  writeDurationPreference,
} from "pathogen_view_components/toast_duration_preference";

const DEFAULT_STORAGE_KEY = DURATION_STORAGE_KEY;

// Preferences survive blocked browser storage for this page session.
// Hosts expose this control before showing time-limited notifications.
export default class extends Controller {
  static targets = ["select"];
  static values = {
    storageKey: { type: String, default: DEFAULT_STORAGE_KEY },
  };

  connect() {
    this.#reflectStoredPreference();
  }

  // Writes the current selection to storage. An empty value clears the
  // preference so toasts fall back to their component default.
  save() {
    if (!this.hasSelectTarget) return;

    const value = this.selectTarget.value;
    writeDurationPreference(value, this.#storageKey());

    this.dispatch("change", {
      prefix: "pathogen:toast-settings",
      detail: { value },
    });
  }

  #reflectStoredPreference() {
    if (!this.hasSelectTarget) return;

    const stored = readStoredDurationPreference(this.#storageKey());

    // No stored preference: keep the server-rendered default selection.
    if (stored === null) return;

    const match = Array.from(this.selectTarget.options).some((option) => option.value === stored);
    if (match) this.selectTarget.value = stored;
  }

  #storageKey() {
    return this.storageKeyValue || DEFAULT_STORAGE_KEY;
  }
}

export { DEFAULT_STORAGE_KEY };
