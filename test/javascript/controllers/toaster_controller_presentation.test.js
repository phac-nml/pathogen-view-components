import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ToastController from "../../../app/assets/javascripts/pathogen_view_components/toast_controller";
import ToasterController from "../../../app/assets/javascripts/pathogen_view_components/toaster_controller";
import {
  buildConnectedToast,
  buildToaster,
  flushAnnouncements,
  mockReducedMotion,
  waitForAnimationFrame,
  waitForController,
} from "./support/toaster_test_setup";

describe("toaster_controller announcements and presentation", () => {
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

  it("prefers an explicit duration preference when configured", async () => {
    const { section, list } = buildToaster({ maxVisible: 3, count: 1 });
    section.setAttribute("data-pathogen--toaster-duration-preference-value", "20000");

    await waitForController();

    const toast = list.querySelector("li");
    expect(toast.getAttribute("data-pathogen--toast-timeout-value")).toBe("20000");
  });

  it("falls back to the default storage key when the configured key is blank", async () => {
    window.localStorage.setItem("pathogen.toast.durationMs", "20000");
    const { section, list } = buildToaster({ maxVisible: 3, count: 1 });
    section.setAttribute("data-pathogen--toaster-duration-storage-key-value", "");

    await waitForController();

    const toast = list.querySelector("li");
    expect(toast.getAttribute("data-pathogen--toast-timeout-value")).toBe("20000");
  });
});
