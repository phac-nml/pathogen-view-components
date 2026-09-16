const FLYOUT_GAP = 8;
const VIEWPORT_PADDING = 8;
const MAX_FLYOUT_WIDTH = 288;

// Owns the rail-mode flyout: open/close, positioning, keyboard and outside-click
// dismissal, and one-time population of child links cloned from the item's
// expanded panel so ids are never duplicated in the server-rendered markup.
export class SidebarFlyout {
  constructor(controller) {
    this.controller = controller;
    this.active = null;
    this.activeTrigger = null;
    this.onDocumentPointerDown = this.onDocumentPointerDown.bind(this);
    this.onDocumentKeyDown = this.onDocumentKeyDown.bind(this);
    this.onViewportReflow = this.onViewportReflow.bind(this);
  }

  connect() {
    document.addEventListener("pointerdown", this.onDocumentPointerDown);
    document.addEventListener("keydown", this.onDocumentKeyDown);
    window.addEventListener("resize", this.onViewportReflow, { passive: true });
    window.addEventListener("scroll", this.onViewportReflow, true);
  }

  disconnect() {
    document.removeEventListener("pointerdown", this.onDocumentPointerDown);
    document.removeEventListener("keydown", this.onDocumentKeyDown);
    window.removeEventListener("resize", this.onViewportReflow);
    window.removeEventListener("scroll", this.onViewportReflow, true);
    this.close({ restoreFocus: false });
  }

  isActiveFor(flyout) {
    return flyout !== null && this.active === flyout;
  }

  toggle(event) {
    event?.preventDefault();
    if (!this.controller.isRailMode()) return;

    const trigger = event?.currentTarget;
    const flyout = this.findFlyoutForTrigger(trigger);
    if (!trigger || !flyout) return;

    if (this.active === flyout) {
      this.close({ restoreFocus: true });
      return;
    }

    this.open(trigger, flyout);
  }

  handleTriggerKeydown(event) {
    if (!this.controller.isRailMode()) return;

    const openKey = this.isRtl() ? "ArrowLeft" : "ArrowRight";
    const closeKey = this.isRtl() ? "ArrowRight" : "ArrowLeft";

    if (event.key === openKey) {
      event.preventDefault();
      this.toggle(event);
      this.focusFirstItem();
      return;
    }

    if (event.key === closeKey || event.key === "Escape") {
      if (!this.active) return;

      event.preventDefault();
      this.close({ restoreFocus: true });
    }
  }

  open(trigger, flyout) {
    this.close({ restoreFocus: false });
    this.populate(flyout);

    this.active = flyout;
    this.activeTrigger = trigger;

    flyout.hidden = false;
    flyout.dataset.state = "open";
    trigger.setAttribute("aria-expanded", "true");
    this.position(trigger, flyout);
  }

  close({ restoreFocus } = { restoreFocus: false }) {
    if (!this.active) return;

    const trigger = this.activeTrigger;

    this.active.hidden = true;
    delete this.active.dataset.state;
    this.active.style.removeProperty("top");
    this.active.style.removeProperty("left");
    this.active.style.removeProperty("right");

    if (trigger?.isConnected) {
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus && typeof trigger.focus === "function") {
        trigger.focus();
      }
    }

    this.active = null;
    this.activeTrigger = null;
  }

  focusFirstItem() {
    if (!this.active) return;

    const first = this.active.querySelector("a[href], button:not(:disabled), [tabindex]:not([tabindex='-1'])");
    first?.focus();
  }

  findFlyoutForTrigger(trigger) {
    const id = trigger?.dataset?.pathogenSidebarFlyoutId;
    if (!id) return null;

    return this.controller.flyoutTargets.find((candidate) => candidate.id === id) || null;
  }

  // Mirrors the item's expanded child links into the flyout once, stripping ids
  // and controllers so nothing is duplicated across the two presentations.
  populate(flyout) {
    const list = flyout.querySelector("ul.pathogen-sidebar-item__children");
    if (!list || list.children.length > 0) return;

    const item = flyout.closest(".pathogen-sidebar-item");
    const source = item?.querySelector(".pathogen-sidebar-item__expanded ul.pathogen-sidebar-item__children");
    if (!source) return;

    const clones = Array.from(source.children).map((child) => {
      const clone = child.cloneNode(true);
      if (clone.id) clone.removeAttribute("id");
      clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      clone.querySelectorAll("[data-controller]").forEach((node) => node.removeAttribute("data-controller"));
      return clone;
    });

    list.replaceChildren(...clones);
  }

  onDocumentPointerDown(event) {
    if (!this.active) return;
    if (this.active.contains(event.target)) return;
    if (this.activeTrigger?.contains(event.target)) return;

    this.close({ restoreFocus: false });
  }

  onDocumentKeyDown(event) {
    if (event.key !== "Escape" || !this.active) return;

    event.preventDefault();
    this.close({ restoreFocus: true });
  }

  onViewportReflow() {
    if (!this.active || !this.activeTrigger) return;

    if (!this.controller.isRailMode()) {
      this.close({ restoreFocus: false });
      return;
    }

    this.position(this.activeTrigger, this.active);
  }

  position(trigger, flyout) {
    const triggerRect = trigger.getBoundingClientRect();
    const isRtl = this.isRtl();

    const width = Math.min(MAX_FLYOUT_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2);
    flyout.style.maxWidth = `${width}px`;

    const measuredHeight = flyout.getBoundingClientRect().height;
    const maxTop = Math.max(VIEWPORT_PADDING, window.innerHeight - measuredHeight - VIEWPORT_PADDING);
    const top = Math.min(Math.max(triggerRect.top, VIEWPORT_PADDING), maxTop);
    flyout.style.top = `${top}px`;

    if (isRtl) {
      const right = Math.max(VIEWPORT_PADDING, window.innerWidth - triggerRect.left + FLYOUT_GAP);
      flyout.style.right = `${right}px`;
      flyout.style.removeProperty("left");
      return;
    }

    const left = Math.max(VIEWPORT_PADDING, triggerRect.right + FLYOUT_GAP);
    flyout.style.left = `${left}px`;
    flyout.style.removeProperty("right");
  }

  isRtl() {
    return document.documentElement.dir === "rtl";
  }
}
