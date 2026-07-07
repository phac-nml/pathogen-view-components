import { Controller } from "@hotwired/stimulus";
import { v4 as uuidv4 } from "uuid";

const TABS_ERROR_CLASS =
  "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100";

/**
 * Tabs Controller
 *
 * Implements W3C ARIA Authoring Practices Guide tab pattern with automatic activation.
 * Provides keyboard navigation (arrow keys, Home, End) and accessible tab switching.
 * Supports optional URL hash syncing for bookmarkable tabs and browser back/forward navigation.
 *
 * @class TabsController
 * @extends Controller
 *
 * @example Basic Usage
 * <nav data-controller="pathogen--tabs" data-pathogen--tabs-default-index-value="0">
 *   <div role="tablist">
 *     <button role="tab" data-pathogen--tabs-target="tab">Tab 1</button>
 *     <button role="tab" data-pathogen--tabs-target="tab">Tab 2</button>
 *   </div>
 *   <div data-pathogen--tabs-target="panel">Panel 1</div>
 *   <div data-pathogen--tabs-target="panel">Panel 2</div>
 * </nav>
 *
 * @example With URL Sync (Bookmarkable Tabs)
 * <nav data-controller="pathogen--tabs"
 *      data-pathogen--tabs-sync-url-value="true"
 *      data-pathogen--tabs-default-index-value="0">
 *   <div role="tablist">
 *     <button role="tab" id="overview-tab" data-pathogen--tabs-target="tab">Overview</button>
 *     <button role="tab" id="settings-tab" data-pathogen--tabs-target="tab">Settings</button>
 *   </div>
 *   <div id="overview-panel" data-pathogen--tabs-target="panel">Panel 1</div>
 *   <div id="settings-panel" data-pathogen--tabs-target="panel">Panel 2</div>
 * </nav>
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */
export default class extends Controller {
  /**
   * Stimulus targets
   * @type {string[]}
   */
  static targets = ["tab", "panel"];

  /**
   * Stimulus values
   * @type {Object}
   * @property {Number} defaultIndex - Index of the initially selected tab (default: 0)
   * @property {Boolean} syncUrl - Whether to sync tab selection with URL hash (default: false)
   */
  static values = {
    defaultIndex: { type: Number, default: 0 },
    syncUrl: { type: Boolean, default: false },
  };

  /**
   * Private field for storing bound hash change handler
   * @type {Function|null}
   * @private
   */
  #boundHandleHashChange = null;

  /**
   * Private field for storing bound turbo render handler
   * @type {Function|null}
   * @private
   */
  #boundHandleTurboRender = null;

  /**
   * Private field for caching the tablist element reference
   * @type {HTMLElement|null}
   * @private
   */
  #tablist = null;

  /**
   * Private field for storing the URL hash update timeout
   * Used for debouncing hash updates during rapid tab switching
   * @type {number|null}
   * @private
   */
  #hashUpdateTimeout = null;

  /**
   * Index of the currently selected tab
   * @type {number|null}
   * @private
   */
  #selectedIndex = null;

  /**
   * Private field for storing the panel update timeout
   * @type {number|null}
   * @private
   */
  #panelUpdateTimeout = null;

  /**
   * Initializes the controller when it connects to the DOM
   * Sets up ARIA relationships and selects the default tab.
   *
   * @returns {void}
   */
  connect() {
    try {
      // Cache the tablist element reference for performance
      this.#tablist = this.element.querySelector('[role="tablist"]');

      // Validate that we have matching tabs and panels
      if (!this.#validateTargets()) {
        return;
      }

      // Set up ARIA roles and relationships
      this.#setupARIA();

      // Determine initial tab index
      let initialIndex = this.defaultIndexValue;
      let shouldUpdateUrl = true;

      // If URL sync is enabled, check for hash in URL
      if (this.syncUrlValue) {
        const hashIndex = this.#getTabIndexFromHash();
        if (hashIndex !== -1) {
          initialIndex = hashIndex;
          // If hash already points to this tab, don't update URL
          shouldUpdateUrl = false;
        }

        // Listen for hash changes (back/forward navigation)
        this.#boundHandleHashChange = this.#handleHashChange.bind(this);
        window.addEventListener("hashchange", this.#boundHandleHashChange);

        // Listen for Turbo render events to restore tab selection after page morphs
        // This is critical because Turbo morphing does NOT call disconnect/connect
        this.#boundHandleTurboRender = this.#handleTurboRender.bind(this);
        document.addEventListener("turbo:render", this.#boundHandleTurboRender);
      }

      // Select the initial tab
      // Only update URL if the selected tab isn't already the current tab
      const validatedIndex = this.#validateDefaultIndex(initialIndex);
      this.#applyTabSelection(validatedIndex, shouldUpdateUrl, history.replaceState, {
        deferPanels: true,
      });
    } catch (error) {
      console.error("[pathogen--tabs] Error during initialization:", error);
    }
    this.element.dataset.controllerConnected = "true";
  }

  /**
   * Handles tab selection via click
   *
   * @param {Event} event - The click event
   * @returns {void}
   */
  selectTab(event) {
    try {
      const clickedTab = event.currentTarget;
      const tabIndex = this.tabTargets.indexOf(clickedTab);

      if (tabIndex === -1) {
        console.error("[pathogen--tabs] Clicked tab not found in targets");
        return;
      }

      if (this.#selectedIndex === tabIndex && this.#isTabSelectionSynced(tabIndex)) {
        return;
      }

      this.#selectTabByIndex(tabIndex);
    } catch (error) {
      console.error("[pathogen--tabs] Error selecting tab:", error);
    }
  }

  /**
   * Gets the orientation of the tablist
   * Uses cached tablist element for performance
   * @private
   * @returns {string} 'horizontal' or 'vertical'
   */
  #getOrientation() {
    return this.#tablist?.getAttribute("aria-orientation") || "horizontal";
  }

  /**
   * Handles keyboard navigation
   * Supports Arrow Left/Right (horizontal) or Up/Down (vertical), Home, End keys
   * Navigation direction adapts to aria-orientation attribute
   *
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {void}
   */
  handleKeyDown(event) {
    try {
      const isVertical = this.#getOrientation() === "vertical";

      // Map keys based on orientation
      const handlers = {
        [isVertical ? "ArrowUp" : "ArrowLeft"]: () => this.#navigateToPrevious(event),
        [isVertical ? "ArrowDown" : "ArrowRight"]: () => this.#navigateToNext(event),
        Home: () => this.#navigateToFirst(),
        End: () => this.#navigateToLast(),
      };

      const handler = handlers[event.key];
      if (handler) {
        event.preventDefault();
        handler();
      }
    } catch (error) {
      console.error("[pathogen--tabs] Error handling keyboard:", error);
    }
  }

  /**
   * Cleans up when controller disconnects from the DOM
   *
   * @returns {void}
   */
  disconnect() {
    // Remove event listeners if URL sync is enabled
    if (this.syncUrlValue) {
      if (this.#boundHandleHashChange) {
        window.removeEventListener("hashchange", this.#boundHandleHashChange);
      }
      if (this.#boundHandleTurboRender) {
        document.removeEventListener("turbo:render", this.#boundHandleTurboRender);
      }
    }

    // Clear any pending hash update timeout
    if (this.#hashUpdateTimeout) {
      clearTimeout(this.#hashUpdateTimeout);
      this.#hashUpdateTimeout = null;
    }

    if (this.#panelUpdateTimeout) {
      clearTimeout(this.#panelUpdateTimeout);
      this.#panelUpdateTimeout = null;
    }

    // Clear cached DOM references
    this.#tablist = null;

    // Remove test marker
    delete this.element.dataset.controllerConnected;
  }

  // Private methods

  /**
   * Validates that tabs and panels are properly configured
   * @private
   * @returns {boolean} True if validation passes
   */
  #validateTargets() {
    if (this.tabTargets.length === 0) {
      console.error("[pathogen--tabs] At least one tab target is required");
      this.element.innerHTML = `<div class="${TABS_ERROR_CLASS}">At least one tab target is required</div>`;
      return false;
    }

    if (this.panelTargets.length === 0) {
      console.error("[pathogen--tabs] At least one panel target is required");
      this.element.innerHTML = `<div class="${TABS_ERROR_CLASS}">At least one panel target is required</div>`;
      return false;
    }

    if (this.tabTargets.length !== this.panelTargets.length) {
      console.error("[pathogen--tabs] Tab and panel counts must match", {
        tabs: this.tabTargets.length,
        panels: this.panelTargets.length,
      });
      this.element.innerHTML = `<div class="${TABS_ERROR_CLASS}">Tab and panel counts must match</div>`;
      return false;
    }

    return true;
  }

  /**
   * Validates and normalizes the default index value
   * @private
   * @param {number} index - The default index
   * @returns {number} Validated index (0 if invalid)
   */
  #validateDefaultIndex(index) {
    if (index < 0 || index >= this.tabTargets.length) {
      console.warn(`[pathogen--tabs] default_index ${index} out of bounds, using 0`);
      return 0;
    }
    return index;
  }

  /**
   * Sets up ARIA attributes on tabs and panels
   * @private
   * @returns {void}
   */
  #setupARIA() {
    this.tabTargets.forEach((tab, index) => {
      const panel = this.panelTargets[index];

      // Ensure tab has required ARIA attributes
      if (!tab.hasAttribute("role")) {
        tab.setAttribute("role", "tab");
      }

      // Link tab to panel
      if (panel && panel.id) {
        tab.setAttribute("aria-controls", panel.id);
      }
    });

    this.panelTargets.forEach((panel, index) => {
      const tab = this.tabTargets[index];

      // Ensure panel has required ARIA attributes
      if (!panel.hasAttribute("role")) {
        panel.setAttribute("role", "tabpanel");
      }

      // Link panel to tab
      if (tab && tab.id) {
        panel.setAttribute("aria-labelledby", tab.id);
      }
    });
  }

  /**
   * Returns whether the given tab index can be selected
   * @private
   * @param {number} index - The tab index
   * @returns {boolean}
   */
  #canSelectIndex(index) {
    if (!this.hasTabTarget || !this.hasPanelTarget) {
      return false;
    }

    return index >= 0 && index < this.tabTargets.length;
  }

  /**
   * Returns whether panel visibility already matches the given index
   * @private
   * @param {number} index - The tab index
   * @returns {boolean}
   */
  #arePanelsSynced(index) {
    if (!this.#canSelectIndex(index)) {
      return false;
    }

    return this.panelTargets.every((panel, i) => {
      if (!panel) return false;

      const isVisible = i === index;
      const hiddenValue = String(!isVisible);
      const stateValue = isVisible ? "active" : "inactive";

      return (
        panel.hidden === !isVisible &&
        panel.getAttribute("aria-hidden") === hiddenValue &&
        panel.dataset.state === stateValue
      );
    });
  }

  /**
   * Returns whether tab and panel state already match the given index
   * @private
   * @param {number} index - The tab index
   * @returns {boolean}
   */
  #isSelectionSynced(index) {
    return this.#isTabSelectionSynced(index) && this.#arePanelsSynced(index);
  }

  /**
   * Updates tab selection state synchronously
   *
   * aria-controls is temporarily removed during updates so NVDA does not
   * re-announce tabs when aria-selected changes on a focused tab.
   *
   * @see https://github.com/nvaccess/nvda/issues/18794
   *
   * @private
   * @param {number} index - The tab index to select
   * @returns {void}
   */
  #updateTabs(index) {
    const restoredControls = this.tabTargets.map((tab) => {
      if (!tab) return null;

      const controls = tab.getAttribute("aria-controls");
      if (controls) {
        tab.removeAttribute("aria-controls");
      }

      return controls;
    });

    try {
      this.tabTargets.forEach((tab, i) => {
        if (!tab) return;

        const isSelected = i === index;
        const selectedValue = String(isSelected);
        const stateValue = isSelected ? "active" : "inactive";
        const tabIndexValue = isSelected ? 0 : -1;

        if (tab.getAttribute("aria-selected") !== selectedValue) {
          tab.setAttribute("aria-selected", selectedValue);
        }

        if (tab.dataset.state !== stateValue) {
          tab.dataset.state = stateValue;
        }

        if (tab.tabIndex !== tabIndexValue) {
          tab.tabIndex = tabIndexValue;
        }
      });
    } finally {
      this.tabTargets.forEach((tab, i) => {
        const controls = restoredControls[i];
        if (tab && controls) {
          tab.setAttribute("aria-controls", controls);
        }
      });
    }
  }

  /**
   * Updates panel visibility for the selected tab
   *
   * When a panel becomes visible (`hidden` becomes false), any Turbo Frames
   * with loading="lazy" inside will automatically fetch their content.
   *
   * @private
   * @param {number} index - The tab index to show
   * @returns {void}
   */
  #updatePanels(index) {
    this.panelTargets.forEach((panel, i) => {
      if (!panel) return;

      const isVisible = i === index;
      const hiddenValue = String(!isVisible);
      const stateValue = isVisible ? "active" : "inactive";

      if (panel.hidden !== !isVisible) {
        panel.hidden = !isVisible;
      }

      if (panel.getAttribute("aria-hidden") !== hiddenValue) {
        panel.setAttribute("aria-hidden", hiddenValue);
      }

      if (panel.dataset.state !== stateValue) {
        panel.dataset.state = stateValue;
      }
    });
  }

  /**
   * Applies tab and panel selection state synchronously
   *
   * @private
   * @param {number} index - The tab index to select
   * @param {boolean} updateUrl - Whether to update the URL hash
   * @param {Function} updateMethod - The history method to use
   * @returns {void}
   */
  #syncPanelsAndUrl(index, updateUrl, updateMethod) {
    this.#updatePanels(index);

    if (this.syncUrlValue && updateUrl) {
      this.#updateUrlHash(index, updateMethod);
    }
  }

  /**
   * Defers panel visibility and optional URL updates
   *
   * @private
   * @param {number} index - The tab index to show
   * @param {boolean} updateUrl - Whether to update the URL hash
   * @param {Function} updateMethod - The history method to use
   * @returns {void}
   */
  #deferPanelUpdate(index, updateUrl, updateMethod) {
    if (this.#panelUpdateTimeout) {
      clearTimeout(this.#panelUpdateTimeout);
    }

    this.#panelUpdateTimeout = setTimeout(() => {
      this.#panelUpdateTimeout = null;

      if (!this.#canSelectIndex(index) || this.#selectedIndex !== index) {
        return;
      }

      if (!this.#arePanelsSynced(index)) {
        this.#updatePanels(index);
      }

      if (this.syncUrlValue && updateUrl) {
        this.#updateUrlHash(index, updateMethod);
      }
    }, 20);
  }

  /**
   * Applies tab selection and optionally defers panel visibility
   *
   * @private
   * @param {number} index - The tab index to select
   * @param {boolean} updateUrl - Whether to update the URL hash
   * @param {Function} updateMethod - The history method to use
   * @param {Object} options - Additional options
   * @param {boolean} options.deferPanels - Defer panel visibility updates
   * @returns {void}
   */
  #applyTabSelection(index, updateUrl = true, updateMethod = history.pushState, { deferPanels = false } = {}) {
    if (!this.#canSelectIndex(index)) {
      return;
    }

    if (this.#selectedIndex === index && this.#isTabSelectionSynced(index)) {
      if (!this.#arePanelsSynced(index)) {
        if (deferPanels) {
          this.#deferPanelUpdate(index, updateUrl, updateMethod);
        } else {
          this.#syncPanelsAndUrl(index, updateUrl, updateMethod);
        }
      } else if (this.syncUrlValue && updateUrl) {
        this.#updateUrlHash(index, updateMethod);
      }

      return;
    }

    this.#selectedIndex = index;
    this.#updateTabs(index);

    if (deferPanels) {
      this.#deferPanelUpdate(index, updateUrl, updateMethod);
    } else {
      this.#syncPanelsAndUrl(index, updateUrl, updateMethod);
    }
  }

  /**
   * Selects a tab by index
   *
   * @private
   * @param {number} index - The tab index to select
   * @param {boolean} updateUrl - Whether to update the URL hash (default: true)
   * @param {Function} updateMethod - The history method to use (default: history.pushState)
   * @param {Object} options - Additional options
   * @param {boolean} options.deferPanels - Defer panel visibility updates
   * @returns {void}
   */
  #selectTabByIndex(index, updateUrl = true, updateMethod = history.pushState, { deferPanels = true } = {}) {
    if (!this.#canSelectIndex(index)) {
      return;
    }

    if (this.#selectedIndex === index && this.#isSelectionSynced(index)) {
      return;
    }

    this.#applyTabSelection(index, updateUrl, updateMethod, { deferPanels });
  }

  /**
   * Returns whether tab roving state already matches the given index
   * @private
   * @param {number} index - The tab index
   * @returns {boolean}
   */
  #isTabSelectionSynced(index) {
    if (!this.#canSelectIndex(index)) {
      return false;
    }

    const tab = this.tabTargets[index];

    return tab?.getAttribute("aria-selected") === "true" && tab?.dataset.state === "active" && tab?.tabIndex === 0;
  }

  /**
   * Navigates to the previous tab (with wrap-around)
   * @private
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {void}
   */
  #navigateToPrevious(event) {
    const currentIndex = this.tabTargets.indexOf(event.currentTarget);
    const targetIndex = currentIndex === 0 ? this.tabTargets.length - 1 : currentIndex - 1;
    this.#focusAndSelectTab(targetIndex);
  }

  /**
   * Navigates to the next tab (with wrap-around)
   * @private
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {void}
   */
  #navigateToNext(event) {
    const currentIndex = this.tabTargets.indexOf(event.currentTarget);
    const targetIndex = (currentIndex + 1) % this.tabTargets.length;
    this.#focusAndSelectTab(targetIndex);
  }

  /**
   * Navigates to the first tab
   * @private
   * @returns {void}
   */
  #navigateToFirst() {
    this.#focusAndSelectTab(0);
  }

  /**
   * Navigates to the last tab
   * @private
   * @returns {void}
   */
  #navigateToLast() {
    this.#focusAndSelectTab(this.tabTargets.length - 1);
  }

  /**
   * Focuses a tab and selects it (automatic activation pattern)
   * @private
   * @param {number} index - The tab index
   * @returns {void}
   */
  #focusAndSelectTab(index) {
    if (!this.#canSelectIndex(index)) {
      return;
    }

    const tab = this.tabTargets[index];

    if (this.#selectedIndex === index && document.activeElement === tab && this.#isTabSelectionSynced(index)) {
      return;
    }

    // Apply selection before focus so the focus announcement includes the final
    // selected state. aria-controls is stripped during the attribute batch so NVDA
    // does not also announce aria-selected changes separately.
    this.#applyTabSelection(index, true, history.pushState, { deferPanels: true });

    if (document.activeElement !== tab) {
      tab.focus({ preventScroll: true });
    }
  }

  /**
   * Gets the tab ID for URL hash
   * Uses the tab's ID if available, otherwise uses the panel's ID, or falls back to index
   * @private
   * @param {number} index - The tab index
   * @returns {string} The hash identifier
   */
  #getTabHash(index) {
    // Defensive checks
    if (!this.hasTabTarget || !this.hasPanelTarget) {
      return `tab-${index}`;
    }

    const tab = this.tabTargets[index];
    const panel = this.panelTargets[index];

    // Prefer tab ID, then panel ID, finally fall back to index
    if (tab?.id) {
      return tab.id;
    }
    if (panel?.id) {
      return panel.id;
    }
    return `tab-${index}`;
  }

  /**
   * Updates the URL hash with the selected tab
   * Debounced to prevent excessive updates during rapid tab switching (e.g., arrow keys)
   * @private
   * @param {number} index - The tab index
   * @param {Function} method - The history method to use (default: history.pushState)
   * @returns {void}
   */
  #updateUrlHash(index, method = history.pushState) {
    // Clear any pending update
    if (this.#hashUpdateTimeout) {
      clearTimeout(this.#hashUpdateTimeout);
    }

    // Debounce the update by 100ms
    // This prevents excessive URL updates during rapid arrow key navigation
    this.#hashUpdateTimeout = setTimeout(() => {
      try {
        const hash = this.#getTabHash(index);
        const url = new URL(window.location.href);
        // Clear stale tab query params so subsequent submissions don't carry outdated values
        url.searchParams.delete("tab");
        url.hash = hash;

        // Use Turbo's history API to properly integrate with Turbo navigation
        // This ensures back/forward navigation works correctly with Turbo Drive
        Turbo.session.history.update(method, url, uuidv4());
      } catch (error) {
        console.error("[pathogen--tabs] Error updating URL hash:", error);
      } finally {
        this.#hashUpdateTimeout = null;
      }
    }, 100);
  }

  /**
   * Gets the tab index from the current URL hash
   * @private
   * @returns {number} The tab index, or -1 if not found
   */
  #getTabIndexFromHash() {
    try {
      const hash = window.location.hash.slice(1); // Remove the '#'
      if (!hash) {
        return -1;
      }

      // Ensure targets are available (defensive check for morph scenarios)
      if (!this.hasTabTarget || !this.hasPanelTarget) {
        return -1;
      }

      // Try to find tab by ID
      const tabIndex = this.tabTargets.findIndex((tab) => tab && tab.id === hash);
      if (tabIndex !== -1) {
        return tabIndex;
      }

      // Try to find panel by ID
      const panelIndex = this.panelTargets.findIndex((panel) => panel && panel.id === hash);
      if (panelIndex !== -1) {
        return panelIndex;
      }

      // Try to parse as tab-{index} format
      const match = hash.match(/^tab-(\d+)$/);
      if (match) {
        const index = parseInt(match[1], 10);
        if (index >= 0 && index < this.tabTargets.length) {
          return index;
        }
      }

      return -1;
    } catch (error) {
      console.error("[pathogen--tabs] Error getting tab index from hash:", error);
      return -1;
    }
  }

  /**
   * Handles browser hash change events (back/forward navigation)
   * @private
   * @returns {void}
   */
  #handleHashChange() {
    try {
      const hashIndex = this.#getTabIndexFromHash();
      if (hashIndex === -1 || this.#isSelectionSynced(hashIndex)) {
        return;
      }

      // Use replaceState when hash is not present, to avoid creating additional history entries.
      // (e.g. on initialization hash is not present and is set on initial connect,
      // we don't want two history entries in this case).
      this.#selectTabByIndex(hashIndex, true, history.replaceState);
    } catch (error) {
      console.error("[pathogen--tabs] Error handling hash change:", error);
    }
  }

  /**
   * Handles Turbo render events to restore tab selection after page morphs
   *
   * Critical: When Turbo morphs the page, Stimulus controllers do NOT disconnect/reconnect.
   * The controller instance persists while the DOM underneath changes. This means our
   * connect() method never runs again to restore tab selection from the URL hash.
   *
   * This handler re-synchronizes tab selection after a morph by:
   * 1. Re-validating targets (DOM may have changed during morph)
   * 2. Reading the URL hash (which survives the morph)
   * 3. Selecting the appropriate tab based on the hash
   * 4. Reloading frames in visible panels to get fresh translated content
   *
   * @private
   * @returns {void}
   */
  #handleTurboRender() {
    try {
      // Re-validate targets after morph in case DOM structure changed
      if (!this.#validateTargets()) {
        return;
      }

      const hashIndex = this.#getTabIndexFromHash();
      const targetIndex =
        hashIndex !== -1 ? hashIndex : (this.#selectedIndex ?? this.#validateDefaultIndex(this.defaultIndexValue));

      if (this.#isTabSelectionSynced(targetIndex)) {
        if (!this.#arePanelsSynced(targetIndex)) {
          this.#updatePanels(targetIndex);
        }

        return;
      }

      // Tab attributes were reset by a morph — restore without touching panels
      // when they already match.
      this.#selectedIndex = targetIndex;
      this.#updateTabs(targetIndex);

      if (!this.#arePanelsSynced(targetIndex)) {
        this.#updatePanels(targetIndex);
      }
    } catch (error) {
      console.error("[pathogen--tabs] Error handling turbo render:", error);
    }
  }
}
