import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ToastController from "../../../app/assets/javascripts/pathogen_view_components/toast_controller";

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
  const list = document.createElement("ol");

  const toast = document.createElement("li");
  toast.dataset.state = "open";
  toast.setAttribute("data-controller", "pathogen--toast");
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
  if (mode === "dialog") {
    shell.setAttribute("role", "dialog");
    shell.setAttribute("aria-modal", "false");
    shell.tabIndex = -1;
    shell.setAttribute("data-pathogen--toast-target", "dialog");
  }

  const messageNode = document.createElement("p");
  const messageText = document.createElement("span");
  messageText.id = "msg-1";
  messageText.setAttribute("data-pathogen--toast-target", "message");
  messageText.textContent = message;
  messageNode.appendChild(messageText);
  shell.appendChild(messageNode);

  if (description) {
    const descriptionNode = document.createElement("p");
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
  document.body.appendChild(list);
  return { list, toast };
};

describe("toast_controller", () => {
  let application;

  beforeEach(() => {
    application = Application.start();
    application.register("pathogen--toast", ToastController);
  });

  afterEach(() => {
    vi.useRealTimers();
    application?.stop();
    document.body.innerHTML = "";
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
    expect(listener.mock.calls[0][0].detail.politeness).toBe("assertive");
    expect(listener.mock.calls[0][0].detail.message).toBe("Error: Upload failed. The file is too large.");
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

  it("promotes status toasts to dialogs when duration preference is forever", async () => {
    window.localStorage.setItem("pathogen.toast.durationMs", "forever");
    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);

    const { toast } = buildToast({ timeout: 1000, mode: "status", dismissible: false, withButton: true });
    await waitForController();
    await waitForAnimationFrames();

    expect(toast.getAttribute("data-pathogen--toast-mode-value")).toBe("dialog");
    expect(toast.querySelector('[role="dialog"]')).not.toBeNull();
    expect(listener).not.toHaveBeenCalled();
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
});

const waitForAnimationFrames = async () => {
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
};
