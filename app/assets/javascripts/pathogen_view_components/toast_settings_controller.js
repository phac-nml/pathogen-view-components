import { Controller } from "@hotwired/stimulus";

const DEFAULT_STORAGE_KEY = "pathogen.toast.durationMs";

// Persists the user's status-toast duration preference to localStorage, which
// Pathogen::Toaster / Pathogen::Toast read. This is the user-facing mechanism
// behind WCAG 2.2.1 (Timing Adjustable) for status toasts.
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
    try {
      if (value === "" || value === null || value === undefined) {
        window.localStorage?.removeItem(this.#storageKey());
      } else {
        window.localStorage?.setItem(this.#storageKey(), value);
      }
    } catch {
      // Storage may be unavailable (private mode, disabled). Fail quietly; the
      // select still reflects the user's choice for the current session.
    }

    this.dispatch("change", {
      prefix: "pathogen:toast-settings",
      detail: { value },
    });
  }

  #reflectStoredPreference() {
    if (!this.hasSelectTarget) return;

    let stored = null;
    try {
      stored = window.localStorage?.getItem(this.#storageKey());
    } catch {
      stored = null;
    }

    // No stored preference: keep the server-rendered default selection.
    if (stored === null || stored === undefined) return;

    const match = Array.from(this.selectTarget.options).some((option) => option.value === stored);
    if (match) this.selectTarget.value = stored;
  }

  #storageKey() {
    return this.storageKeyValue || DEFAULT_STORAGE_KEY;
  }
}

export { DEFAULT_STORAGE_KEY };
