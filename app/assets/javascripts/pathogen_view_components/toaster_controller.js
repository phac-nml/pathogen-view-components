import { Controller } from "@hotwired/stimulus";

const ANNOUNCE_DEBOUNCE_MS = 75;
const TOAST_GAP_PX = 8;

export default class extends Controller {
  static targets = ["polite", "assertive", "toast"];
  static values = {
    maxVisible: { type: Number, default: 3 },
    position: { type: String, default: "top_center" },
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
    this.toastTargets.forEach((toast) => this.#resizeObserver.observe(toast));

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
      // Clear first, then write on the next frame so the region reports a change
      // and re-announces even when the same message repeats.
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
    return this.element.querySelector("ol");
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
    const usePeek = !reducedMotion;
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
      if (!usePeek) {
        toast.setAttribute("aria-hidden", isHiddenOverflow ? "true" : "false");
        toast.removeAttribute("data-behind");
        if (!isHiddenOverflow) toast.tabIndex = 0;
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
    const heights = sizes.map((size) => size.height);
    const frontHeight = heights[0] ?? 0;
    const frontWidth = sizes[0]?.width ?? 0;
    const list = this.#listElement();

    frontFirst.forEach((toast, index) => {
      const behind = !this.#expanded && index > 0;
      toast.style.setProperty("--toast-index", String(index));
      toast.dataset.behind = behind ? "true" : "false";
      toast.setAttribute("aria-hidden", behind ? "true" : "false");
      toast.tabIndex = behind ? -1 : 0;

      if (this.#expanded) {
        let offset = 0;
        for (let i = 0; i < index; i += 1) {
          offset += heights[i] + TOAST_GAP_PX;
        }
        toast.style.setProperty("--toast-offset", `${offset}px`);
      } else {
        toast.style.removeProperty("--toast-offset");
      }
    });

    allToasts
      .filter((toast) => toast.hidden)
      .forEach((toast) => {
        toast.setAttribute("aria-hidden", "true");
        toast.removeAttribute("data-behind");
        this.#clearToastPeekVars(toast);
      });

    if (!list) return;

    if (frontWidth > 0) {
      this.element.style.setProperty("--front-width", `${frontWidth}px`);
    } else {
      this.element.style.removeProperty("--front-width");
    }

    if (this.#expanded) {
      const stackHeight =
        heights.reduce((sum, height) => sum + height, 0) +
        Math.max(0, heights.length - 1) * TOAST_GAP_PX;
      list.style.setProperty("--stack-height", `${stackHeight}px`);
      list.style.removeProperty("--front-height");
      list.style.removeProperty("--peek-count");
    } else {
      list.style.setProperty("--front-height", `${frontHeight}px`);
      list.style.setProperty("--peek-count", String(Math.max(0, frontFirst.length - 1)));
      list.style.removeProperty("--stack-height");
    }
  }

  #naturalSize(toast) {
    const previous = {
      height: toast.style.height,
      overflow: toast.style.overflow,
      width: toast.style.width,
      position: toast.style.position,
      left: toast.style.left,
      right: toast.style.right,
      top: toast.style.top,
      bottom: toast.style.bottom,
      transform: toast.style.transform,
    };

    // Absolute + percentage width collapses on shrink-wrapped corner toasters.
    // Measure with an unconstrained static layout instead.
    toast.style.position = "static";
    toast.style.width = "max-content";
    toast.style.height = "auto";
    toast.style.overflow = "visible";
    toast.style.left = "auto";
    toast.style.right = "auto";
    toast.style.top = "auto";
    toast.style.bottom = "auto";
    toast.style.transform = "none";

    const rect = toast.getBoundingClientRect();
    const size = { height: rect.height, width: rect.width };

    Object.entries(previous).forEach(([key, value]) => {
      toast.style[key] = value;
    });

    return size;
  }

  #clearPeekStyles(toasts) {
    toasts.forEach((toast) => this.#clearToastPeekVars(toast));
    this.#clearListMetrics();
  }

  #clearToastPeekVars(toast) {
    toast.style.removeProperty("--toast-index");
    toast.style.removeProperty("--toast-offset");
    toast.removeAttribute("data-behind");
  }

  #clearListMetrics() {
    const list = this.#listElement();
    this.element.style.removeProperty("--front-width");
    if (!list) return;
    list.style.removeProperty("--front-height");
    list.style.removeProperty("--peek-count");
    list.style.removeProperty("--stack-height");
  }

  // Persistent toasts are flagged in markup via data-pathogen--toast-persistent-value.
  // timeout <= 0 is a fallback for DOM built without the Ruby component.
  #isPersistent(toast) {
    if (toast.getAttribute("data-pathogen--toast-persistent-value") === "true") return true;

    const timeoutValue = toast.getAttribute("data-pathogen--toast-timeout-value");
    if (timeoutValue === null) return false;

    const timeout = Number(timeoutValue);
    return Number.isFinite(timeout) && timeout <= 0;
  }
}

export { ANNOUNCE_DEBOUNCE_MS, TOAST_GAP_PX };
