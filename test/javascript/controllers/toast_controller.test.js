import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ToastController from "../../../app/assets/javascripts/pathogen_view_components/toast_controller";
import ToasterController from "../../../app/assets/javascripts/pathogen_view_components/toaster_controller";

const waitForController = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const buildToast = ({
  timeout = 1000,
  type = "info",
  typeLabel = { success: "Success", info: "Information", warning: "Warning", error: "Error" }[type] || "Information",
  dismissible = false,
  mode = "status",
  interrupt = false,
  message = "Saved",
  description = "",
  withButton = false,
} = {}) => {
  const host = document.createElement("div");
  host.setAttribute("data-controller", "pathogen--toaster");
  host.setAttribute("data-action", "pathogen:toast:ready->pathogen--toaster#presentToast");
  const list = document.createElement("ol");

  const toast = document.createElement("li");
  toast.dataset.state = "open";
  toast.setAttribute("data-controller", "pathogen--toast");
  toast.setAttribute("data-pathogen--toaster-target", "toast");
  toast.setAttribute("data-pathogen--toast-timeout-value", String(timeout));
  toast.setAttribute("data-pathogen--toast-type-value", type);
  toast.setAttribute("data-pathogen--toast-type-label-value", typeLabel);
  toast.setAttribute("data-pathogen--toast-dismissible-value", String(dismissible));
  toast.setAttribute("data-pathogen--toast-mode-value", mode);
  toast.setAttribute("data-pathogen--toast-interrupt-value", String(interrupt));
  toast.setAttribute("data-pathogen--toast-dismiss-duration-value", "160");
  toast.setAttribute("aria-live", "off");
  toast.setAttribute("role", "listitem");

  const shell = document.createElement("div");
  shell.setAttribute("data-pathogen--toast-target", "dialog");
  shell.dataset.dialogLabelledby = "type-1 msg-1";
  if (description) shell.dataset.dialogDescribedby = "desc-1";
  if (mode === "dialog") {
    shell.setAttribute("role", "dialog");
    shell.setAttribute("aria-modal", "false");
    shell.tabIndex = -1;
    shell.setAttribute("aria-labelledby", shell.dataset.dialogLabelledby);
    if (description) shell.setAttribute("aria-describedby", shell.dataset.dialogDescribedby);
  }

  const messageNode = document.createElement("p");
  const severity = document.createElement("span");
  severity.id = "type-1";
  severity.textContent = `${typeLabel}:`;
  messageNode.appendChild(severity);
  const messageText = document.createElement("span");
  messageText.id = "msg-1";
  messageText.setAttribute("data-pathogen--toast-target", "message");
  messageText.textContent = message;
  messageNode.appendChild(messageText);
  shell.appendChild(messageNode);

  if (description) {
    const descriptionNode = document.createElement("p");
    descriptionNode.id = "desc-1";
    descriptionNode.setAttribute("data-pathogen--toast-target", "description");
    descriptionNode.textContent = description;
    shell.appendChild(descriptionNode);
  }

  const dismiss = document.createElement("div");
  dismiss.setAttribute("data-pathogen--toast-target", "dismiss");
  if (!dismissible && mode !== "dialog") dismiss.hidden = true;
  if (withButton || dismissible || mode === "dialog") {
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.setAttribute("data-action", "click->pathogen--toast#dismiss");
    dismiss.appendChild(closeButton);
  }
  shell.appendChild(dismiss);
  toast.appendChild(shell);

  list.appendChild(toast);
  host.appendChild(list);
  document.body.appendChild(host);
  return { host, list, toast, shell };
};

describe("toast_controller", () => {
  let application;

  const getController = (toast) => application.getControllerForElementAndIdentifier(toast, "pathogen--toast");

  const stubReducedMotion = (matches) =>
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));

  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    application = Application.start();
    application.register("pathogen--toaster", ToasterController);
    application.register("pathogen--toast", ToastController);
  });

  afterEach(async () => {
    document.body.innerHTML = "";
    await waitForController();
    application?.stop();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    window.localStorage?.removeItem("pathogen.toast.durationMs");
  });

  it("auto-dismisses status toasts when timeout elapses", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 1000, type: "info", mode: "status" });
    await waitForController();

    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(160);
    await waitForController();
    expect(document.body.contains(toast)).toBe(false);
  });

  it("does not put status toasts in the tab order", async () => {
    const { toast } = buildToast({ timeout: 0, mode: "status", dismissible: false, withButton: false });
    await waitForController();
    expect(toast.hasAttribute("tabindex")).toBe(false);
  });

  it("pauses timer on hover and resumes on mouse leave", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 80, type: "info", mode: "status" });
    await waitForController();

    toast.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    vi.advanceTimersByTime(120);
    await waitForController();
    expect(document.body.contains(toast)).toBe(true);

    toast.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    vi.advanceTimersByTime(80);
    vi.advanceTimersByTime(160);
    await waitForController();
    expect(document.body.contains(toast)).toBe(false);
  });

  it("resumes only the remaining timeout after a partial hover pause", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { toast } = buildToast({ timeout: 1000 });
    await waitForController();

    vi.advanceTimersByTime(600);
    toast.dispatchEvent(new MouseEvent("mouseenter"));
    vi.advanceTimersByTime(2000);
    expect(toast.dataset.state).toBe("open");

    toast.dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(399);
    expect(toast.dataset.state).toBe("open");
    vi.advanceTimersByTime(1);
    expect(toast.dataset.state).toBe("closing");
    vi.advanceTimersByTime(160);
    expect(toast.isConnected).toBe(false);
  });

  it("keeps the remaining timeout across disconnect and reconnect", async () => {
    vi.useFakeTimers();
    window.localStorage.setItem("pathogen.toast.durationMs", "1000");
    const { toast, list } = buildToast({ timeout: 6000 });
    await waitForController();

    vi.advanceTimersByTime(600);
    toast.remove();
    await waitForController();
    vi.advanceTimersByTime(2000);
    list.appendChild(toast);
    await waitForController();

    vi.advanceTimersByTime(399);
    expect(toast.dataset.state).toBe("open");
    vi.advanceTimersByTime(1);
    expect(toast.dataset.state).toBe("closing");
  });

  it("dialog mode focuses the dialog shell and does not announce", async () => {
    const previous = document.createElement("button");
    previous.textContent = "previous";
    document.body.appendChild(previous);
    previous.focus();

    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);

    const { toast } = buildToast({
      timeout: 0,
      type: "error",
      mode: "dialog",
      dismissible: true,
      withButton: true,
      message: "Upload failed",
    });
    await waitForController();
    await waitForAnimationFrames();

    const dialog = toast.querySelector('[role="dialog"]');
    expect(listener).not.toHaveBeenCalled();
    expect(dialog).not.toBeNull();
    expect(document.activeElement).toBe(dialog);
  });

  it("emits a polite announcement for status toasts", async () => {
    buildToast({ timeout: 0, type: "success", mode: "status", message: "Saved" });
    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);

    await waitForController();
    await waitForAnimationFrames();
    expect(listener).toHaveBeenCalledTimes(1);
    const { detail } = listener.mock.calls[0][0];
    expect(detail.politeness).toBe("polite");
    expect(detail.message).toBe("Success: Saved");
  });

  it("emits assertive announcements only when interrupt is true", async () => {
    buildToast({
      timeout: 0,
      type: "error",
      mode: "status",
      interrupt: true,
      message: "Upload failed",
      description: "The file is too large.",
    });
    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);

    await waitForController();
    await waitForAnimationFrames();
    expect(listener.mock.calls[0][0].detail.politeness).toBe("assertive");
    expect(listener.mock.calls[0][0].detail.message).toBe("Error: Upload failed. The file is too large.");
  });

  it("interrupt dialogs announce assertively without stealing focus", async () => {
    const previous = document.createElement("button");
    previous.textContent = "previous";
    document.body.appendChild(previous);
    previous.focus();

    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);

    const { toast } = buildToast({
      timeout: 0,
      type: "error",
      mode: "dialog",
      dismissible: true,
      withButton: true,
      interrupt: true,
      message: "Critical failure",
    });
    await waitForController();
    await waitForAnimationFrames();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.politeness).toBe("assertive");
    // The assertive announcement carries the urgency; focus stays with the user.
    expect(toast.contains(document.activeElement)).toBe(false);
    expect(document.activeElement).toBe(previous);
  });

  it("does not move focus into a dialog while the user is typing", async () => {
    const field = document.createElement("input");
    field.type = "text";
    document.body.appendChild(field);
    field.focus();

    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);

    const { toast } = buildToast({
      timeout: 0,
      type: "error",
      mode: "dialog",
      dismissible: true,
      withButton: true,
      message: "Upload failed",
    });
    await waitForController();
    await waitForAnimationFrames();

    // Focus stays in the field; the dialog announces politely instead of
    // hijacking active text entry.
    expect(document.activeElement).toBe(field);
    expect(toast.contains(document.activeElement)).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.politeness).toBe("polite");
  });

  it("dismisses focused dialog on Escape and restores prior focus", async () => {
    const previous = document.createElement("button");
    previous.textContent = "previous";
    document.body.appendChild(previous);
    previous.focus();

    const { toast } = buildToast({
      timeout: 0,
      type: "info",
      mode: "dialog",
      dismissible: true,
      withButton: true,
    });
    await waitForController();
    await waitForAnimationFrames();

    vi.useFakeTimers();
    toast.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));

    vi.advanceTimersByTime(160);
    await waitForController();
    expect(document.body.contains(toast)).toBe(false);
    expect(document.activeElement).toBe(previous);
  });

  it("promotes the existing shell with its server-provided labels when the duration preference is forever", async () => {
    window.localStorage.setItem("pathogen.toast.durationMs", "forever");
    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);

    const { toast, shell } = buildToast({
      timeout: 1000,
      mode: "status",
      dismissible: false,
      withButton: true,
      description: "Your changes are available.",
    });
    const content = shell.firstElementChild;
    await waitForController();
    await waitForAnimationFrames();

    expect(toast.getAttribute("data-pathogen--toast-mode-value")).toBe("dialog");
    expect(toast.querySelector('[role="dialog"]')).toBe(shell);
    expect(toast.firstElementChild).toBe(shell);
    expect(shell.firstElementChild).toBe(content);
    expect(shell.getAttribute("aria-labelledby")).toBe("type-1 msg-1");
    expect(shell.getAttribute("aria-describedby")).toBe("desc-1");
    expect(shell.getAttribute("aria-modal")).toBe("false");
    expect(shell.tabIndex).toBe(-1);
    expect(toast.querySelector('[data-pathogen--toast-target="dismiss"]').hidden).toBe(false);

    // A status toast promoted purely by a stored preference is not a user
    // action, so it announces politely rather than stealing focus.
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.politeness).toBe("polite");
    expect(toast.contains(document.activeElement)).toBe(false);
  });

  it("restores focus to the prior element when dismissed via the close button", async () => {
    const previous = document.createElement("button");
    previous.textContent = "previous";
    document.body.appendChild(previous);
    previous.focus();

    const { toast } = buildToast({
      timeout: 0,
      type: "info",
      mode: "dialog",
      dismissible: true,
      withButton: true,
    });
    await waitForController();
    await waitForAnimationFrames();

    vi.useFakeTimers();
    toast.querySelector("button").dispatchEvent(new MouseEvent("click", { bubbles: true }));

    vi.advanceTimersByTime(160);
    await waitForController();
    expect(document.body.contains(toast)).toBe(false);
    expect(document.activeElement).toBe(previous);
  });

  it("does not present a promoted status again after reconnecting", async () => {
    window.localStorage.setItem("pathogen.toast.durationMs", "forever");
    const previous = document.createElement("button");
    document.body.appendChild(previous);
    previous.focus();
    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);
    const { toast, list, shell } = buildToast({ withButton: true });
    await waitForController();
    await waitForAnimationFrames();
    expect(shell.getAttribute("role")).toBe("dialog");
    expect(listener).toHaveBeenCalledTimes(1);

    toast.remove();
    await waitForController();
    list.appendChild(toast);
    await waitForController();
    await waitForAnimationFrames();

    expect(document.activeElement).toBe(previous);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(toast.querySelector('[role="dialog"]')).toBe(shell);
  });

  it("cancels pending dismissal work when disconnected", async () => {
    const previous = document.createElement("button");
    document.body.appendChild(previous);
    previous.focus();
    const { toast } = buildToast({ timeout: 0, mode: "dialog", dismissible: true });
    await waitForController();
    await waitForAnimationFrames();

    vi.useFakeTimers();
    toast.querySelector("button").click();
    toast.remove();
    await waitForController();
    const next = document.createElement("button");
    document.body.appendChild(next);
    next.focus();
    vi.advanceTimersByTime(160);

    expect(document.activeElement).toBe(next);
  });

  it("removes itself if connect runs while closing", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 1000, mode: "status", dismissible: true, withButton: true });
    await waitForController();
    const controller = getController(toast);

    controller.dismiss();
    expect(toast.dataset.state).toBe("closing");
    controller.connect();

    expect(document.body.contains(toast)).toBe(false);
  });

  it("ignores present() once the toast has been presented", async () => {
    const { toast } = buildToast({ timeout: 0, mode: "status" });
    await waitForController();
    await waitForAnimationFrames();
    const controller = getController(toast);

    expect(controller.awaitingPresentation).toBe(false);
    expect(() => controller.present()).not.toThrow();
  });

  it("ignores duration preferences after the toast starts closing", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 1000, mode: "status", dismissible: true, withButton: true });
    await waitForController();
    const controller = getController(toast);

    controller.dismiss();
    controller.applyDurationPreference("2000");

    expect(controller.timeoutValue).toBe(1000);
    vi.advanceTimersByTime(160);
    await waitForController();
  });

  it("applies a shorter duration preference to an open status toast", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 5000, mode: "status" });
    await waitForController();
    const controller = getController(toast);

    controller.applyDurationPreference("1000");
    expect(controller.timeoutValue).toBe(1000);

    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(160);
    await waitForController();
    expect(document.body.contains(toast)).toBe(false);
  });

  it("does not restart the timer when focus is inside during a duration change", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 5000, mode: "status", dismissible: true, withButton: true });
    await waitForController();
    const controller = getController(toast);

    toast.querySelector("button").focus();
    controller.applyDurationPreference("1000");

    expect(controller.timeoutValue).toBe(1000);
    vi.advanceTimersByTime(5000);
    expect(toast.dataset.state).toBe("open");
  });

  it("does not restart the timer while hovering during a duration change", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 5000, mode: "status" });
    await waitForController();
    const controller = getController(toast);

    vi.spyOn(toast, "matches").mockImplementation((selector) => selector === ":hover");
    controller.applyDurationPreference("1000");

    vi.advanceTimersByTime(5000);
    expect(toast.dataset.state).toBe("open");
  });

  it("promoteToDialog is a no-op for a toast already in dialog mode", async () => {
    const { toast } = buildToast({ timeout: 0, mode: "dialog", dismissible: true, withButton: true });
    await waitForController();
    await waitForAnimationFrames();
    const controller = getController(toast);

    controller.promoteToDialog();
    expect(toast.getAttribute("data-pathogen--toast-mode-value")).toBe("dialog");
  });

  it("promoteToDialog is a no-op once the toast is closing", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 1000, mode: "status", dismissible: true, withButton: true });
    await waitForController();
    const controller = getController(toast);

    controller.dismiss();
    controller.promoteToDialog();

    expect(toast.getAttribute("data-pathogen--toast-mode-value")).toBe("status");
    vi.advanceTimersByTime(160);
    await waitForController();
  });

  it("promoteToDialog focuses the shell when promoted directly", async () => {
    const { toast, shell } = buildToast({ timeout: 1000, mode: "status", withButton: true });
    await waitForController();
    await waitForAnimationFrames();
    const controller = getController(toast);

    controller.promoteToDialog();

    expect(document.activeElement).toBe(shell);
    expect(toast.getAttribute("data-pathogen--toast-mode-value")).toBe("dialog");
  });

  it("does not focus the shell when promoting a disconnected toast", async () => {
    const { toast, shell } = buildToast({ timeout: 1000, mode: "status", withButton: true });
    await waitForController();
    const controller = getController(toast);

    toast.remove();
    await waitForController();
    controller.promoteToDialog();

    expect(document.activeElement).not.toBe(shell);
  });

  it("stays paused when focus moves between elements inside the toast", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 1000, dismissible: true, withButton: true });
    await waitForController();
    const button = toast.querySelector("button");

    toast.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    toast.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: button }));

    vi.advanceTimersByTime(5000);
    expect(toast.dataset.state).toBe("open");
  });

  it("ignores non-Escape keydowns", async () => {
    const { toast } = buildToast({ timeout: 0, mode: "dialog", dismissible: true, withButton: true });
    await waitForController();
    await waitForAnimationFrames();

    toast.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    expect(toast.dataset.state).toBe("open");
  });

  it("ignores Escape on a non-dismissible toast", async () => {
    const { toast } = buildToast({ timeout: 0, mode: "status", dismissible: false });
    await waitForController();

    toast.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    expect(toast.dataset.state).toBe("open");
  });

  it("ignores Escape when focus is outside the dialog", async () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    const { toast } = buildToast({ timeout: 0, mode: "dialog", dismissible: true, withButton: true });
    await waitForController();
    await waitForAnimationFrames();

    outside.focus();
    toast.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));

    expect(toast.dataset.state).toBe("open");
  });

  it("does not start a second timer when one is already running", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 1000, mode: "status" });
    await waitForController();

    toast.dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(160);
    await waitForController();

    expect(document.body.contains(toast)).toBe(false);
  });

  it("ignores resume attempts after the toast is closing", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 1000, mode: "status", dismissible: true, withButton: true });
    await waitForController();
    const controller = getController(toast);

    controller.dismiss();
    toast.dispatchEvent(new MouseEvent("mouseleave"));

    vi.advanceTimersByTime(160);
    await waitForController();
    expect(document.body.contains(toast)).toBe(false);
  });

  it("does not resume while focus is inside the toast", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 1000, dismissible: true, withButton: true });
    await waitForController();

    toast.querySelector("button").focus();
    toast.dispatchEvent(new MouseEvent("mouseleave"));

    vi.advanceTimersByTime(5000);
    expect(toast.dataset.state).toBe("open");
  });

  it("does not resume while the pointer hovers the toast", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 1000, mode: "status" });
    await waitForController();

    toast.dispatchEvent(new MouseEvent("mouseenter"));
    vi.spyOn(toast, "matches").mockImplementation((selector) => selector === ":hover");
    toast.dispatchEvent(new MouseEvent("mouseleave"));

    vi.advanceTimersByTime(5000);
    expect(toast.dataset.state).toBe("open");
  });

  it("ignores a repeated dismiss request", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 0, mode: "dialog", dismissible: true, withButton: true });
    await waitForController();
    const controller = getController(toast);

    controller.dismiss();
    expect(toast.dataset.state).toBe("closing");
    controller.dismiss();

    vi.advanceTimersByTime(160);
    await waitForController();
    expect(document.body.contains(toast)).toBe(false);
  });

  it("dismisses instantly when reduced motion is preferred", async () => {
    stubReducedMotion(true);
    const { toast } = buildToast({ timeout: 0, mode: "status", dismissible: true, withButton: true });
    await waitForController();
    await waitForAnimationFrames();
    const controller = getController(toast);

    vi.useFakeTimers();
    controller.dismiss();
    vi.advanceTimersByTime(0);
    await waitForController();

    expect(document.body.contains(toast)).toBe(false);
  });

  it("restores no focus when nothing was captured before dismissal", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 0, mode: "status", dismissible: true, withButton: true });
    await waitForController();
    const controller = getController(toast);

    controller.dismiss();
    vi.advanceTimersByTime(160);
    await waitForController();

    expect(document.body.contains(toast)).toBe(false);
  });

  it("uses the fallback dismiss duration when matchMedia is unavailable", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 0, mode: "status", dismissible: true, withButton: true });
    await waitForController();
    const controller = getController(toast);

    const original = window.matchMedia;
    window.matchMedia = undefined;
    try {
      controller.dismiss();
    } finally {
      window.matchMedia = original;
    }

    expect(toast.dataset.state).toBe("closing");
    vi.advanceTimersByTime(159);
    expect(document.body.contains(toast)).toBe(true);
    vi.advanceTimersByTime(1);
    await waitForController();
    expect(document.body.contains(toast)).toBe(false);
  });

  it("does not announce when there is no message or type label", async () => {
    buildToast({ timeout: 0, mode: "status", typeLabel: "", message: "" });
    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);

    await waitForController();
    await waitForAnimationFrames();
    expect(listener).not.toHaveBeenCalled();
  });

  it("announces the plain message when no type label is present", async () => {
    buildToast({ timeout: 0, mode: "status", typeLabel: "", message: "All done" });
    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);

    await waitForController();
    await waitForAnimationFrames();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.message).toBe("All done");
  });

  it("announces only the type label when the message is empty", async () => {
    buildToast({ timeout: 0, mode: "status", typeLabel: "Success", message: "" });
    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);

    await waitForController();
    await waitForAnimationFrames();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.message).toBe("Success");
  });

  it("does not double-prefix a message that already starts with the type label", async () => {
    buildToast({ timeout: 0, mode: "status", typeLabel: "Success", message: "Success: Saved" });
    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);

    await waitForController();
    await waitForAnimationFrames();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.message).toBe("Success: Saved");
  });

  it("announces a dialog when focus does not land on the shell", async () => {
    const { toast, shell } = buildToast({ timeout: 0, mode: "dialog", dismissible: true, withButton: true });
    vi.spyOn(shell, "focus").mockImplementation(() => {});
    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);

    await waitForController();
    await waitForAnimationFrames();

    expect(document.activeElement).not.toBe(shell);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(toast.querySelector('[role="dialog"]')).toBe(shell);
  });

  it("removes a dismissed toast that has already lost its parent", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 0, mode: "status", dismissible: true, withButton: true });
    await waitForController();
    const controller = getController(toast);
    const dismissed = vi.fn();
    document.body.addEventListener("pathogen:toast:dismissed", dismissed);

    controller.dismiss();
    toast.remove();
    vi.advanceTimersByTime(160);

    expect(dismissed).not.toHaveBeenCalled();
    expect(toast.isConnected).toBe(false);
  });

  it("announces the type label when no message target is present", async () => {
    const { toast } = buildToast({ timeout: 0, mode: "status", typeLabel: "Success", message: "Saved" });
    toast.querySelector('[data-pathogen--toast-target="message"]').remove();
    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);

    await waitForController();
    await waitForAnimationFrames();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.message).toBe("Success");
  });

  it("ignores a blank description when announcing", async () => {
    buildToast({ timeout: 0, mode: "status", typeLabel: "Success", message: "Saved", description: " " });
    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);

    await waitForController();
    await waitForAnimationFrames();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.message).toBe("Success: Saved");
  });
});

const waitForAnimationFrames = async () => {
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
};
