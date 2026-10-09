import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ToastController from "../../../app/assets/javascripts/pathogen_view_components/toast_controller";
import ToasterController from "../../../app/assets/javascripts/pathogen_view_components/toaster_controller";
import {
  buildToast,
  buildToaster,
  mockReducedMotion,
  waitForAnimationFrame,
  waitForController,
} from "./support/toaster_test_setup";

describe("toaster_controller stacking", () => {
  let application;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    mockReducedMotion(false);
    global.ResizeObserver = class {
      observe() {}

      unobserve() {}

      disconnect() {}
    };
    application = Application.start();
    application.register("pathogen--toaster", ToasterController);
    application.register("pathogen--toast", ToastController);
  });

  afterEach(() => {
    vi.useRealTimers();
    application?.stop();
    document.body.innerHTML = "";
    window.localStorage?.removeItem("pathogen.toast.durationMs");
    window.localStorage?.removeItem("app.toastDuration");
  });

  it("hides overflow toasts while collapsed", async () => {
    const { list } = buildToaster({ maxVisible: 3, count: 5 });
    await waitForController();

    const toasts = Array.from(list.querySelectorAll("li"));
    expect(toasts[0].hidden).toBe(true);
    expect(toasts[1].hidden).toBe(true);
    expect(toasts[2].hidden).toBe(false);
    expect(toasts[4].hidden).toBe(false);
    expect(toasts[0].getAttribute("aria-hidden")).toBe("true");
  });

  it("marks collapsed peek-behind toasts as non-interactive", async () => {
    const { section, list } = buildToaster({ maxVisible: 3, count: 0 });
    const measureBox = () => ({
      width: 280,
      height: 72,
      top: 0,
      left: 0,
      bottom: 72,
      right: 280,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    ["older", "middle", "front"].forEach((text) => {
      const toast = buildToast({ text });
      Object.defineProperty(toast, "getBoundingClientRect", {
        configurable: true,
        value: measureBox,
      });
      list.appendChild(toast);
    });
    await waitForController();
    await waitForAnimationFrame();

    const toasts = Array.from(list.querySelectorAll("li"));
    expect(section.dataset.stack).toBe("peek");
    expect(section.dataset.expanded).toBe("false");
    expect(section.dataset.anchor).toBe("top");
    expect(section.dataset.hasPeek).toBe("true");
    expect(section.dataset.stackReady).toBe("true");
    expect(toasts[2].dataset.behind).toBe("false");
    expect(toasts[2].hasAttribute("tabindex")).toBe(false);
    expect(toasts[2].hasAttribute("inert")).toBe(false);
    expect(toasts[1].dataset.behind).toBe("true");
    expect(toasts[1].tabIndex).toBe(-1);
    expect(toasts[1].hasAttribute("inert")).toBe(true);
    expect(toasts[1].getAttribute("aria-hidden")).toBe("true");
    expect(toasts[0].dataset.behind).toBe("true");
    expect(toasts[0].hasAttribute("inert")).toBe(true);
    expect(list.style.getPropertyValue("--peek-count")).toBe("2");
    expect(list.style.getPropertyValue("--front-height")).toBe("72px");
    // Deck metrics via CSS vars — position/transform owned by CSS, not inline height clips.
    expect(toasts[2].style.getPropertyValue("--toast-index")).toBe("0");
    expect(toasts[1].style.getPropertyValue("--toast-index")).toBe("1");
    expect(toasts[0].style.getPropertyValue("--toast-index")).toBe("2");
    expect(toasts[1].style.height).toBe("");
    expect(toasts[1].style.top).toBe("");
    expect(toasts[2].style.top).toBe("");
  });

  it("keeps a spaced flex fallback until toast metrics are measurable", async () => {
    const { section, list } = buildToaster({ maxVisible: 3, count: 3 });
    await waitForController();

    // jsdom reports 0x0 boxes, so peek layout stays gated off.
    expect(section.dataset.hasPeek).toBe("true");
    expect(section.dataset.stackReady).toBeUndefined();
    expect(list.style.getPropertyValue("--peek-count")).toBe("");
  });

  it("marks a single toast stack without peek clipping", async () => {
    const { section, list } = buildToaster({ maxVisible: 3, count: 1 });
    await waitForController();

    expect(section.dataset.hasPeek).toBe("false");
    expect(list.style.getPropertyValue("--peek-count")).toBe("0");
  });

  it("keeps collapsed deck metrics so behind cards share the front height", async () => {
    const { section, list } = buildToaster({ maxVisible: 3, count: 0 });
    const measured = buildToast({ text: "Front toast with description text" });
    Object.defineProperty(measured, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        width: 280,
        height: 72,
        top: 0,
        left: 0,
        bottom: 72,
        right: 280,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    list.appendChild(buildToast({ text: "older" }));
    list.appendChild(buildToast({ text: "middle" }));
    list.appendChild(measured);
    await waitForController();
    await waitForAnimationFrame();

    const toasts = Array.from(list.querySelectorAll("li"));
    expect(section.dataset.hasPeek).toBe("true");
    expect(toasts[0].dataset.behind).toBe("true");
    expect(toasts[2].dataset.behind).toBe("false");
    expect(list.style.getPropertyValue("--front-height")).toBe("72px");
    expect(list.style.getPropertyValue("--peek-count")).toBe("2");
    expect(toasts[0].style.getPropertyValue("--toast-height")).not.toBe("");
  });

  it("uses bottom anchor metrics for bottom positions", async () => {
    const { section } = buildToaster({ maxVisible: 2, count: 2, position: "bottom_right" });
    await waitForController();
    expect(section.dataset.anchor).toBe("bottom");
  });

  it("sets --front-width so corner peek stacks keep a measurable width", async () => {
    const { section, list } = buildToaster({ maxVisible: 2, count: 0, position: "top_right" });
    section.dataset.layout = "corner";
    const toast = buildToast({ text: "Position: Top right" });
    Object.defineProperty(toast, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        width: 280,
        height: 72,
        top: 0,
        left: 0,
        bottom: 72,
        right: 280,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    list.appendChild(toast);
    await waitForController();
    await waitForAnimationFrame();

    expect(section.style.getPropertyValue("--front-width")).toBe("280px");
  });

  it("keeps persistent toasts visible while collapsed", async () => {
    const { list } = buildToaster({ maxVisible: 2, count: 0 });
    list.appendChild(buildToast({ text: "persistent error", persistent: true, type: "error", timeout: 0 }));
    list.appendChild(buildToast({ text: "older info" }));
    list.appendChild(buildToast({ text: "newer info" }));
    list.appendChild(buildToast({ text: "latest info" }));
    await waitForController();

    const toasts = Array.from(list.querySelectorAll("li"));
    expect(toasts[0].hidden).toBe(false);
    expect(toasts[1].hidden).toBe(true);
    expect(toasts[2].hidden).toBe(false);
    expect(toasts[3].hidden).toBe(false);
  });

  it("expands stack visibility", async () => {
    const { section, list } = buildToaster({ maxVisible: 2, count: 4 });
    await waitForController();
    const controller = application.getControllerForElementAndIdentifier(section, "pathogen--toaster");

    controller.expand();
    Array.from(list.querySelectorAll("li")).forEach((toast) => {
      expect(toast.hidden).toBe(false);
      expect(toast.getAttribute("aria-hidden")).toBe("false");
      expect(toast.dataset.behind).toBe("false");
      expect(toast.hasAttribute("inert")).toBe(false);
      expect(toast.hasAttribute("tabindex")).toBe(false);
    });
    expect(section.dataset.expanded).toBe("true");
    expect(list.style.getPropertyValue("--stack-height")).not.toBe("");
  });

  it("keeps More visible and focused when keyboard focus and activation expand the stack", async () => {
    const { section, list, more } = buildToaster({ maxVisible: 2, count: 4 });
    for (const toast of list.children) {
      toast.getBoundingClientRect = () => ({ width: 280, height: 72 });
    }
    await waitForController();
    const collapsedLabel = more.textContent;

    more.focus();

    expect(section.dataset.expanded).toBe("true");
    expect(more.hidden).toBe(false);
    expect(document.activeElement).toBe(more);
    expect(more.getAttribute("aria-expanded")).toBe("true");
    expect(more.textContent).toBe(collapsedLabel);
    for (const toast of list.children) {
      expect(toast.hidden).toBe(false);
      expect(toast.hasAttribute("inert")).toBe(false);
    }

    more.click();

    expect(more.hidden).toBe(false);
    expect(document.activeElement).toBe(more);
  });

  it("updates visibility, inert state and controls together when a dialog changes peek to flat", async () => {
    const { section, list, more } = buildToaster({ maxVisible: 2, count: 3 });
    for (const toast of list.children) {
      toast.getBoundingClientRect = () => ({ width: 280, height: 72 });
    }
    await waitForController();
    const [overflow, behind, front] = list.children;
    expect(behind.getAttribute("aria-hidden")).toBe("true");
    expect(behind.hasAttribute("inert")).toBe(true);

    const dialog = buildToast({ text: "Action required", mode: "dialog", timeout: 0 });
    list.appendChild(dialog);
    await waitForController();
    await waitForAnimationFrame();

    expect(section.dataset.stack).toBe("flat");
    expect(overflow.hidden).toBe(true);
    for (const toast of [behind, front, dialog]) {
      expect(toast.hidden).toBe(false);
      expect(toast.hasAttribute("inert")).toBe(false);
      expect(toast.getAttribute("aria-hidden")).toBe("false");
      expect(toast.hasAttribute("data-behind")).toBe(false);
      expect(toast.style.getPropertyValue("--toast-offset")).toBe("");
    }
    expect(more.textContent).toBe("+1 more");
    expect(list.style.getPropertyValue("--front-height")).toBe("");
  });

  it("marks peek-behind dismiss buttons as inert so they leave the tab order", async () => {
    const { list, section } = buildToaster({ maxVisible: 3, count: 0 });
    const measureBox = () => ({
      width: 280,
      height: 72,
      top: 0,
      left: 0,
      bottom: 72,
      right: 280,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    ["older", "middle", "front"].forEach((text) => {
      const toast = buildToast({ text, withDismiss: true, mode: "status", timeout: 6000 });
      Object.defineProperty(toast, "getBoundingClientRect", {
        configurable: true,
        value: measureBox,
      });
      list.appendChild(toast);
    });
    await waitForController();
    await waitForAnimationFrame();

    const toasts = Array.from(list.querySelectorAll("li"));
    expect(section.dataset.stack).toBe("peek");
    expect(toasts[1].hasAttribute("inert")).toBe(true);
    expect(toasts[1].querySelector("button")).not.toBeNull();
    expect(toasts[2].hasAttribute("inert")).toBe(false);
  });

  it("applies expanded offsets from measured heights via CSS vars", async () => {
    const { section, list } = buildToaster({ maxVisible: 3, count: 0 });
    const measure = (height) => () => ({
      width: 280,
      height,
      top: 0,
      left: 0,
      bottom: height,
      right: 280,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    ["older", "middle", "front"].forEach((text, index) => {
      const toast = buildToast({ text });
      Object.defineProperty(toast, "getBoundingClientRect", {
        configurable: true,
        value: measure(40 + index * 10),
      });
      list.appendChild(toast);
    });
    await waitForController();
    await waitForAnimationFrame();

    const controller = application.getControllerForElementAndIdentifier(section, "pathogen--toaster");
    controller.expand();
    await waitForAnimationFrame();

    const toasts = Array.from(list.querySelectorAll("li"));
    // front-first: front(60), middle(50), older(40) with 14px gaps
    expect(toasts[2].style.getPropertyValue("--toast-offset")).toBe("0px");
    expect(toasts[1].style.getPropertyValue("--toast-offset")).toBe("74px");
    expect(toasts[0].style.getPropertyValue("--toast-offset")).toBe("138px");
    expect(list.style.getPropertyValue("--stack-height")).toBe("178px");
    expect(section.dataset.hasPeek).toBe("true");
  });

  it("collapses the stack after mouse leave when idle", async () => {
    const { section, list } = buildToaster({ maxVisible: 2, count: 4 });
    await waitForController();
    const controller = application.getControllerForElementAndIdentifier(section, "pathogen--toaster");

    controller.expand();
    section.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    await waitForAnimationFrame();
    await waitForController();

    const toasts = Array.from(list.querySelectorAll("li"));
    expect(toasts[0].hidden).toBe(true);
    expect(toasts[1].hidden).toBe(true);
    expect(toasts[2].hidden).toBe(false);
    expect(toasts[3].hidden).toBe(false);
    expect(section.dataset.expanded).toBe("false");
  });

  it("falls back to a flat stack when reduced motion is preferred", async () => {
    mockReducedMotion(true);
    const { section, list } = buildToaster({ maxVisible: 2, count: 4 });
    await waitForController();

    const toasts = Array.from(list.querySelectorAll("li"));
    expect(section.dataset.stack).toBe("flat");
    expect(toasts[0].hidden).toBe(true);
    expect(toasts[1].hidden).toBe(true);
    expect(toasts[2].hidden).toBe(false);
    expect(toasts[3].hidden).toBe(false);
    expect(list.style.getPropertyValue("--peek-count")).toBe("");
  });

  it("rebalances the stack when a toast target disconnects", async () => {
    const { list } = buildToaster({ maxVisible: 2, count: 4 });
    await waitForController();

    list.querySelector("li").remove();
    await waitForController();
    await waitForAnimationFrame();
    await waitForController();

    const toasts = Array.from(list.querySelectorAll("li"));
    expect(toasts).toHaveLength(3);
    expect(toasts[0].hidden).toBe(true);
    expect(toasts[1].hidden).toBe(false);
    expect(toasts[2].hidden).toBe(false);
  });
});
