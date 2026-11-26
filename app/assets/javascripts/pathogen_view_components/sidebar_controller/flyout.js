const FLYOUT_GAP = 8;
const VIEWPORT_PADDING = 8;
const FOCUSABLE = "a[href], button:not(:disabled), [tabindex]:not([tabindex='-1'])";
const SOURCE_LIST = '[data-pathogen-sidebar-children="source"]';
const FLYOUT_LIST = '[data-pathogen-sidebar-children="flyout"]';
const POSITION_PROPERTIES = ["top", "left", "right", "max-height"];

const hasModifier = (event) => event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;

// Owns the rail-mode flyout: open/close, positioning, keyboard and dismissal.
// Child links are mirrored from the item's expanded list on every open, so the
// flyout never goes stale and ids are never duplicated in server-rendered markup.
// Document and window listeners exist only while a flyout is open.
export class SidebarFlyout {
  #controller;
  #active = null;
  #trigger = null;
  #listeners = null;

  constructor(controller) {
    this.#controller = controller;
  }

  get activeTrigger() {
    return this.#trigger;
  }

  isActiveFor(flyout) {
    return flyout !== null && this.#active === flyout;
  }

  toggle(event) {
    if (!this.#isRailMode()) return;

    const trigger = event.currentTarget;
    const flyout = this.findFlyoutForTrigger(trigger);
    if (!flyout) return;

    if (this.#active === flyout) {
      this.close({ restoreFocus: true });
      return;
    }

    this.#open(trigger, flyout);
  }

  // Rail trigger keys: the inline-end arrow opens the flyout (or re-enters one
  // that is already open) and moves focus into it; the inline-start arrow closes
  // it. Modified arrows are left alone so browser Back/Forward keep working.
  handleTriggerKeydown(event) {
    if (!this.#isRailMode() || hasModifier(event)) return;

    const trigger = event.currentTarget;
    const flyout = this.findFlyoutForTrigger(trigger);
    if (!flyout) return;

    if (event.key === this.#openKey()) {
      event.preventDefault();
      if (this.#active !== flyout) this.#open(trigger, flyout);
      this.#active.querySelector(FOCUSABLE)?.focus();
      return;
    }

    if (event.key === this.#closeKey() && this.#active === flyout) {
      event.preventDefault();
      this.close({ restoreFocus: true });
    }
  }

  // Inside the flyout, the inline-start arrow returns to the rail trigger.
  handleFlyoutKeydown(event) {
    if (hasModifier(event) || event.key !== this.#closeKey()) return;

    event.preventDefault();
    this.close({ restoreFocus: true });
  }

  close({ restoreFocus = false } = {}) {
    if (!this.#active) return;

    const flyout = this.#active;
    const trigger = this.#trigger;

    this.#listeners.abort();
    this.#listeners = null;
    this.#active = null;
    this.#trigger = null;

    flyout.hidden = true;
    POSITION_PROPERTIES.forEach((property) => flyout.style.removeProperty(property));
    trigger.setAttribute("aria-expanded", "false");
    this.#controller.syncTooltips();

    if (restoreFocus && trigger.isConnected) trigger.focus();
  }

  findFlyoutForTrigger(trigger) {
    const id = trigger.dataset.pathogenSidebarFlyoutId;

    return this.#controller.flyoutTargets.find((candidate) => candidate.id === id) || null;
  }

  #open(trigger, flyout) {
    this.close();
    this.#populate(flyout);

    this.#active = flyout;
    this.#trigger = trigger;

    flyout.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    this.#controller.syncTooltips();
    this.#position();
    this.#listen();
  }

  #listen() {
    this.#listeners = new AbortController();
    const { signal } = this.#listeners;

    document.addEventListener("pointerdown", (event) => this.#onPointerDown(event), { signal });
    document.addEventListener("focusin", (event) => this.#onFocusIn(event), { signal });
    document.addEventListener("keydown", (event) => this.#onKeyDown(event), { signal });
    window.addEventListener("resize", () => this.#position(), { signal });
    window.addEventListener("scroll", (event) => this.#onScroll(event), { capture: true, signal });
  }

  // Mirrors the item's expanded child links into the flyout, stripping ids and
  // controllers so nothing is duplicated across the two presentations.
  #populate(flyout) {
    const list = flyout.querySelector(FLYOUT_LIST);
    const source = flyout.parentElement.querySelector(SOURCE_LIST);
    if (!list || !source) return;

    const clones = Array.from(source.children, (child) => {
      const clone = child.cloneNode(true);
      [clone, ...clone.querySelectorAll("[id], [data-controller]")].forEach((node) => {
        node.removeAttribute("id");
        node.removeAttribute("data-controller");
      });
      return clone;
    });

    list.replaceChildren(...clones);
  }

  #contains(target) {
    return this.#active.contains(target) || this.#trigger.contains(target);
  }

  #onPointerDown(event) {
    if (!this.#contains(event.target)) this.close();
  }

  // Focus moving on past the flyout closes it, so it can never sit on top of
  // the control that now has focus. Focus itself is left where the user put it.
  #onFocusIn(event) {
    if (!this.#contains(event.target)) this.close();
  }

  // Escape returns focus to the trigger only when focus is in the flyout or on
  // its trigger. From anywhere else it just closes, leaving the key to the host.
  #onKeyDown(event) {
    if (event.key !== "Escape") return;

    if (this.#contains(document.activeElement)) {
      event.preventDefault();
      this.close({ restoreFocus: true });
      return;
    }

    this.close();
  }

  #onScroll(event) {
    if (event.target instanceof Node && this.#active.contains(event.target)) return;

    this.#position();
  }

  // Width comes from the stylesheet. Height is measured without the previous
  // inline clamp so the flyout grows back after a resize or zoom change.
  #position() {
    const flyout = this.#active;
    flyout.style.removeProperty("max-height");

    const triggerRect = this.#trigger.getBoundingClientRect();
    const height = flyout.getBoundingClientRect().height;
    const maxTop = Math.max(VIEWPORT_PADDING, window.innerHeight - height - VIEWPORT_PADDING);
    const top = Math.min(Math.max(triggerRect.top, VIEWPORT_PADDING), maxTop);

    flyout.style.top = `${top}px`;
    flyout.style.maxHeight = `${Math.max(0, window.innerHeight - top - VIEWPORT_PADDING)}px`;

    if (this.#isRtl()) {
      flyout.style.right = `${Math.max(VIEWPORT_PADDING, window.innerWidth - triggerRect.left + FLYOUT_GAP)}px`;
      flyout.style.removeProperty("left");
      return;
    }

    flyout.style.left = `${Math.max(VIEWPORT_PADDING, triggerRect.right + FLYOUT_GAP)}px`;
    flyout.style.removeProperty("right");
  }

  #isRailMode() {
    return this.#controller.mode === "rail";
  }

  // Matches the stylesheet, which mirrors on `:dir(rtl)` at any ancestor.
  #isRtl() {
    return this.#controller.element.matches(":dir(rtl)");
  }

  #openKey() {
    return this.#isRtl() ? "ArrowLeft" : "ArrowRight";
  }

  #closeKey() {
    return this.#isRtl() ? "ArrowRight" : "ArrowLeft";
  }
}
