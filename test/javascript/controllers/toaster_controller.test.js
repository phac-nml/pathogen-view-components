import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ToastController from "../../../app/assets/javascripts/pathogen_view_components/toast_controller";
import ToasterController from "../../../app/assets/javascripts/pathogen_view_components/toaster_controller";
import {
  buildConnectedToast,
  buildToast,
  buildToaster,
  flushAnnouncements,
  mockReducedMotion,
  waitForAnimationFrame,
  waitForController,
} from "./support/toaster_test_setup";

describe("toaster_controller lifecycle, focus, and dismissal", () => {
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

  it("reflows the stack when the reduced-motion preference changes", async () => {
    const { section } = buildToaster({ maxVisible: 2, count: 4 });
    await waitForController();

    const index = window.matchMedia.mock.calls.findIndex(([query]) => query === "(prefers-reduced-motion: reduce)");
    const query = window.matchMedia.mock.results[index].value;
    const [, handler] = query.addEventListener.mock.calls.find(([event]) => event === "change");

    handler();
    await waitForAnimationFrame();

    expect(section.dataset.stack).toBeDefined();
  });

  it("reflows the stack when a toast is resized", async () => {
    let resizeCallback;
    global.ResizeObserver = class {
      constructor(callback) {
        resizeCallback = callback;
      }

      observe() {}

      unobserve() {}

      disconnect() {}
    };
    const { section } = buildToaster({ maxVisible: 2, count: 3 });
    await waitForController();

    resizeCallback();
    await waitForAnimationFrame();

    expect(section.dataset.stack).toBeDefined();
  });

  it("aborts collapse when the toaster disconnects before the frame runs", async () => {
    const { section } = buildToaster({ maxVisible: 2, count: 4 });
    await waitForController();
    const controller = application.getControllerForElementAndIdentifier(section, "pathogen--toaster");

    controller.expand();
    controller.collapseIfIdle();
    section.remove();
    await waitForAnimationFrame();

    expect(section.dataset.expanded).toBe("true");
  });

  it("keeps the stack expanded when collapse runs while hovered", async () => {
    const { section } = buildToaster({ maxVisible: 2, count: 4 });
    await waitForController();
    const controller = application.getControllerForElementAndIdentifier(section, "pathogen--toaster");

    controller.expand();
    vi.spyOn(section, "matches").mockReturnValue(true);
    controller.collapseIfIdle();
    await waitForAnimationFrame();

    expect(section.dataset.expanded).toBe("true");
  });

  it("keeps the stack expanded when focus stays inside during collapse", async () => {
    const { section, more } = buildToaster({ maxVisible: 2, count: 4 });
    await waitForController();
    const controller = application.getControllerForElementAndIdentifier(section, "pathogen--toaster");

    controller.expand();
    more.hidden = false;
    more.focus();
    controller.collapseIfIdle();
    await waitForAnimationFrame();

    expect(section.dataset.expanded).toBe("true");
  });

  it("ignores announcements without a usable message", async () => {
    const { section, polite } = buildToaster({ maxVisible: 3, count: 1 });
    await waitForController();
    const controller = application.getControllerForElementAndIdentifier(section, "pathogen--toaster");

    controller.announce();
    controller.announce({ detail: { message: "   " } });
    controller.announce({ detail: { message: 42 } });
    await flushAnnouncements();

    expect(polite.textContent).toBe("");
  });

  it("skips live-region writes when the regions are missing", async () => {
    const { section, polite, assertive } = buildToaster({ maxVisible: 3, count: 1 });
    polite.remove();
    assertive.remove();
    await waitForController();
    const controller = application.getControllerForElementAndIdentifier(section, "pathogen--toaster");

    controller.announce({ detail: { message: "Saved", politeness: "polite" } });
    controller.announce({ detail: { message: "Boom", politeness: "assertive" } });
    await flushAnnouncements();

    expect(section.isConnected).toBe(true);
  });

  it("stops the arrival frame when the toaster element is not connected", async () => {
    const { section, list } = buildToaster({ count: 0 });
    const toast = buildConnectedToast({
      message: "Review",
      mode: "dialog",
      type: "warning",
      typeLabel: "Warning",
      timeout: 0,
    });
    list.appendChild(toast);
    await waitForController();

    Object.defineProperty(section, "isConnected", { configurable: true, value: false });
    await waitForAnimationFrame();
    await flushAnnouncements();

    expect(toast.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("moves focus to a dialog when the active element is not an HTMLElement", async () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("tabindex", "0");
    document.body.appendChild(svg);
    svg.focus();
    const { list } = buildToaster({ count: 0 });
    const dialog = buildConnectedToast({
      message: "Review",
      mode: "dialog",
      type: "warning",
      typeLabel: "Warning",
      timeout: 0,
    });
    list.appendChild(dialog);
    await waitForController();
    await waitForAnimationFrame();

    expect(document.activeElement).toBe(dialog.querySelector('[role="dialog"]'));
  });

  it("does not move focus to a dialog when focus is already inside the toaster", async () => {
    const { list, more } = buildToaster({ count: 0 });
    more.hidden = false;
    more.focus();
    const dialog = buildConnectedToast({
      message: "Review",
      mode: "dialog",
      type: "warning",
      typeLabel: "Warning",
      timeout: 0,
    });
    list.appendChild(dialog);
    await waitForController();
    await waitForAnimationFrame();

    expect(document.activeElement).toBe(more);
  });

  it("does not move focus to a dialog while a contenteditable region is active", async () => {
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    editable.tabIndex = 0;
    document.body.appendChild(editable);
    editable.focus();
    const { list } = buildToaster({ count: 0 });
    const dialog = buildConnectedToast({
      message: "Review",
      mode: "dialog",
      type: "warning",
      typeLabel: "Warning",
      timeout: 0,
    });
    list.appendChild(dialog);
    await waitForController();
    await waitForAnimationFrame();

    expect(document.activeElement).toBe(editable);
  });

  it("does not move focus to a dialog while a textarea is active", async () => {
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();
    const { list } = buildToaster({ count: 0 });
    const dialog = buildConnectedToast({
      message: "Review",
      mode: "dialog",
      type: "warning",
      typeLabel: "Warning",
      timeout: 0,
    });
    list.appendChild(dialog);
    await waitForController();
    await waitForAnimationFrame();

    expect(document.activeElement).toBe(textarea);
  });

  it("dismisses open dialogs through their toast controllers", async () => {
    const { section, list } = buildToaster({ count: 0 });
    const first = buildConnectedToast({
      message: "One",
      mode: "dialog",
      type: "warning",
      typeLabel: "Warning",
      timeout: 0,
    });
    const second = buildConnectedToast({
      message: "Two",
      mode: "dialog",
      type: "warning",
      typeLabel: "Warning",
      timeout: 0,
    });
    list.append(first, second);
    await waitForController();
    await waitForAnimationFrame();
    const controller = application.getControllerForElementAndIdentifier(section, "pathogen--toaster");

    controller.dismissAll();

    expect(first.dataset.state).toBe("closing");
    expect(second.dataset.state).toBe("closing");
  });

  it("removes dialog toasts that have no controller", async () => {
    const { section, list } = buildToaster({ count: 0 });
    const orphan = buildToast({ text: "Orphan", mode: "dialog", timeout: 0 });
    list.appendChild(orphan);
    await waitForController();
    const controller = application.getControllerForElementAndIdentifier(section, "pathogen--toaster");

    controller.dismissAll();

    expect(list.contains(orphan)).toBe(false);
  });

  it("reflows the stack when a toast reports it was dismissed", async () => {
    const { section } = buildToaster({ maxVisible: 2, count: 3 });
    await waitForController();

    section.dispatchEvent(new CustomEvent("pathogen:toast:dismissed", { bubbles: true }));
    await waitForAnimationFrame();

    expect(section.dataset.stack).toBeDefined();
  });

  it("uses a default more label when no template is configured", async () => {
    const { section, list, more } = buildToaster({ maxVisible: 2, count: 0 });
    delete more.dataset.template;
    ["older", "middle", "front", "latest"].forEach((text) => {
      const toast = buildToast({ text });
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
    });
    await waitForController();
    await waitForAnimationFrame();

    expect(section.dataset.stack).toBe("peek");
    expect(more.textContent).toMatch(/^\+\d+ more$/);
  });

  it("uses the measured column width for peek metrics when available", async () => {
    const { section, list } = buildToaster({ maxVisible: 3, count: 0 });
    Object.defineProperty(list, "clientWidth", { configurable: true, value: 300 });
    ["older", "middle", "front"].forEach((text) => {
      const toast = buildToast({ text });
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
    });
    await waitForController();
    await waitForAnimationFrame();

    expect(section.style.getPropertyValue("--front-width")).toBe("300px");
  });

  it("defaults the column width to zero when the list width is unavailable", async () => {
    const { section, list } = buildToaster({ maxVisible: 3, count: 0 });
    Object.defineProperty(list, "clientWidth", { configurable: true, value: undefined });
    ["older", "middle", "front"].forEach((text) => {
      const toast = buildToast({ text });
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
    });
    await waitForController();
    await waitForAnimationFrame();

    expect(section.dataset.stack).toBe("peek");
  });

  it("skips list metrics when no list element is present", async () => {
    const { section, list } = buildToaster({ maxVisible: 3, count: 0 });
    ["older", "middle", "front"].forEach((text) => {
      section.appendChild(buildToast({ text }));
    });
    list.remove();
    await waitForController();
    await waitForAnimationFrame();

    expect(section.dataset.stack).toBeDefined();
    expect(section.querySelector("ol")).toBeNull();
  });
});
