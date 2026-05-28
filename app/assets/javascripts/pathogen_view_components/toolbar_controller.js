import { Controller } from "@hotwired/stimulus";

const TOOLBAR_ERROR_CLASS =
  "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100";

const TEXT_ENTRY_SELECTOR =
  'input:not([type=button]):not([type=submit]):not([type=reset]):not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]):not([type=image]), textarea, [contenteditable]:not([contenteditable="false"])';

const MOVE_FORWARD = "forward";
const MOVE_BACKWARD = "backward";

const TOOLBAR_NAV_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]);

export default class extends Controller {
  static targets = ["item"];

  #items = [];

  #boundSyncItems = null;

  #boundHandleSubmitEnd = null;

  #lastFocusedToolbarItemId = null;

  connect() {
    this.#bindDomSync();
    this.#boundHandleSubmitEnd = this.handleSubmitEnd.bind(this);
    this.element.addEventListener("turbo:submit-end", this.#boundHandleSubmitEnd);

    if (this.itemTargets.length === 0) {
      this.element.innerHTML = `<div class="${TOOLBAR_ERROR_CLASS}">At least one toolbar item target is required</div>`;
      return;
    }

    this.#syncItemsAfterDomChange();
    this.element.dataset.controllerConnected = "true";
  }

  itemTargetConnected() {
    this.#syncItemsAfterDomChange();
  }

  itemTargetDisconnected() {
    this.#syncItemsAfterDomChange();
  }

  handleKeyDown(event) {
    if (!TOOLBAR_NAV_KEYS.has(event.key)) {
      return;
    }

    if (this.#shouldYieldMenuNavigation(event)) {
      return;
    }

    let currentItem = this.#itemFromTarget(event.target);
    if (!currentItem) {
      currentItem = this.#toolbarItemForOpenPopup(event.target);
    }
    if (!currentItem) {
      return;
    }

    if (this.#shouldDeferToPopup(event, currentItem, event.target)) {
      return;
    }

    const visibleItems = this.#visibleItems();
    if (visibleItems.length === 0) {
      return;
    }

    const currentIndex = visibleItems.indexOf(currentItem);
    if (currentIndex === -1) {
      return;
    }

    if (this.#isTextEntryTarget(event.target) && !this.#shouldNavigateFromTextEntry(event.target, event.key)) {
      return;
    }

    const handlers = {
      ArrowRight: () =>
        this.#focusVisibleIndex(visibleItems, this.#nextIndex(currentIndex, visibleItems.length), MOVE_FORWARD),
      ArrowLeft: () =>
        this.#focusVisibleIndex(visibleItems, this.#previousIndex(currentIndex, visibleItems.length), MOVE_BACKWARD),
      Home: () => this.#focusVisibleIndex(visibleItems, 0),
      End: () => this.#focusVisibleIndex(visibleItems, visibleItems.length - 1),
    };

    const handler = handlers[event.key];
    if (!handler) {
      return;
    }

    event.preventDefault();
    handler();
  }

  handleFocusIn(event) {
    const item = this.#itemFromTarget(event.target);
    if (!item) {
      return;
    }

    if (!this.#visibleItems().includes(item)) {
      return;
    }

    if (item.id) {
      this.#lastFocusedToolbarItemId = item.id;
    }

    this.#setTabStopForItem(item);
  }

  handleSubmitEnd(event) {
    if (!(event.target instanceof Element) || !this.element.contains(event.target)) {
      return;
    }

    const submitter = event.detail?.formSubmission?.submitter;
    if (!(submitter instanceof HTMLElement) || !this.element.contains(submitter)) {
      return;
    }

    const item = this.#connectedItemForTarget(submitter);
    if (!item) {
      return;
    }

    queueMicrotask(() => {
      this.#focusToolbarItem(item);
    });
  }

  handleClick(event) {
    const item = this.#itemFromTarget(event.target);
    if (!item || !this.#isAriaDisabled(item)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  }

  disconnect() {
    this.#unbindDomSync();
    this.element.removeEventListener("turbo:submit-end", this.#boundHandleSubmitEnd);
    delete this.element.dataset.controllerConnected;
    this.#items = [];
    this.#lastFocusedToolbarItemId = null;
  }

  #setInitialTabStop() {
    const visibleItems = this.#visibleItems();
    if (visibleItems.length === 0) {
      return;
    }

    this.#items.forEach((item) => {
      item.tabIndex = -1;
    });

    const firstEnabledIndex = visibleItems.findIndex((item) => !this.#isAriaDisabled(item));
    const activeItem = visibleItems[firstEnabledIndex === -1 ? 0 : firstEnabledIndex];
    this.#setTabStopForItem(activeItem);
  }

  #setTabStopForItem(activeItem) {
    this.#items.forEach((item) => {
      item.tabIndex = item === activeItem ? 0 : -1;
    });
  }

  #focusVisibleIndex(visibleItems, index, moveDirection = null) {
    const item = visibleItems[index];
    if (!item) {
      return;
    }

    item.focus();
    this.#setTabStopForItem(item);

    if (moveDirection) {
      this.#placeTextEntryCaret(item, moveDirection);
    }
  }

  #placeTextEntryCaret(item, moveDirection) {
    const input = this.#textEntryControl(item);
    if (!input || input.selectionStart === null || input.selectionEnd === null) {
      return;
    }

    // Place the caret on the edge the user arrived from so the next arrow can leave the field.
    const position = moveDirection === MOVE_FORWARD ? input.value.length : 0;
    input.setSelectionRange(position, position);
  }

  #textEntryControl(item) {
    if (item instanceof HTMLInputElement || item instanceof HTMLTextAreaElement) {
      return item;
    }

    if (!(item instanceof Element)) {
      return null;
    }

    const input = item.querySelector("input, textarea");
    return input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement ? input : null;
  }

  #nextIndex(currentIndex, length) {
    return (currentIndex + 1) % length;
  }

  #previousIndex(currentIndex, length) {
    return (currentIndex - 1 + length) % length;
  }

  #bindDomSync() {
    this.#boundSyncItems = this.#syncItemsAfterDomChange.bind(this);
    this.element.addEventListener("pathogen--toolbar:sync", this.#boundSyncItems);
    this.element.addEventListener("turbo:morph", this.#boundSyncItems);
  }

  #unbindDomSync() {
    this.element.removeEventListener("pathogen--toolbar:sync", this.#boundSyncItems);
    this.element.removeEventListener("turbo:morph", this.#boundSyncItems);
  }

  #syncItemsAfterDomChange() {
    const nextItems = [...this.itemTargets];
    if (nextItems.length === 0) {
      return;
    }

    this.#items = nextItems;

    const focusedItem = this.#connectedItemForTarget(document.activeElement);
    if (focusedItem && this.#isVisibleItem(focusedItem)) {
      this.#setTabStopForItem(focusedItem);
      return;
    }

    if (this.#toolbarItemForOpenPopup(document.activeElement)) {
      return;
    }

    if (this.#restoreLastFocusedToolbarItem()) {
      return;
    }

    this.#setInitialTabStop();
  }

  #focusToolbarItem(item) {
    if (!item?.isConnected || !this.#isVisibleItem(item)) {
      return;
    }

    item.focus({ focusVisible: true });
    this.#setTabStopForItem(item);
  }

  #restoreLastFocusedToolbarItem() {
    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement &&
      activeElement.isConnected &&
      this.#connectedItemForTarget(activeElement)
    ) {
      return false;
    }

    if (!this.#lastFocusedToolbarItemId) {
      return false;
    }

    const item = this.#items.find(
      (toolbarItem) => toolbarItem.isConnected && toolbarItem.id === this.#lastFocusedToolbarItemId,
    );

    if (!item || !this.#isVisibleItem(item)) {
      return false;
    }

    this.#focusToolbarItem(item);
    return true;
  }

  #connectedItemForTarget(target) {
    if (!(target instanceof Node)) {
      return null;
    }

    return this.#items.find((item) => item.isConnected && (item === target || item.contains(target))) || null;
  }

  #itemFromTarget(target) {
    const item = this.#connectedItemForTarget(target);
    if (item) {
      return item;
    }

    // Turbo updates can replace toolbar descendants without reconnecting the controller.
    // Refresh targets lazily when events originate from newly replaced nodes.
    this.#syncItemsAfterDomChange();
    return this.#connectedItemForTarget(target);
  }

  #shouldYieldMenuNavigation(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return false;
    }

    const openMenu = target.closest('[role="menu"]');
    if (openMenu && this.element.contains(openMenu) && this.#isOpenMenu(openMenu)) {
      return true;
    }

    const triggerWithOpenMenu = this.#items.find(
      (item) =>
        item.isConnected &&
        (item === target || item.contains(target)) &&
        this.#openMenuForTrigger(item) &&
        (event.key === "ArrowDown" || event.key === "ArrowUp"),
    );

    return Boolean(triggerWithOpenMenu);
  }

  #isOpenMenu(menu) {
    if (menu.getAttribute("role") !== "menu" || menu.hidden || menu.getAttribute("aria-hidden") === "true") {
      return false;
    }

    const { display, visibility } = window.getComputedStyle(menu);
    return display !== "none" && visibility !== "hidden";
  }

  #openMenuForTrigger(trigger) {
    const menuId = trigger.getAttribute("aria-controls");
    if (!menuId) {
      return null;
    }

    const menu = document.getElementById(menuId);
    if (!menu || !this.#isOpenMenu(menu)) {
      return null;
    }

    return menu;
  }

  #toolbarItemForOpenPopup(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    const openMenu = target.closest('[role="menu"]');
    if (!openMenu || !this.#isOpenMenu(openMenu)) {
      return null;
    }

    const menuId = openMenu.id;
    if (menuId) {
      const itemByControls = this.#items.find(
        (item) => item.isConnected && item.getAttribute("aria-controls") === menuId,
      );
      if (itemByControls) {
        return itemByControls;
      }
    }

    const labelledBy = openMenu.getAttribute("aria-labelledby");
    if (labelledBy) {
      const itemByLabel = this.#items.find((item) => item.isConnected && item.id === labelledBy);
      if (itemByLabel) {
        return itemByLabel;
      }
    }

    return null;
  }

  #shouldDeferToPopup(event, item, target) {
    if (!TOOLBAR_NAV_KEYS.has(event.key)) {
      return false;
    }

    const openMenu = this.#openMenuForTrigger(item);
    if (
      openMenu &&
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return true;
    }

    if (target instanceof Element && this.#targetIsInOpenPopup(item, target)) {
      return true;
    }

    // Menu buttons use ArrowUp/ArrowDown to open and navigate their popup (APG menu button).
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && item.hasAttribute("aria-haspopup")) {
      return true;
    }

    return false;
  }

  #targetIsInOpenPopup(item, target) {
    const menuId = item.getAttribute("aria-controls");
    if (!menuId) {
      return false;
    }

    const menu = document.getElementById(menuId);
    if (!menu || !this.#isOpenMenu(menu)) {
      return false;
    }

    return menu.contains(target);
  }

  #isAriaDisabled(item) {
    return item.getAttribute("aria-disabled") === "true";
  }

  #visibleItems() {
    return this.#items.filter((item) => this.#isVisibleItem(item));
  }

  #isVisibleItem(item) {
    if (!(item instanceof HTMLElement)) {
      return false;
    }

    if (item.hidden || item.closest("[hidden]")) {
      return false;
    }

    const { display, visibility } = window.getComputedStyle(item);
    return display !== "none" && visibility !== "hidden";
  }

  #isTextEntryTarget(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(target.closest(TEXT_ENTRY_SELECTOR));
  }

  #shouldNavigateFromTextEntry(target, key) {
    if (key !== "ArrowLeft" && key !== "ArrowRight") {
      return false;
    }

    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      return false;
    }

    const { selectionStart, selectionEnd } = target;
    if (selectionStart === null || selectionEnd === null) {
      return false;
    }

    const selectionStartIndex = Math.min(selectionStart, selectionEnd);
    const selectionEndIndex = Math.max(selectionStart, selectionEnd);

    if (key === "ArrowLeft") {
      return selectionStartIndex === 0;
    }

    return selectionEndIndex === target.value.length;
  }
}
