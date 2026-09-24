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
import { createStackPlan, describeToast, TOAST_GAP_PX } from "pathogen_view_components/toaster_controller/stack_plan";

const DISMISS_ALL_THRESHOLD = 3;

export default class extends Controller {
  static targets = ["polite", "assertive", "toast", "more", "dismissAll"];
  static values = {
    maxVisible: { type: Number, default: 3 },
    position: { type: String, default: "top_center" },
    durationPreference: { type: Number, default: -1 },
    durationStorageKey: { type: String, default: DURATION_STORAGE_KEY },
  };

  #expanded = false;
  #announcer = null;
  #resizeObserver = null;
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

    this.#resizeObserver = new ResizeObserver(() => this.#scheduleApplyStack());
    this.toastTargets.forEach((toast) => {
      this.#applyDurationPreference(toast);
      this.#resizeObserver.observe(toast);
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
    if (this.#motionQuery && this.#onMotionChange) {
      this.#motionQuery.removeEventListener("change", this.#onMotionChange);
    }
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
  }

  toastTargetConnected(toast) {
    this.#applyDurationPreference(toast);
    this.#resizeObserver?.observe(toast);
    this.#scheduleApplyStack();
  }

  toastTargetDisconnected(toast) {
    this.#resizeObserver?.unobserve(toast);
    this.#scheduleApplyStack();
  }

  expand() {
    this.#expanded = true;
    this.#applyStack();
  }

  expandFromControl() {
    this.expand();
  }

  collapseIfIdle() {
    requestAnimationFrame(() => {
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
      explicitPreference: this.hasDurationPreferenceValue ? this.durationPreferenceValue : null,
      storageKey: this.durationStorageKeyValue || DURATION_STORAGE_KEY,
    });
  }

  #listElement() {
    return this.element.querySelector("ol.pvc-toaster__list") || this.element.querySelector("ol");
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
    const plan = createStackPlan(
      this.toastTargets.filter((toast) => toast.isConnected),
      {
        expanded: this.#expanded,
        maxVisible: Math.max(1, this.maxVisibleValue),
        reducedMotion: this.#prefersReducedMotion(),
        measureToast: (toast) => this.#naturalSize(toast),
      },
    );

    this.element.dataset.stack = plan.peek ? "peek" : "flat";
    this.element.dataset.expanded = String(this.#expanded);
    this.element.dataset.anchor = this.#anchorEdge();
    this.element.dataset.hasPeek = String(plan.peek && plan.peekCount > 0);
    if (plan.metricsReady) this.element.dataset.stackReady = "true";
    else delete this.element.dataset.stackReady;

    plan.entries.forEach(({ toast, hidden, behind, inert, index, height, offset }) => {
      toast.hidden = hidden;
      toast.toggleAttribute("inert", inert);
      toast.setAttribute("aria-hidden", String(inert));
      if (behind) toast.tabIndex = -1;
      else toast.removeAttribute("tabindex");

      if (plan.peek && !hidden) {
        toast.dataset.behind = String(behind);
        toast.style.setProperty("--toast-index", String(index));
        toast.style.setProperty("--toast-height", `${height}px`);
        toast.style.setProperty("--toast-offset", `${offset}px`);
      } else {
        toast.removeAttribute("data-behind");
        ["--toast-index", "--toast-height", "--toast-offset"].forEach((property) =>
          toast.style.removeProperty(property),
        );
      }
      ["max-height", "height", "overflow", "position", "top", "bottom"].forEach((property) =>
        toast.style.removeProperty(property),
      );
    });

    if (plan.peek && plan.frontWidth > 0) {
      this.element.style.setProperty("--front-width", `${plan.frontWidth}px`);
    } else {
      this.element.style.removeProperty("--front-width");
    }

    const list = this.#listElement();
    if (list) {
      const metrics = {
        "--front-height": plan.metricsReady ? `${plan.frontHeight}px` : null,
        "--peek-count": plan.metricsReady ? String(plan.peekCount) : null,
        "--stack-height": plan.metricsReady && this.#expanded ? `${plan.stackHeight}px` : null,
      };
      Object.entries(metrics).forEach(([property, value]) => {
        if (value === null) list.style.removeProperty(property);
        else list.style.setProperty(property, value);
      });
    }

    if (this.hasMoreTarget) {
      // Focus can expand the stack before click/Enter. Keep the same control
      // visible through that change so the user's focus stays anchored.
      this.moreTarget.hidden = plan.moreCount === 0 && document.activeElement !== this.moreTarget;
      this.moreTarget.setAttribute("aria-expanded", String(this.#expanded));
      this.moreTarget.textContent = this.#moreLabel(plan.moreCount);
    }
    if (this.hasDismissAllTarget) {
      this.dismissAllTarget.hidden = plan.dialogCount < DISMISS_ALL_THRESHOLD;
    }
  }

  #moreLabel(count) {
    const template = this.moreTarget.dataset.template;
    return template ? template.replace("%{count}", String(count)) : `+${count} more`;
  }

  #naturalSize(toast) {
    const hidden = toast.hidden;
    const previous = {
      height: toast.style.height,
      maxHeight: toast.style.maxHeight,
      overflow: toast.style.overflow,
      width: toast.style.width,
      position: toast.style.position,
      left: toast.style.left,
      right: toast.style.right,
      top: toast.style.top,
      bottom: toast.style.bottom,
      transform: toast.style.transform,
    };

    const columnWidth = Math.ceil(this.#listElement()?.clientWidth ?? 0);

    toast.hidden = false;
    toast.style.position = "static";
    toast.style.height = "auto";
    toast.style.maxHeight = "none";
    toast.style.overflow = "visible";
    toast.style.left = "auto";
    toast.style.right = "auto";
    toast.style.top = "auto";
    toast.style.bottom = "auto";
    toast.style.transform = "none";
    toast.style.width = columnWidth > 0 ? `${columnWidth}px` : "max-content";

    const width = Math.ceil(toast.getBoundingClientRect().width);
    if (columnWidth <= 0 && width > 0) toast.style.width = `${width}px`;
    const height = Math.ceil(toast.getBoundingClientRect().height);
    const size = { height, width: columnWidth > 0 ? columnWidth : width };

    Object.entries(previous).forEach(([key, value]) => {
      toast.style[key] = value;
    });
    toast.hidden = hidden;

    return size;
  }
}

export { ANNOUNCE_DEBOUNCE_MS, TOAST_GAP_PX, DURATION_STORAGE_KEY, DISMISS_ALL_THRESHOLD };
