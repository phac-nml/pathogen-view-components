import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ToastController from "../../../app/assets/javascripts/pathogen_view_components/toast_controller";

const waitForController = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildToast = ({
  timeout = 1000,
  type = "info",
  typeLabel = { success: "Success", info: "Information", warning: "Warning", error: "Error" }[type] || "Information",
  dismissible = true,
  message = "Saved",
  description = "",
  withButton = true,
} = {}) => {
  const list = document.createElement("ol");

  const toast = document.createElement("li");
  toast.tabIndex = 0;
  toast.dataset.state = "open";
  toast.setAttribute("data-controller", "pathogen--toast");
  toast.setAttribute("data-pathogen--toast-timeout-value", String(timeout));
  toast.setAttribute("data-pathogen--toast-type-value", type);
  toast.setAttribute("data-pathogen--toast-type-label-value", typeLabel);
  toast.setAttribute("data-pathogen--toast-dismissible-value", String(dismissible));
  toast.setAttribute("data-pathogen--toast-dismiss-duration-value", "160");

  const messageNode = document.createElement("p");
  const messageText = document.createElement("span");
  messageText.setAttribute("data-pathogen--toast-target", "message");
  messageText.textContent = message;
  messageNode.appendChild(messageText);
  toast.appendChild(messageNode);

  if (description) {
    const descriptionNode = document.createElement("p");
    descriptionNode.setAttribute("data-pathogen--toast-target", "description");
    descriptionNode.textContent = description;
    toast.appendChild(descriptionNode);
  }

  if (withButton) {
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.setAttribute("data-action", "click->pathogen--toast#dismiss");
    toast.appendChild(closeButton);
  }

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
  });

  it("auto-dismisses when timeout elapses", async () => {
    vi.useFakeTimers();
    const { toast } = buildToast({ timeout: 1000, type: "info" });
    await waitForController();

    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(160);
    await waitForController();
    expect(document.body.contains(toast)).toBe(false);
  });

  it("pauses timer on focus and resumes on blur", async () => {
    const { toast } = buildToast({ timeout: 80, type: "info" });
    const outside = document.createElement("button");
    outside.textContent = "outside";
    document.body.appendChild(outside);
    await waitForController();

    outside.focus();
    toast.focus();
    toast.dispatchEvent(new FocusEvent("focusin", { bubbles: true, relatedTarget: outside }));
    await sleep(120);
    expect(document.body.contains(toast)).toBe(true);

    outside.focus();
    toast.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: outside }));
    await sleep(280);
    expect(document.body.contains(toast)).toBe(false);
  });

  it("dismisses focused toast on Escape and restores prior focus", async () => {
    vi.useFakeTimers();
    const previous = document.createElement("button");
    previous.textContent = "previous";
    document.body.appendChild(previous);

    const { toast } = buildToast({ timeout: 0, type: "info" });
    await waitForController();

    previous.focus();
    toast.focus();
    toast.dispatchEvent(new FocusEvent("focusin", { bubbles: true, relatedTarget: previous }));
    toast.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));

    vi.advanceTimersByTime(160);
    await waitForController();
    expect(document.body.contains(toast)).toBe(false);
    expect(document.activeElement).toBe(previous);
  });

  it("emits an assertive announcement with message and description for error toasts", async () => {
    buildToast({ timeout: 0, type: "error", message: "Upload failed", description: "The file is too large." });
    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);

    await waitForController();
    expect(listener).toHaveBeenCalledTimes(1);
    const { detail } = listener.mock.calls[0][0];
    expect(detail.politeness).toBe("assertive");
    expect(detail.message).toBe("Error: Upload failed. The file is too large.");
  });

  it("emits a polite announcement for non-error toasts", async () => {
    buildToast({ timeout: 0, type: "success", message: "Saved" });
    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);

    await waitForController();
    expect(listener).toHaveBeenCalledTimes(1);
    const { detail } = listener.mock.calls[0][0];
    expect(detail.politeness).toBe("polite");
    expect(detail.message).toBe("Success: Saved");
  });

  it("does not duplicate the type label when message already includes it", async () => {
    buildToast({ timeout: 0, type: "error", typeLabel: "Error", message: "Error: Upload failed" });
    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast:announce", listener);

    await waitForController();
    const { detail } = listener.mock.calls[0][0];
    expect(detail.message).toBe("Error: Upload failed");
  });

  it("restores focus to the prior element when dismissed via the close button", async () => {
    vi.useFakeTimers();
    const previous = document.createElement("button");
    previous.textContent = "previous";
    document.body.appendChild(previous);

    const { toast } = buildToast({ timeout: 0, type: "info" });
    await waitForController();

    previous.focus();
    toast.focus();
    toast.dispatchEvent(new FocusEvent("focusin", { bubbles: true, relatedTarget: previous }));

    toast.querySelector("button").dispatchEvent(new MouseEvent("click", { bubbles: true }));

    vi.advanceTimersByTime(160);
    await waitForController();
    expect(document.body.contains(toast)).toBe(false);
    expect(document.activeElement).toBe(previous);
  });

  it("restores focus to the most recent entry target", async () => {
    vi.useFakeTimers();
    const first = document.createElement("button");
    first.textContent = "first";
    const second = document.createElement("button");
    second.textContent = "second";
    document.body.appendChild(first);
    document.body.appendChild(second);

    const { toast } = buildToast({ timeout: 0, type: "info" });
    await waitForController();

    first.focus();
    toast.focus();
    toast.dispatchEvent(new FocusEvent("focusin", { bubbles: true, relatedTarget: first }));

    second.focus();
    toast.focus();
    toast.dispatchEvent(new FocusEvent("focusin", { bubbles: true, relatedTarget: second }));
    toast.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));

    vi.advanceTimersByTime(160);
    await waitForController();
    expect(document.body.contains(toast)).toBe(false);
    expect(document.activeElement).toBe(second);
  });
});
