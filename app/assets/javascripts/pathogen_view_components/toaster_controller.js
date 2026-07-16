import { Controller } from "@hotwired/stimulus";

const ANNOUNCE_DEBOUNCE_MS = 75;
// Matches --pvc-toast-gap (0.875rem) at the default 16px root font size.
const TOAST_GAP_PX = 14;
const DURATION_STORAGE_KEY = "pathogen.toast.durationMs";
const DISMISS_ALL_THRESHOLD = 3;

export default class extends Controller {
  static targets = ["polite", "assertive", "toast", "more", "dismissAll"];
  static values = {
    maxVisible: { type: Number, default: 3 },
    position: { type: String, default: "top_center" },
    durationPreference: { type: Number, default: -1 },
  };

  #expanded = false;
  #queue = { polite: [], assertive: [] };
  #flushTimeout = null;
  #flushHandle = null;
  #resizeObserver = null;
  #motionQuery = null;
  #onMotionChange = null;
  #applyingStack = false;
  #stackFrame = null;

  connect() {
    this.#motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.#onMotionChange = () => this.#scheduleApplyStack();
    this.#motionQuery.addEventListener("change", this.#onMotionChange);

    this.#resizeObserver = new ResizeObserver(() => this.#scheduleApplyStack());
    this.toastTargets.forEach((toast) => {
      this.#applyDurationPreference(toast);
      this.#resizeObserver.observe(toast);
    });

    this.#applyStack();
  }

  disconnect() {
    if (this.#flushTimeout) {
      clearTimeout(this.#flushTimeout);
      this.#flushTimeout = null;
    }
    if (this.#flushHandle) {
      cancelAnimationFrame(this.#flushHandle);
      this.#flushHandle = null;
    }
    if (this.#stackFrame) {
      cancelAnimationFrame(this.#stackFrame);
      this.#stackFrame = null;
    }
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
    this.#expanded = true;
    this.#applyStack();
    const front = this.#visibleToasts().at(-1);
    front?.focus?.({ preventScroll: true });
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
    this.#queue[politeness].push(message);
    this.#scheduleFlush();
  }

  dismissAll() {
    const dialogs = this.toastTargets.filter((toast) => this.#isDialogMode(toast) && toast.isConnected);
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
    if (this.#isPersistent(toast) || this.#isDialogMode(toast)) return;

    const preference = this.#resolvedDurationPreference();
    if (preference === null) return;

    if (preference === 0) {
      const controller = this.application?.getControllerForElementAndIdentifier(toast, "pathogen--toast");
      if (controller && typeof controller.promoteToDialog === "function") {
        // Promotion driven by a stored duration preference is not a user action,
        // so it must not steal focus (a status toast may be promoted en masse on
        // page load). Manual/interactive promotion still moves focus.
        controller.promoteToDialog({ focus: false });
      } else {
        toast.setAttribute("data-pathogen--toast-timeout-value", "0");
        toast.setAttribute("data-pathogen--toast-mode-value", "dialog");
        toast.setAttribute("data-pathogen--toast-dismissible-value", "true");
        toast.setAttribute("data-pathogen--toast-persistent-value", "true");
        toast.setAttribute("role", "dialog");
        toast.setAttribute("aria-modal", "false");
        toast.tabIndex = -1;
        toast.querySelector("[data-pathogen--toast-target='dismiss']")?.removeAttribute("hidden");
      }
      return;
    }

    if (preference > 0) {
      toast.setAttribute("data-pathogen--toast-timeout-value", String(preference));
      const controller = this.application?.getControllerForElementAndIdentifier(toast, "pathogen--toast");
      if (controller) {
        controller.timeoutValue = preference;
      }
    }
  }

  #resolvedDurationPreference() {
    if (this.hasDurationPreferenceValue && this.durationPreferenceValue >= 0) {
      return this.durationPreferenceValue;
    }

    try {
      const raw = window.localStorage?.getItem(DURATION_STORAGE_KEY);
      if (raw === null || raw === undefined || raw === "") return null;
      if (raw === "forever") return 0;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  #scheduleFlush() {
    if (this.#flushTimeout) clearTimeout(this.#flushTimeout);

    this.#flushTimeout = window.setTimeout(() => {
      this.#flushTimeout = null;
      if (!this.element.isConnected) return;

      this.#flushHandle = requestAnimationFrame(() => {
        this.#flushHandle = null;
        if (!this.element.isConnected) return;

        this.#flushRegion("polite");
        this.#flushRegion("assertive");
      });
    }, ANNOUNCE_DEBOUNCE_MS);
  }

  #flushRegion(politeness) {
    const messages = this.#queue[politeness];
    this.#queue[politeness] = [];

    const target = politeness === "assertive" ? this.#assertiveRegion() : this.#politeRegion();
    if (!target || messages.length === 0) return;

    const text = messages
      .map((part, index) => (index < messages.length - 1 && !/[.!?]$/.test(part) ? `${part}.` : part))
      .join(" ");

    this.#writeLiveRegion(target, text);
  }

  #writeLiveRegion(target, text) {
    if (target.textContent === text) {
      target.textContent = "";
      requestAnimationFrame(() => {
        if (!target.isConnected) return;
        target.textContent = text;
      });
      return;
    }

    target.textContent = text;
  }

  #politeRegion() {
    return this.hasPoliteTarget ? this.politeTarget : null;
  }

  #assertiveRegion() {
    return this.hasAssertiveTarget ? this.assertiveTarget : null;
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
    if (this.#applyingStack) return;
    this.#applyingStack = true;

    try {
      this.#applyStackNow();
      this.#syncChrome();
    } finally {
      this.#applyingStack = false;
    }
  }

  #applyStackNow() {
    const toasts = this.toastTargets.filter((toast) => toast.isConnected);
    if (toasts.length === 0) {
      this.#clearListMetrics();
      return;
    }

    const reducedMotion = this.#prefersReducedMotion();
    const hasDialog = toasts.some((toast) => this.#isDialogMode(toast));
    const usePeek = !reducedMotion && !hasDialog;
    const maxVisible = this.maxVisibleValue > 0 ? this.maxVisibleValue : 1;
    const hiddenNonPersistentCount = this.#expanded
      ? 0
      : Math.max(0, toasts.filter((toast) => !this.#isPersistent(toast)).length - maxVisible);

    let nonPersistentIndex = 0;
    toasts.forEach((toast) => {
      const isPersistent = this.#isPersistent(toast);
      const isHiddenOverflow = !isPersistent && nonPersistentIndex < hiddenNonPersistentCount;
      if (!isPersistent) nonPersistentIndex += 1;
      toast.hidden = isHiddenOverflow;
      this.#setToastInert(toast, isHiddenOverflow);
      if (!usePeek) {
        toast.setAttribute("aria-hidden", isHiddenOverflow ? "true" : "false");
        toast.removeAttribute("data-behind");
        if (!isHiddenOverflow && !this.#isDialogMode(toast)) {
          // Status toasts stay out of the tab order.
          toast.removeAttribute("tabindex");
        }
      }
    });

    this.element.dataset.stack = usePeek ? "peek" : "flat";
    this.element.dataset.expanded = this.#expanded ? "true" : "false";
    this.element.dataset.anchor = this.#anchorEdge();

    const visible = toasts.filter((toast) => !toast.hidden);
    if (!usePeek) {
      this.#clearPeekStyles(toasts);
      return;
    }

    this.#applyPeekStack(visible, toasts);
  }

  #applyPeekStack(visible, allToasts) {
    const frontFirst = [...visible].reverse();
    const sizes = frontFirst.map((toast) => this.#naturalSize(toast));
    const heights = sizes.map((size) => Math.ceil(size.height));
    const frontHeight = heights[0] ?? 0;
    const frontWidth = Math.ceil(sizes[0]?.width ?? 0);
    const peekCount = Math.max(0, frontFirst.length - 1);
    const list = this.#listElement();
    const metricsReady = this.#expanded || peekCount === 0 || frontHeight > 0;

    this.element.dataset.hasPeek = peekCount > 0 ? "true" : "false";
    if (metricsReady) {
      this.element.dataset.stackReady = "true";
    } else {
      delete this.element.dataset.stackReady;
    }

    frontFirst.forEach((toast, index) => {
      const behind = metricsReady && !this.#expanded && index > 0;
      toast.style.setProperty("--toast-index", String(index));
      toast.style.setProperty("--toast-height", `${heights[index]}px`);
      toast.dataset.behind = behind ? "true" : "false";
      toast.setAttribute("aria-hidden", behind ? "true" : "false");
      this.#setToastInert(toast, behind);

      if (this.#isDialogMode(toast) && !behind) {
        toast.tabIndex = -1;
      } else if (!behind) {
        toast.removeAttribute("tabindex");
      } else {
        toast.tabIndex = -1;
      }

      toast.style.removeProperty("max-height");
      toast.style.removeProperty("height");
      toast.style.removeProperty("overflow");
      toast.style.removeProperty("position");
      this.#clearAnchorOffset(toast);

      if (this.#expanded && metricsReady) {
        let offset = 0;
        for (let i = 0; i < index; i += 1) {
          offset += heights[i] + TOAST_GAP_PX;
        }
        toast.style.setProperty("--toast-offset", `${offset}px`);
      } else {
        toast.style.setProperty("--toast-offset", "0px");
      }
    });

    allToasts
      .filter((toast) => toast.hidden)
      .forEach((toast) => {
        toast.setAttribute("aria-hidden", "true");
        toast.removeAttribute("data-behind");
        this.#setToastInert(toast, true);
        this.#clearToastPeekVars(toast);
      });

    if (!list) return;

    if (frontWidth > 0) {
      this.element.style.setProperty("--front-width", `${frontWidth}px`);
    } else {
      this.element.style.removeProperty("--front-width");
    }

    if (this.#expanded && metricsReady) {
      const stackHeight =
        heights.reduce((sum, height) => sum + height, 0) + Math.max(0, heights.length - 1) * TOAST_GAP_PX;
      list.style.setProperty("--stack-height", `${stackHeight}px`);
      list.style.setProperty("--front-height", `${frontHeight}px`);
      list.style.setProperty("--peek-count", String(peekCount));
    } else if (metricsReady) {
      list.style.setProperty("--front-height", `${frontHeight}px`);
      list.style.setProperty("--peek-count", String(peekCount));
      list.style.removeProperty("--stack-height");
    } else {
      list.style.removeProperty("--front-height");
      list.style.removeProperty("--peek-count");
      list.style.removeProperty("--stack-height");
    }
  }

  #setToastInert(toast, inert) {
    if (inert) {
      toast.setAttribute("inert", "");
    } else {
      toast.removeAttribute("inert");
    }
  }

  #syncChrome() {
    const toasts = this.toastTargets.filter((toast) => toast.isConnected);
    const hiddenCount = toasts.filter((toast) => toast.hidden).length;
    const peekBehind = toasts.filter((toast) => toast.dataset.behind === "true").length;
    const moreCount = hiddenCount + (this.#expanded ? 0 : peekBehind);
    const dialogCount = toasts.filter((toast) => this.#isDialogMode(toast)).length;

    if (this.hasMoreTarget) {
      if (moreCount > 0 && !this.#expanded) {
        this.moreTarget.hidden = false;
        this.moreTarget.textContent = this.#moreLabel(moreCount);
      } else {
        this.moreTarget.hidden = true;
      }
    }

    if (this.hasDismissAllTarget) {
      this.dismissAllTarget.hidden = dialogCount < DISMISS_ALL_THRESHOLD;
    }
  }

  #moreLabel(count) {
    const template = this.moreTarget?.dataset?.template;
    if (template) return template.replace("%{count}", String(count));
    return `+${count} more`;
  }

  #visibleToasts() {
    return this.toastTargets.filter((toast) => toast.isConnected && !toast.hidden);
  }

  #naturalSize(toast) {
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

    return size;
  }

  #clearAnchorOffset(toast) {
    toast.style.removeProperty("top");
    toast.style.removeProperty("bottom");
  }

  #clearPeekStyles(toasts) {
    toasts.forEach((toast) => this.#clearToastPeekVars(toast));
    this.#clearListMetrics();
  }

  #clearToastPeekVars(toast) {
    toast.style.removeProperty("--toast-index");
    toast.style.removeProperty("--toast-offset");
    toast.style.removeProperty("--toast-height");
    toast.style.removeProperty("max-height");
    toast.style.removeProperty("height");
    toast.style.removeProperty("overflow");
    toast.style.removeProperty("position");
    this.#clearAnchorOffset(toast);
    toast.removeAttribute("data-behind");
  }

  #clearListMetrics() {
    const list = this.#listElement();
    this.element.style.removeProperty("--front-width");
    this.element.dataset.hasPeek = "false";
    delete this.element.dataset.stackReady;
    if (!list) return;
    list.style.removeProperty("--front-height");
    list.style.removeProperty("--peek-count");
    list.style.removeProperty("--stack-height");
  }

  #isDialogMode(toast) {
    return toast.getAttribute("data-pathogen--toast-mode-value") === "dialog";
  }

  #isPersistent(toast) {
    if (toast.getAttribute("data-pathogen--toast-persistent-value") === "true") return true;
    if (this.#isDialogMode(toast)) return true;

    const timeoutValue = toast.getAttribute("data-pathogen--toast-timeout-value");
    if (timeoutValue === null) return false;

    const timeout = Number(timeoutValue);
    return Number.isFinite(timeout) && timeout <= 0;
  }
}

export { ANNOUNCE_DEBOUNCE_MS, TOAST_GAP_PX, DURATION_STORAGE_KEY, DISMISS_ALL_THRESHOLD };
