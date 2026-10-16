import { Controller } from "@hotwired/stimulus";

import {
  DURATION_STORAGE_KEY,
  QUEUED_DURATION_PREFERENCE_ATTRIBUTE,
  resolveDurationPreference,
} from "pathogen_view_components/toast_duration_preference";
import {
  ANNOUNCE_DEBOUNCE_MS,
  LiveRegionAnnouncer,
} from "pathogen_view_components/toaster_controller/live_region_announcer";
import { createStackPlan, describeToast } from "pathogen_view_components/toaster_controller/stack_plan";

const DISMISS_ALL_THRESHOLD = 3;

export default class extends Controller {
  static targets = ["polite", "assertive", "toast", "more", "dismissAll", "viewport"];
  static values = {
    maxVisible: { type: Number, default: 3 },
    position: { type: String, default: "top_center" },
    durationPreference: { type: Number, default: -1 },
    durationStorageKey: { type: String, default: DURATION_STORAGE_KEY },
  };

  #expanded = false;
  #announcer = null;
  #returnFocusElement = null;
  #collapseFrame = null;
  #motionQuery = null;
  #onMotionChange = null;
  #stackFrame = null;
  #arrivalFrame = null;
  #arrivals = new Set();

  connect() {
    this.#motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.#onMotionChange = () => this.#scheduleApplyStack();
    this.#motionQuery.addEventListener("change", this.#onMotionChange);

    this.#announcer = new LiveRegionAnnouncer({
      hostElement: this.element,
      politeTarget: () => (this.hasPoliteTarget ? this.politeTarget : null),
      assertiveTarget: () => (this.hasAssertiveTarget ? this.assertiveTarget : null),
    });

    this.toastTargets.forEach((toast) => {
      this.#applyDurationPreference(toast);
      const controller = this.application.getControllerForElementAndIdentifier(toast, "pathogen--toast");
      if (controller) this.#queuePresentation(controller);
    });

    this.#applyStack();
  }

  disconnect() {
    this.#announcer?.disconnect();
    this.#announcer = null;
    if (this.#stackFrame) {
      cancelAnimationFrame(this.#stackFrame);
      this.#stackFrame = null;
    }
    if (this.#arrivalFrame) {
      cancelAnimationFrame(this.#arrivalFrame);
      this.#arrivalFrame = null;
    }
    this.#arrivals.clear();
    this.#motionQuery.removeEventListener("change", this.#onMotionChange);
    cancelAnimationFrame(this.#collapseFrame ?? 0);
    this.#collapseFrame = null;
  }

  toastTargetConnected(toast) {
    this.#applyDurationPreference(toast);
    this.#scheduleApplyStack();
  }

  toastTargetDisconnected() {
    this.#scheduleApplyStack();
  }

  expand(event) {
    if (event?.type === "focusin") this.#rememberReturnFocus(event.relatedTarget);
    this.#expanded = true;
    this.#applyStack();
  }

  collapseIfIdle() {
    cancelAnimationFrame(this.#collapseFrame ?? 0);
    this.#collapseFrame = requestAnimationFrame(() => {
      this.#collapseFrame = null;
      if (!this.element.isConnected) return;
      if (this.element.matches(":hover")) return;
      if (this.element.contains(document.activeElement)) return;

      this.#expanded = false;
      this.#applyStack();
    });
  }

  announce(event) {
    const detail = event?.detail ?? {};
    const message = typeof detail.message === "string" ? detail.message.trim() : "";
    if (message.length === 0) return;

    const politeness = detail.politeness === "assertive" ? "assertive" : "polite";
    this.#announcer?.announce({ message, politeness });
  }

  presentToast(event) {
    this.#queuePresentation(event.detail?.toast);
  }

  #queuePresentation(toast) {
    if (!toast?.awaitingPresentation || !this.element.contains(toast.element)) return;

    this.#arrivals.add(toast);
    if (this.#arrivalFrame) return;

    this.#arrivalFrame = requestAnimationFrame(() => {
      this.#arrivalFrame = null;
      const arrivals = [...this.#arrivals];
      this.#arrivals.clear();
      if (!this.element.isConnected) return;

      this.#applyStack();
      let focusClaimed = false;
      arrivals.forEach((arrival) => {
        if (!arrival.awaitingPresentation || !this.element.contains(arrival.element)) return;

        this.#rememberReturnFocus(document.activeElement);
        const focus =
          !focusClaimed &&
          arrival.initialDialogIntent &&
          arrival.dialogMode &&
          !arrival.interruptValue &&
          this.#mayMoveFocus();
        if (focus) focusClaimed = true;
        arrival.present({ focus });
      });
    });
  }

  #mayMoveFocus() {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return true;
    if (this.element.contains(active)) return false;
    if (active.isContentEditable || active.closest('[contenteditable]:not([contenteditable="false"])')) return false;
    if (active.matches("textarea, select")) return false;
    if (active.tagName !== "INPUT") return true;

    return ["button", "submit", "reset", "checkbox", "radio", "range", "color", "file", "image"].includes(active.type);
  }

  dismissAll() {
    if (this.element.contains(document.activeElement)) this.#restoreFocus();
    const dialogs = this.toastTargets.filter((toast) => describeToast(toast).dialog && toast.isConnected);
    dialogs.forEach((toast) => {
      const controller = this.application?.getControllerForElementAndIdentifier(toast, "pathogen--toast");
      if (controller && typeof controller.dismiss === "function") {
        controller.dismiss();
        return;
      }
      toast.remove();
    });
  }

  handleToastDismissed() {
    this.#scheduleApplyStack();
  }

  #applyDurationPreference(toast) {
    if (describeToast(toast).persistent) return;

    const preference = this.#resolvedDurationPreference();
    if (preference === null) {
      toast.removeAttribute(QUEUED_DURATION_PREFERENCE_ATTRIBUTE);
      return;
    }

    const controller = this.application?.getControllerForElementAndIdentifier(toast, "pathogen--toast");
    if (controller && typeof controller.applyDurationPreference === "function") {
      // Stored duration preferences are ambient settings, not direct user actions,
      // so applying them must not steal focus.
      controller.applyDurationPreference(preference, { focus: false });
      return;
    }

    // Queue preference application for toasts that connect after the toaster.
    toast.setAttribute(QUEUED_DURATION_PREFERENCE_ATTRIBUTE, String(preference));

    if (preference > 0) {
      toast.setAttribute("data-pathogen--toast-timeout-value", String(preference));
    }
  }

  #resolvedDurationPreference() {
    return resolveDurationPreference({
      // durationPreferenceValue defaults to the -1 sentinel, which
      // resolveDurationPreference treats as "no explicit preference".
      explicitPreference: this.durationPreferenceValue,
      storageKey: this.durationStorageKeyValue || DURATION_STORAGE_KEY,
    });
  }

  #rememberReturnFocus(element) {
    if (element instanceof HTMLElement && element !== document.body && !this.element.contains(element)) {
      this.#returnFocusElement = element;
    }
  }

  #restoreFocus() {
    const target = this.#returnFocusElement;
    if (target?.isConnected) target.focus();
    if (this.element.contains(document.activeElement)) this.viewportTarget.focus();
  }

  #prefersReducedMotion() {
    return Boolean(this.#motionQuery?.matches);
  }

  #anchorEdge() {
    return String(this.positionValue).startsWith("bottom") ? "bottom" : "top";
  }

  #scheduleApplyStack() {
    if (this.#stackFrame) return;

    this.#stackFrame = requestAnimationFrame(() => {
      this.#stackFrame = null;
      if (!this.element.isConnected) return;
      this.#applyStack();
    });
  }

  #applyStack() {
    const plan = createStackPlan(this.toastTargets, {
      expanded: this.#expanded,
      maxVisible: Math.max(1, this.maxVisibleValue),
      reducedMotion: this.#prefersReducedMotion(),
    });

    this.element.dataset.stack = plan.peek ? "peek" : "flat";
    this.element.dataset.expanded = String(this.#expanded);
    this.element.dataset.anchor = this.#anchorEdge();
    this.element.dataset.hasPeek = String(plan.peekCount > 0);
    this.element.style.setProperty("--peek-count", String(plan.peekCount));

    for (const { toast, hidden, behind, index } of plan.entries) {
      toast.hidden = hidden;
      toast.toggleAttribute("inert", hidden || behind);
      toast.setAttribute("aria-hidden", String(hidden || behind));
      toast.dataset.behind = String(behind);
      toast.style.setProperty("--toast-index", String(index));
    }
    if (this.hasViewportTarget) {
      this.viewportTarget.tabIndex = plan.entries.length > 0 && (!plan.peek || this.#expanded) ? 0 : -1;
    }
    this.#applyControls(plan);
  }

  #applyControls(plan) {
    if (this.hasMoreTarget) {
      // Focus can expand the stack before click/Enter. Keep the same control
      // visible through that change so the user's focus stays anchored.
      this.moreTarget.hidden = plan.moreCount === 0 && document.activeElement !== this.moreTarget;
      this.moreTarget.setAttribute("aria-expanded", String(this.#expanded));
      this.moreTarget.textContent = this.#moreLabel(plan.moreCount);
    }
    if (this.hasDismissAllTarget) {
      const hidden = plan.dialogCount < DISMISS_ALL_THRESHOLD;
      if (hidden && document.activeElement === this.dismissAllTarget) this.#restoreFocus();
      this.dismissAllTarget.hidden = hidden;
    }
  }

  #moreLabel(count) {
    const template = this.moreTarget.dataset.template;
    return template ? template.replace("%{count}", String(count)) : `+${count} more`;
  }
}

export { ANNOUNCE_DEBOUNCE_MS, DURATION_STORAGE_KEY, DISMISS_ALL_THRESHOLD };
