import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ToastController from "../../../app/assets/javascripts/pathogen_view_components/toast_controller";
import ToasterController, {
  ANNOUNCE_DEBOUNCE_MS,
} from "../../../app/assets/javascripts/pathogen_view_components/toaster_controller";

const waitForController = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
const waitForAnimationFrame = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
const flushAnnouncements = async () => {
  await waitForAnimationFrame();
  await vi.advanceTimersByTimeAsync(ANNOUNCE_DEBOUNCE_MS);
  await waitForAnimationFrame();
  await waitForAnimationFrame();
};

const TOASTER_ACTIONS = [
  "mouseenter->pathogen--toaster#expand",
  "mouseleave->pathogen--toaster#collapseIfIdle",
  "focusin->pathogen--toaster#expand",
  "focusout->pathogen--toaster#collapseIfIdle",
  "pathogen:toast:announce->pathogen--toaster#announce",
  "pathogen:toast:ready->pathogen--toaster#presentToast",
  "pathogen:toast:dismissed->pathogen--toaster#handleToastDismissed",
].join(" ");

const buildToast = ({
  text,
  persistent = false,
  type = "info",
  timeout = 6000,
  mode = "status",
  withDismiss = false,
} = {}) => {
  const toast = document.createElement("li");
  toast.textContent = text;
  toast.setAttribute("data-pathogen--toaster-target", "toast");
  toast.setAttribute("data-pathogen--toast-persistent-value", String(persistent));
  toast.setAttribute("data-pathogen--toast-type-value", type);
  toast.setAttribute("data-pathogen--toast-timeout-value", String(timeout));
  toast.setAttribute("data-pathogen--toast-mode-value", mode);
  if (withDismiss) {
    const dismiss = document.createElement("div");
    dismiss.setAttribute("data-pathogen--toast-target", "dismiss");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Close";
    dismiss.appendChild(button);
    toast.appendChild(dismiss);
  }
  return toast;
};

const buildConnectedToast = ({
  message = "Saved",
  type = "success",
  typeLabel = "Success",
  timeout = 6000,
  mode = "status",
  interrupt = false,
} = {}) => {
  const toast = document.createElement("li");
  toast.dataset.state = "open";
  toast.setAttribute("data-controller", "pathogen--toast");
  toast.setAttribute("data-pathogen--toaster-target", "toast");
  toast.setAttribute("data-pathogen--toast-timeout-value", String(timeout));
  toast.setAttribute("data-pathogen--toast-type-value", type);
  toast.setAttribute("data-pathogen--toast-type-label-value", typeLabel);
  toast.setAttribute("data-pathogen--toast-mode-value", mode);
  toast.setAttribute("data-pathogen--toast-interrupt-value", String(interrupt));
  toast.setAttribute("data-pathogen--toast-dismiss-duration-value", "0");
  toast.setAttribute("data-pathogen--toast-dismissible-value", String(mode === "dialog"));
  toast.setAttribute("role", "listitem");

  const shell = document.createElement("div");
  shell.setAttribute("data-pathogen--toast-target", "dialog");
  if (mode === "dialog") {
    shell.setAttribute("role", "dialog");
    shell.setAttribute("aria-modal", "false");
    shell.tabIndex = -1;
  }
  toast.appendChild(shell);

  const messageText = document.createElement("span");
  messageText.setAttribute("data-pathogen--toast-target", "message");
  messageText.textContent = message;
  shell.appendChild(messageText);

  return toast;
};

const buildToaster = ({ maxVisible = 3, count = 4, position = "top_center" } = {}) => {
  const section = document.createElement("section");
  section.setAttribute("data-controller", "pathogen--toaster");
  section.setAttribute("data-pathogen--toaster-max-visible-value", String(maxVisible));
  section.setAttribute("data-pathogen--toaster-position-value", position);
  section.setAttribute("data-action", TOASTER_ACTIONS);

  const more = document.createElement("button");
  more.type = "button";
  more.setAttribute("data-pathogen--toaster-target", "more");
  more.setAttribute("data-action", "click->pathogen--toaster#expandFromControl");
  more.setAttribute("aria-controls", "flashes");
  more.setAttribute("aria-expanded", "false");
  more.dataset.template = "+%{count} more";
  more.hidden = true;
  section.appendChild(more);

  const dismissAll = document.createElement("button");
  dismissAll.type = "button";
  dismissAll.setAttribute("data-pathogen--toaster-target", "dismissAll");
  dismissAll.hidden = true;
  section.appendChild(dismissAll);

  const list = document.createElement("ol");
  list.id = "flashes";
  list.className = "pvc-toaster__list";
  section.appendChild(list);

  const polite = document.createElement("div");
  polite.setAttribute("data-pathogen--toaster-target", "polite");
  section.appendChild(polite);

  const assertive = document.createElement("div");
  assertive.setAttribute("data-pathogen--toaster-target", "assertive");
  section.appendChild(assertive);

  for (let index = 0; index < count; index += 1) {
    const toast = document.createElement("li");
    toast.textContent = `toast-${index + 1}`;
    toast.setAttribute("data-pathogen--toaster-target", "toast");
    toast.setAttribute("data-pathogen--toast-mode-value", "status");
    list.appendChild(toast);
  }

  document.body.appendChild(section);
  return { section, list, polite, assertive, more, dismissAll };
};

const mockReducedMotion = (matches) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)" ? matches : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe("toaster_controller", () => {
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

  it("writes assertive text for critical announcements", async () => {
    const { section, assertive } = buildToaster({ maxVisible: 3, count: 1 });
    await waitForController();
    const controller = application.getControllerForElementAndIdentifier(section, "pathogen--toaster");

    controller.announce({ detail: { message: "Upload failed", politeness: "assertive" } });
    await flushAnnouncements();
    expect(assertive.textContent).toBe("Upload failed");
  });

  it("writes polite text for standard announcements", async () => {
    const { section, polite } = buildToaster({ maxVisible: 3, count: 1 });
    await waitForController();
    const controller = application.getControllerForElementAndIdentifier(section, "pathogen--toaster");

    controller.announce({ detail: { message: "Saved", politeness: "polite" } });
    await flushAnnouncements();
    expect(polite.textContent).toBe("Saved");
  });

  it("joins simultaneous announcements so none are dropped", async () => {
    const { section, assertive } = buildToaster({ maxVisible: 3, count: 1 });
    await waitForController();
    const controller = application.getControllerForElementAndIdentifier(section, "pathogen--toaster");

    controller.announce({ detail: { message: "First failure", politeness: "assertive" } });
    controller.announce({ detail: { message: "Second failure", politeness: "assertive" } });
    await flushAnnouncements();
    expect(assertive.textContent).toBe("First failure. Second failure");
  });

  it("debounces rapid announcements into one live region update", async () => {
    const { section, polite } = buildToaster({ maxVisible: 3, count: 1 });
    await waitForController();
    const controller = application.getControllerForElementAndIdentifier(section, "pathogen--toaster");

    controller.announce({ detail: { message: "First file removed", politeness: "polite" } });
    await vi.advanceTimersByTimeAsync(30);
    controller.announce({ detail: { message: "Second file removed", politeness: "polite" } });
    await flushAnnouncements();
    expect(polite.textContent).toBe("First file removed. Second file removed");
  });

  it("re-announces when the same message repeats", async () => {
    const { section, polite } = buildToaster({ maxVisible: 3, count: 1 });
    await waitForController();
    const controller = application.getControllerForElementAndIdentifier(section, "pathogen--toaster");

    controller.announce({ detail: { message: "Saved", politeness: "polite" } });
    await flushAnnouncements();
    expect(polite.textContent).toBe("Saved");

    controller.announce({ detail: { message: "Saved", politeness: "polite" } });
    await flushAnnouncements();
    expect(polite.textContent).toBe("Saved");
  });

  it("routes child status toast announcements into the polite live region", async () => {
    const { list, polite } = buildToaster({ maxVisible: 3, count: 0 });
    list.appendChild(
      buildConnectedToast({ message: "Saved", type: "success", typeLabel: "Success", mode: "status", timeout: 6000 }),
    );
    await waitForController();
    await flushAnnouncements();
    expect(polite.textContent).toBe("Success: Saved");
  });

  it("focuses only the first dialog in a batch and announces the remaining dialogs", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const { list, polite } = buildToaster({ count: 0 });
    const dialogs = ["First", "Second", "Third"].map((message) =>
      buildConnectedToast({ message, mode: "dialog", type: "warning", typeLabel: "Warning", timeout: 0 }),
    );
    list.append(...dialogs);
    await waitForController();
    await waitForAnimationFrame();

    expect(document.activeElement).toBe(dialogs[0].querySelector('[role="dialog"]'));
    await flushAnnouncements();
    expect(polite.textContent).toBe("Warning: Second. Warning: Third");
    expect(document.activeElement).toBe(dialogs[0].querySelector('[role="dialog"]'));
  });

  it("presents existing toasts when controllers register into an already-running application", async () => {
    application.stop();
    application = new Application();
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const { list, polite } = buildToaster({ count: 0 });
    const dialog = buildConnectedToast({ message: "Review needed", mode: "dialog", timeout: 0 });
    list.append(buildConnectedToast({ message: "Saved" }), dialog);

    await application.start();
    application.register("pathogen--toast", ToastController);
    application.register("pathogen--toaster", ToasterController);
    await flushAnnouncements();

    expect(document.activeElement).toBe(dialog.querySelector('[role="dialog"]'));
    expect(polite.textContent).toBe("Success: Saved");
  });

  it("presents pending toasts after toaster-only reconnect without replaying old dialogs", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const { section, list, polite } = buildToaster({ count: 0 });
    list.appendChild(buildConnectedToast({ message: "Old dialog", mode: "dialog", timeout: 0 }));
    await waitForController();
    await waitForAnimationFrame();

    trigger.focus();
    section.removeAttribute("data-controller");
    await waitForController();
    const pending = buildConnectedToast({ message: "New dialog", mode: "dialog", timeout: 0 });
    list.appendChild(pending);
    await waitForController();
    section.setAttribute("data-controller", "pathogen--toaster");
    await waitForController();
    await flushAnnouncements();

    expect(document.activeElement).toBe(pending.querySelector('[role="dialog"]'));
    expect(polite.textContent).toBe("");
  });

  it("checks active text entry when the arrival frame runs", async () => {
    const { list, polite } = buildToaster({ count: 0 });
    const input = document.createElement("input");
    document.body.appendChild(input);
    list.appendChild(
      buildConnectedToast({ message: "Review needed", mode: "dialog", typeLabel: "Warning", timeout: 0 }),
    );
    await waitForController();
    input.focus();
    await waitForAnimationFrame();
    await flushAnnouncements();

    expect(document.activeElement).toBe(input);
    expect(polite.textContent).toBe("Warning: Review needed");
  });

  it("rechecks focus after an earlier announcement triggers a host focus change", async () => {
    const { section, list, polite } = buildToaster({ count: 0 });
    const input = document.createElement("input");
    document.body.appendChild(input);
    section.addEventListener("pathogen:toast:announce", () => input.focus(), { once: true });
    list.append(
      buildConnectedToast({ message: "Saved" }),
      buildConnectedToast({ message: "Review needed", mode: "dialog", typeLabel: "Warning", timeout: 0 }),
    );
    await waitForController();
    await flushAnnouncements();

    expect(document.activeElement).toBe(input);
    expect(polite.textContent).toBe("Success: Saved. Warning: Review needed");
  });

  it("cancels queued arrival presentation when the toaster disconnects", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const { section, list, polite } = buildToaster({ count: 0 });
    list.appendChild(buildConnectedToast({ message: "Review needed", mode: "dialog", timeout: 0 }));
    await waitForController();
    section.removeAttribute("data-controller");
    await waitForController();
    await waitForAnimationFrame();
    await flushAnnouncements();

    expect(document.activeElement).toBe(trigger);
    expect(polite.textContent).toBe("");
  });

  it("does not live-announce dialog-mode error toasts", async () => {
    const { list, assertive, polite } = buildToaster({ maxVisible: 3, count: 0 });
    list.appendChild(
      buildConnectedToast({
        message: "Upload failed",
        type: "error",
        typeLabel: "Error",
        mode: "dialog",
        timeout: 0,
      }),
    );
    await waitForController();
    await flushAnnouncements();
    expect(assertive.textContent).toBe("");
    expect(polite.textContent).toBe("");
  });

  it("routes interrupt status toasts into the assertive live region", async () => {
    const { list, assertive } = buildToaster({ maxVisible: 3, count: 0 });
    list.appendChild(
      buildConnectedToast({
        message: "Upload failed",
        type: "error",
        typeLabel: "Error",
        mode: "status",
        timeout: 6000,
        interrupt: true,
      }),
    );
    await waitForController();
    await flushAnnouncements();
    expect(assertive.textContent).toBe("Error: Upload failed");
  });

  it("queues forever preference for unconnected toast controllers without mutating dialog roles", async () => {
    window.localStorage.setItem("pathogen.toast.durationMs", "forever");
    const { list } = buildToaster({ maxVisible: 3, count: 1 });
    await waitForController();

    const toast = list.querySelector("li");
    expect(toast.getAttribute("data-pathogen--toast-duration-preference-value")).toBe("0");
    expect(toast.getAttribute("role")).not.toBe("dialog");
    expect(toast.getAttribute("data-pathogen--toast-mode-value")).toBe("status");
  });

  it("promotes connected status toasts through toast controller when preference is forever", async () => {
    window.localStorage.setItem("pathogen.toast.durationMs", "forever");
    const { list } = buildToaster({ maxVisible: 3, count: 0 });
    const toast = buildConnectedToast({
      message: "Saved",
      type: "success",
      typeLabel: "Success",
      mode: "status",
      timeout: 6000,
    });
    list.appendChild(toast);

    await waitForController();
    await waitForAnimationFrame();

    expect(toast.getAttribute("data-pathogen--toast-mode-value")).toBe("dialog");
    expect(toast.getAttribute("data-pathogen--toast-dismissible-value")).toBe("true");
    expect(toast.getAttribute("role")).toBe("listitem");
    expect(toast.querySelector('[data-pathogen--toast-target="dialog"]')).not.toBeNull();
  });

  it("reads duration preference from the configured storage key", async () => {
    window.localStorage.setItem("app.toastDuration", "20000");
    const { section, list } = buildToaster({ maxVisible: 3, count: 1 });
    section.setAttribute("data-pathogen--toaster-duration-storage-key-value", "app.toastDuration");

    await waitForController();

    const toast = list.querySelector("li");
    expect(toast.getAttribute("data-pathogen--toast-timeout-value")).toBe("20000");
  });
});
