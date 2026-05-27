import { Controller } from "@hotwired/stimulus";

const TOOLBAR_ERROR_CLASS =
  "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100";

const TEXT_ENTRY_SELECTOR =
  'input:not([type=button]):not([type=submit]):not([type=reset]):not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]):not([type=image]), textarea, [contenteditable]:not([contenteditable="false"])';

export default class extends Controller {
  static targets = ["item"];

  #items = [];

  connect() {
    // v1 intentionally captures the initial item set only; dynamic updates require reconnect.
    this.#items = [...this.itemTargets];

    if (this.#items.length === 0) {
      this.element.innerHTML = `<div class="${TOOLBAR_ERROR_CLASS}">At least one toolbar item target is required</div>`;
      return;
    }

    this.#setInitialTabStop();
    this.element.dataset.controllerConnected = "true";
  }

  handleKeyDown(event) {
    if (this.#isTextEntryTarget(event.target)) {
      return;
    }

    const currentItem = this.#itemForTarget(event.target);
    if (!currentItem) {
      return;
    }

    const currentIndex = this.#items.indexOf(currentItem);
    if (currentIndex === -1) {
      return;
    }

    const handlers = {
      ArrowRight: () => this.#focusIndex(this.#nextIndex(currentIndex)),
      ArrowLeft: () => this.#focusIndex(this.#previousIndex(currentIndex)),
      Home: () => this.#focusIndex(0),
      End: () => this.#focusIndex(this.#items.length - 1),
    };

    const handler = handlers[event.key];
    if (!handler) {
      return;
    }

    event.preventDefault();
    handler();
  }

  handleFocusIn(event) {
    const item = this.#itemForTarget(event.target);
    if (!item) {
      return;
    }

    const index = this.#items.indexOf(item);
    if (index === -1) {
      return;
    }

    this.#setTabStop(index);
  }

  handleClick(event) {
    const item = this.#itemForTarget(event.target);
    if (!item || !this.#isAriaDisabled(item)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  }

  disconnect() {
    delete this.element.dataset.controllerConnected;
    this.#items = [];
  }

  #setInitialTabStop() {
    this.#items.forEach((item) => {
      item.tabIndex = -1;
    });

    const firstEnabledIndex = this.#items.findIndex((item) => !this.#isAriaDisabled(item));
    this.#setTabStop(firstEnabledIndex === -1 ? 0 : firstEnabledIndex);
  }

  #setTabStop(index) {
    this.#items.forEach((item, itemIndex) => {
      item.tabIndex = itemIndex === index ? 0 : -1;
    });
  }

  #focusIndex(index) {
    const item = this.#items[index];
    if (!item) {
      return;
    }

    item.focus();
    this.#setTabStop(index);
  }

  #nextIndex(currentIndex) {
    return (currentIndex + 1) % this.#items.length;
  }

  #previousIndex(currentIndex) {
    return (currentIndex - 1 + this.#items.length) % this.#items.length;
  }

  #itemForTarget(target) {
    if (!(target instanceof Node)) {
      return null;
    }

    return this.#items.find((item) => item === target || item.contains(target)) || null;
  }

  #isAriaDisabled(item) {
    return item.getAttribute("aria-disabled") === "true";
  }

  #isTextEntryTarget(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(target.closest(TEXT_ENTRY_SELECTOR));
  }
}
