import { Controller } from "@hotwired/stimulus";

import { MOVE_BACKWARD, MOVE_FORWARD, TOOLBAR_NAV_KEYS } from "pathogen_view_components/toolbar_controller/constants";
import {
  connectedItemForTarget,
  nextIndex,
  previousIndex,
  setInitialTabStop,
  setTabStopForItems,
} from "pathogen_view_components/toolbar_controller/roving_focus";
import {
  isTextEntryTarget,
  placeTextEntryCaret,
  shouldNavigateFromTextEntry,
} from "pathogen_view_components/toolbar_controller/text_entry";
import { isAriaDisabled, isVisibleItem, visibleItems } from "pathogen_view_components/toolbar_controller/visibility";

export default class extends Controller {
  static targets = ["item"];

  #items = [];

  #boundSyncItems = null;

  #boundHandleSubmitEnd = null;

  #lastFocusedToolbarItemId = null;

  connect() {
    if (this.itemTargets.length === 0) {
      // Invalid configuration is a development error per the v1 contract: fail
      // fast without mutating consumer markup and without claiming a connection.
      console.error("[pathogen--toolbar] At least one toolbar item target is required.");
      return;
    }

    this.#bindDomSync();
    this.#boundHandleSubmitEnd = this.handleSubmitEnd.bind(this);
    this.element.addEventListener("turbo:submit-end", this.#boundHandleSubmitEnd);

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

    const currentItem = this.#itemFromTarget(event.target);
    if (!currentItem) {
      return;
    }

    const items = visibleItems(this.#items);
    if (items.length === 0) {
      return;
    }

    const currentIndex = items.indexOf(currentItem);
    if (currentIndex === -1) {
      return;
    }

    if (isTextEntryTarget(event.target) && !shouldNavigateFromTextEntry(event.target, event.key)) {
      return;
    }

    const handlers = {
      ArrowRight: () => this.#focusVisibleIndex(items, nextIndex(currentIndex, items.length), MOVE_FORWARD),
      ArrowLeft: () => this.#focusVisibleIndex(items, previousIndex(currentIndex, items.length), MOVE_BACKWARD),
      Home: () => this.#focusVisibleIndex(items, 0),
      End: () => this.#focusVisibleIndex(items, items.length - 1),
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

    if (!visibleItems(this.#items).includes(item)) {
      return;
    }

    if (item.id) {
      this.#lastFocusedToolbarItemId = item.id;
    }

    setTabStopForItems(this.#items, item);
  }

  handleSubmitEnd(event) {
    if (!(event.target instanceof Element) || !this.element.contains(event.target)) {
      return;
    }

    const submitter = event.detail?.formSubmission?.submitter;
    if (!(submitter instanceof HTMLElement) || !this.element.contains(submitter)) {
      return;
    }

    const item = connectedItemForTarget(this.#items, submitter);
    if (!item) {
      return;
    }

    queueMicrotask(() => {
      this.#focusToolbarItem(item);
    });
  }

  handleClick(event) {
    const item = this.#itemFromTarget(event.target);
    if (!item || !isAriaDisabled(item)) {
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

  #focusVisibleIndex(items, index, moveDirection = null) {
    const item = items[index];
    if (!item) {
      return;
    }

    item.focus();
    setTabStopForItems(this.#items, item);

    if (moveDirection) {
      placeTextEntryCaret(item, moveDirection);
    }
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

    const focusedItem = connectedItemForTarget(this.#items, document.activeElement);
    if (focusedItem && isVisibleItem(focusedItem)) {
      setTabStopForItems(this.#items, focusedItem);
      return;
    }

    if (this.#restoreLastFocusedToolbarItem()) {
      return;
    }

    setInitialTabStop(this.#items);
  }

  #focusToolbarItem(item) {
    if (!item?.isConnected || !isVisibleItem(item)) {
      return;
    }

    item.focus({ focusVisible: true });
    setTabStopForItems(this.#items, item);
  }

  #restoreLastFocusedToolbarItem() {
    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement &&
      activeElement.isConnected &&
      connectedItemForTarget(this.#items, activeElement)
    ) {
      return false;
    }

    if (!this.#lastFocusedToolbarItemId) {
      return false;
    }

    const item = this.#items.find(
      (toolbarItem) => toolbarItem.isConnected && toolbarItem.id === this.#lastFocusedToolbarItemId,
    );

    if (!item || !isVisibleItem(item)) {
      return false;
    }

    this.#focusToolbarItem(item);
    return true;
  }

  #itemFromTarget(target) {
    const item = connectedItemForTarget(this.#items, target);
    if (item) {
      return item;
    }

    this.#syncItemsAfterDomChange();
    return connectedItemForTarget(this.#items, target);
  }
}
