import { Controller } from "@hotwired/stimulus";
import { arrow, autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";

/**
 * Shared registry for global event delegation.
 * Single set of document-level listeners for all tooltip instances.
 */
class TooltipRegistry {
  #controllers = new Set();
  #abortController = null;
  #pageShowListener = null;

  register(controller) {
    this.#controllers.add(controller);
    if (!this.#abortController) {
      this.#setupGlobalListeners();
    }
    if (!this.#pageShowListener) {
      this.#pageShowListener = (event) => this.#handlePageShow(event);
      window.addEventListener("pageshow", this.#pageShowListener);
    }
  }

  unregister(controller) {
    this.#controllers.delete(controller);
    if (this.#controllers.size === 0) {
      this.#teardownGlobalListeners();
      if (this.#pageShowListener) {
        window.removeEventListener("pageshow", this.#pageShowListener);
        this.#pageShowListener = null;
      }
    }
  }

  #handlePageShow(event) {
    if (!event.persisted) return;

    this.#controllers.forEach((controller) => {
      controller.recoverFromPageCache?.();
    });
  }

  hideAllExcept(activeController) {
    this.#controllers.forEach((c) => {
      if (c !== activeController) {
        c.hide();
      }
    });
  }

  #setupGlobalListeners() {
    this.#abortController = new AbortController();
    const { signal } = this.#abortController;

    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          this.#controllers.forEach((c) => c.handleEscape(event));
        }
      },
      { signal },
    );

    document.addEventListener(
      "touchstart",
      (event) => {
        this.#controllers.forEach((c) => c.handleTouchOutside(event));
      },
      { signal, passive: true },
    );
  }

  #teardownGlobalListeners() {
    this.#abortController?.abort();
    this.#abortController = null;
  }
}

const tooltipRegistry = new TooltipRegistry();
const TOOLTIP_PORTAL_ID = "pathogen-tooltip-portal";

/**
 * Pathogen::Tooltip Stimulus Controller
 *
 * Viewport-aware tooltip positioning powered by Floating UI.
 * Uses computePosition with offset/flip/shift/arrow middleware plus autoUpdate
 * for scroll/resize adaptation.
 *
 * Visual state is driven by semantic attributes:
 * - `data-state="open"` / `data-state="closed"` on the tooltip element
 * - `aria-hidden="false"` / `aria-hidden="true"` on the tooltip element
 * CSS in tooltip.css reacts to `[data-state="open"]` for show/hide animation.
 *
 * ## Features
 * - Collision-aware positioning with configurable middleware
 * - Optional arrow element with automatic placement
 * - Configurable autoUpdate for performance tuning
 * - Touch device support with tap-to-show/tap-to-navigate
 * - Respects prefers-reduced-motion
 * - Portals tooltip to a stable landmark while open (Turbo cache safe)
 *
 * ## Accessibility (W3C ARIA APG Tooltip Pattern)
 * - Tooltip remains open over trigger OR tooltip
 * - Escape key dismissal
 * - Focus loss dismissal
 * - Touch outside dismissal
 * - Requires aria-describedby from trigger to tooltip
 * - Validates keyboard accessibility
 * - Prevents simultaneous tooltips
 *
 * @example Basic usage
 * <div data-controller="pathogen--tooltip"
 *      data-pathogen--tooltip-portal-aria-label-value="Tooltips">
 *   <button data-pathogen--tooltip-target="trigger"
 *           aria-describedby="tip-1">Hover me</button>
 *   <div id="tip-1" role="tooltip"
 *        data-pathogen--tooltip-target="tooltip"
 *        data-state="closed">
 *     Tooltip content
 *   </div>
 * </div>
 */
export default class extends Controller {
  static targets = ["trigger", "tooltip"];

  static values = {
    spacing: { type: Number, default: 8 },
    viewportPadding: { type: Number, default: 8 },
    touchDismissDelay: { type: Number, default: 3000 },
    hideDelay: { type: Number, default: 300 },
    // autoUpdate options
    ancestorScroll: { type: Boolean, default: true },
    ancestorResize: { type: Boolean, default: true },
    elementResize: { type: Boolean, default: true },
    layoutShift: { type: Boolean, default: true },
    animationFrame: { type: Boolean, default: false },
    // Set from I18n in Ruby wrappers (e.g. Pathogen::Link); English fallback for manual markup.
    portalAriaLabel: { type: String, default: "Tooltips" },
  };

  // Private fields - store direct references since tooltip may be portaled while open
  #cleanupAutoUpdate = null;
  #touchDismissTimeout = null;
  #hideTimeout = null;
  #hideAfterTransitionTimeout = null;
  #touchPrimed = false;
  #touchStarted = false;
  #escapeDismissed = false;
  #abortController = null;
  #boundBeforeCache = null;
  #bindingsActive = false;
  #originalParent = null;
  #tooltipElement = null;
  #triggerElement = null;
  #arrowElement = null;

  connect() {
    this.element.dataset.controllerConnected = "true";
    this.#resetAbortController();
    this.#registerBeforeCacheListener();
    tooltipRegistry.register(this);
    this.#reconcileTooltipDom();
    this.#activateBindings();
  }

  /**
   * Re-sync after browser back-forward cache restore (pageshow with persisted).
   * Turbo cache restore uses connect(); bfcache may skip that lifecycle.
   */
  recoverFromPageCache() {
    if (!this.element.isConnected) return;

    this.#resetAbortController();
    this.#reconcileTooltipDom();
    this.#activateBindings();
  }

  disconnect() {
    // Ensure portaled tooltip is fully hidden before teardown to avoid lingering visibility
    this.hide();
    this.#clearHideTimeout();
    this.#stopAutoUpdate();
    this.#clearTouchTimeout();
    this.#abortController?.abort();
    this.#abortController = null;
    this.#bindingsActive = false;
    this.#unregisterBeforeCacheListener();
    tooltipRegistry.unregister(this);
    this.#restoreTooltipToOriginalParent();
    delete this.element.dataset.controllerConnected;
  }

  triggerTargetConnected(element) {
    this.#triggerElement = element;
    this.#activateBindings();
  }

  triggerTargetDisconnected(element) {
    if (this.#triggerElement === element) {
      this.#triggerElement = null;
      this.#bindingsActive = false;
    }
  }

  tooltipTargetConnected(element) {
    this.#captureTooltipElement(element);
    this.#activateBindings();
  }

  tooltipTargetDisconnected(element) {
    if (this.#tooltipElement === element) {
      // Stimulus emits targetDisconnected when we portal the tooltip from the controller
      // element to the tooltip portal. In that case we must keep the direct reference.
      if (element.isConnected && element.parentElement !== this.#originalParent) {
        return;
      }

      this.#tooltipElement = null;
      this.#arrowElement = null;
      this.#bindingsActive = false;
    }
  }

  /**
   * Shows the tooltip with positioning and optional animation.
   * Sets data-state="open" and aria-hidden="false" on the tooltip element.
   */
  show() {
    if (!this.#tooltipElement || this.#escapeDismissed) return;

    this.#hideOtherTooltips();
    this.#clearHideAfterTransitionTimeout();
    this.#portalTooltipIfNeeded();
    this.#tooltipElement.removeAttribute("hidden");

    this.#tooltipElement.dataset.state = "open";
    this.#tooltipElement.setAttribute("aria-hidden", "false");

    this.#startAutoUpdate();
    this.#positionTooltip();
  }

  /**
   * Hides the tooltip.
   * Sets data-state="closed" and aria-hidden="true" on the tooltip element.
   */
  hide() {
    if (!this.#tooltipElement) return;

    this.#clearTouchTimeout();
    this.#clearHideTimeout();
    this.#clearHideAfterTransitionTimeout();
    this.#touchPrimed = false;

    this.#tooltipElement.dataset.state = "closed";
    this.#tooltipElement.setAttribute("aria-hidden", "true");

    this.#stopAutoUpdate();
    this.#scheduleHideAfterTransition();
  }

  /**
   * Handles Escape key dismissal (called by registry).
   */
  handleEscape() {
    if (!this.#tooltipElement || !this.#isVisible()) return;

    this.#escapeDismissed = true;
    this.hide();

    if (this.#triggerElement) {
      this.#triggerElement.focus();
    }

    setTimeout(() => {
      this.#escapeDismissed = false;
    }, 100);
  }

  /**
   * Handles touch outside dismissal (called by registry).
   */
  handleTouchOutside(event) {
    if (!this.#tooltipElement || !this.#triggerElement || !this.#isVisible()) return;

    const target = event.target;
    const isOutside =
      !this.#tooltipElement.contains(target) &&
      !this.#triggerElement.contains(target) &&
      !this.element.contains(target);

    if (isOutside) {
      this.hide();
    }
  }

  // Private methods

  #activateBindings() {
    if (!this.element.isConnected || !this.element.dataset.controllerConnected) return;
    if (!this.#triggerElement || !this.#tooltipElement) return;

    if (this.#bindingsActive) return;

    this.#validateAriaDescribedBy(this.#triggerElement);
    this.#validateKeyboardAccessibility(this.#triggerElement);
    this.#bindTriggerListeners(this.#triggerElement);
    this.#bindTooltipListeners(this.#tooltipElement);
    this.#bindingsActive = true;
  }

  #bindTriggerListeners(element) {
    const { signal } = this.#ensureAbortController();

    element.addEventListener(
      "mouseenter",
      () => {
        this.#clearHideTimeout();
        this.show();
      },
      { signal },
    );

    element.addEventListener(
      "mouseleave",
      () => {
        this.#scheduleHide();
      },
      { signal },
    );

    element.addEventListener("focusin", () => this.show(), { signal });
    element.addEventListener("focusout", () => this.hide(), { signal });
    element.addEventListener("touchstart", (e) => this.#handleTouchStart(e), {
      signal,
      passive: true,
    });
    element.addEventListener("click", (e) => this.#handleClick(e), { signal });
  }

  #bindTooltipListeners(element) {
    const { signal } = this.#ensureAbortController();

    element.addEventListener(
      "mouseenter",
      () => {
        this.#clearHideTimeout();
      },
      { signal },
    );
    element.addEventListener(
      "mouseleave",
      () => {
        this.#scheduleHide();
      },
      { signal },
    );
  }

  #captureTooltipElement(element) {
    this.#tooltipElement = element;
    this.#arrowElement = element.querySelector('[data-pathogen--tooltip-target="arrow"]');
  }

  #reconcileTooltipDom() {
    if (!this.#triggerElement && this.hasTriggerTarget) {
      this.#triggerElement = this.triggerTarget;
    }

    if (!this.#tooltipElement) {
      if (this.hasTooltipTarget) {
        this.#captureTooltipElement(this.tooltipTarget);
      } else if (this.#triggerElement) {
        const tooltipId = this.#tooltipIdFromTrigger(this.#triggerElement);
        const tooltip = tooltipId ? document.getElementById(tooltipId) : null;
        if (tooltip) {
          this.#captureTooltipElement(tooltip);
        }
      }
    }

    if (this.#tooltipElement && !this.element.contains(this.#tooltipElement)) {
      this.#originalParent = this.element;
      this.element.appendChild(this.#tooltipElement);
    }
  }

  #tooltipIdFromTrigger(triggerElement) {
    const describedBy = triggerElement.getAttribute("aria-describedby");
    if (!describedBy) return null;

    return describedBy.split(/\s+/).filter(Boolean).at(-1) ?? null;
  }

  #handleTouchStart() {
    if (!this.#tooltipElement || !this.#triggerElement) return;
    this.#touchStarted = true;
  }

  #handleClick(event) {
    if (!this.#tooltipElement || !this.#triggerElement || !this.#touchStarted) return;

    this.#touchStarted = false;

    if (this.#isVisible() && this.#touchPrimed) {
      this.#touchPrimed = false;
      this.hide();
    } else {
      this.#touchPrimed = true;
      event.preventDefault();
      this.show();
      this.#startTouchDismissTimer();
    }
  }

  #positionTooltip() {
    if (!this.#triggerElement || !this.#tooltipElement) return;

    const placement = this.#tooltipElement.dataset.placement || "top";
    const middleware = [
      offset(this.spacingValue),
      flip({ padding: this.viewportPaddingValue }),
      shift({ padding: this.viewportPaddingValue }),
    ];

    if (this.#arrowElement) {
      middleware.push(arrow({ element: this.#arrowElement }));
    }

    computePosition(this.#triggerElement, this.#tooltipElement, {
      placement,
      strategy: "fixed",
      middleware,
    })
      .then(({ x, y, placement: finalPlacement, middlewareData }) => {
        if (!this.#tooltipElement) return;

        this.#tooltipElement.dataset.currentPlacement = finalPlacement;

        Object.assign(this.#tooltipElement.style, {
          top: `${y}px`,
          left: `${x}px`,
        });

        if (this.#arrowElement && middlewareData.arrow) {
          this.#positionArrow(finalPlacement, middlewareData.arrow);
        }
      })
      .catch(() => {
        if (!this.#tooltipElement) return;

        Object.assign(this.#tooltipElement.style, {
          top: "-9999px",
          left: "-9999px",
        });
      });
  }

  #positionArrow(placement, arrowData) {
    if (!this.#arrowElement) return;

    const { x: arrowX, y: arrowY } = arrowData;

    const staticSide = {
      top: "bottom",
      right: "left",
      bottom: "top",
      left: "right",
    }[placement.split("-")[0]];

    Object.assign(this.#arrowElement.style, {
      left: arrowX != null ? `${arrowX}px` : "",
      top: arrowY != null ? `${arrowY}px` : "",
      right: "",
      bottom: "",
      [staticSide]: "-4px",
    });
  }

  #startAutoUpdate() {
    if (!this.#triggerElement || !this.#tooltipElement) return;
    if (this.#cleanupAutoUpdate) return;

    this.#cleanupAutoUpdate = autoUpdate(this.#triggerElement, this.#tooltipElement, () => this.#positionTooltip(), {
      ancestorScroll: this.ancestorScrollValue,
      ancestorResize: this.ancestorResizeValue,
      elementResize: this.elementResizeValue,
      layoutShift: this.layoutShiftValue,
      animationFrame: this.animationFrameValue,
    });
  }

  #stopAutoUpdate() {
    this.#cleanupAutoUpdate?.();
    this.#cleanupAutoUpdate = null;
  }

  #startTouchDismissTimer() {
    this.#clearTouchTimeout();

    this.#touchDismissTimeout = setTimeout(() => {
      this.hide();
      this.#touchPrimed = false;
      this.#touchDismissTimeout = null;
    }, this.touchDismissDelayValue);
  }

  #clearTouchTimeout() {
    if (this.#touchDismissTimeout) {
      clearTimeout(this.#touchDismissTimeout);
      this.#touchDismissTimeout = null;
    }
  }

  #scheduleHideAfterTransition() {
    if (!this.#tooltipElement) return;

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const transitionMs = prefersReducedMotion ? 0 : 200;

    this.#hideAfterTransitionTimeout = setTimeout(() => {
      // Only hide if we are still closed (avoid race when reopened quickly)
      if (this.#tooltipElement?.dataset.state === "closed") {
        this.#tooltipElement.setAttribute("hidden", "");
        this.#restoreTooltipToOriginalParent();
      }
      this.#hideAfterTransitionTimeout = null;
    }, transitionMs);
  }

  #clearHideAfterTransitionTimeout() {
    if (this.#hideAfterTransitionTimeout) {
      clearTimeout(this.#hideAfterTransitionTimeout);
      this.#hideAfterTransitionTimeout = null;
    }
  }

  #scheduleHide() {
    this.#clearHideTimeout();
    this.#hideTimeout = setTimeout(() => {
      this.hide();
    }, this.hideDelayValue);
  }

  #clearHideTimeout() {
    if (this.#hideTimeout) {
      clearTimeout(this.#hideTimeout);
      this.#hideTimeout = null;
    }
  }

  #portalTooltipIfNeeded() {
    if (!this.#tooltipElement || this.#tooltipElement.closest("dialog")) return;
    if (this.#tooltipElement.parentElement !== this.#originalParent && this.#originalParent) return;

    this.#portalTooltip(this.#tooltipElement);
  }

  #portalTooltip(tooltipElement) {
    // Store original parent for cleanup
    this.#originalParent = tooltipElement.parentElement;

    this.#portalTarget().appendChild(tooltipElement);
  }

  #portalTarget() {
    const existingPortal = document.getElementById(TOOLTIP_PORTAL_ID);
    if (existingPortal) return existingPortal;

    const portal = document.createElement("div");
    portal.id = TOOLTIP_PORTAL_ID;
    portal.setAttribute("role", "region");
    portal.setAttribute("aria-label", this.portalAriaLabelValue);
    portal.setAttribute("data-pathogen-tooltip-portal", "");
    document.body.appendChild(portal);
    return portal;
  }

  #resetAbortController() {
    this.#abortController?.abort();
    this.#abortController = new AbortController();
    this.#bindingsActive = false;
  }

  #ensureAbortController() {
    if (!this.#abortController) {
      this.#abortController = new AbortController();
    }

    return this.#abortController;
  }

  #registerBeforeCacheListener() {
    if (this.#boundBeforeCache) return;

    this.#boundBeforeCache = () => {
      this.hide();
      this.#restoreTooltipToOriginalParent();
    };
    document.addEventListener("turbo:before-cache", this.#boundBeforeCache);
  }

  #unregisterBeforeCacheListener() {
    if (!this.#boundBeforeCache) return;

    document.removeEventListener("turbo:before-cache", this.#boundBeforeCache);
    this.#boundBeforeCache = null;
  }

  #restoreTooltipToOriginalParent() {
    if (!this.#tooltipElement) return;

    const parent = this.#originalParent ?? this.element;
    if (this.#tooltipElement.parentElement !== parent && parent?.isConnected) {
      parent.appendChild(this.#tooltipElement);
    }
  }

  #isVisible() {
    return this.#tooltipElement && this.#tooltipElement.dataset.state === "open";
  }

  #hideOtherTooltips() {
    tooltipRegistry.hideAllExcept(this);
  }

  #validateAriaDescribedBy(triggerElement) {
    if (!this.#tooltipElement) return;

    const tooltipId = this.#tooltipElement.id;
    if (!tooltipId) {
      console.error("[Pathogen::Tooltip] Tooltip element must have an id attribute.");
      return;
    }

    const describedBy = triggerElement.getAttribute("aria-describedby");
    if (!describedBy) {
      triggerElement.setAttribute("aria-describedby", tooltipId);
      console.error(`[Pathogen::Tooltip] Trigger missing aria-describedby="${tooltipId}".`);
      return;
    }

    const ids = describedBy.split(/\s+/).filter(Boolean);
    if (!ids.includes(tooltipId)) {
      triggerElement.setAttribute("aria-describedby", `${describedBy} ${tooltipId}`.trim());
      console.error(`[Pathogen::Tooltip] aria-describedby must include "${tooltipId}".`);
    }
  }

  #validateKeyboardAccessibility(triggerElement) {
    const focusable = triggerElement.matches('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');

    if (!focusable) {
      console.warn(`[Pathogen::Tooltip] Trigger not keyboard-focusable. Add tabindex="0".`);
    }
  }
}
