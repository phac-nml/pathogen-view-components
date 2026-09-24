import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CopyableValueController from "../../../app/assets/javascripts/pathogen_view_components/copyable_value_controller";

const waitForController = () => new Promise((resolve) => setTimeout(resolve, 0));

const appendCopyableValue = () => {
  const container = document.createElement("span");
  container.setAttribute("data-controller", "pathogen--copyable-value");
  container.setAttribute("data-pathogen--copyable-value-copied-message-value", "Copied to clipboard");
  container.setAttribute("data-pathogen--copyable-value-copy-failed-message-value", "Unable to copy to clipboard");
  container.setAttribute("data-pathogen--copyable-value-reset-delay-value", "2000");
  container.dataset.state = "idle";

  const text = document.createElement("span");
  text.setAttribute("data-pathogen--copyable-value-target", "text");
  text.textContent = "INXT_PRJ_A2G6VVJNCN";

  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("data-action", "click->pathogen--copyable-value#copy");

  const icon = document.createElement("span");
  icon.setAttribute("data-pathogen--copyable-value-target", "icon");

  const successIcon = document.createElement("span");
  successIcon.setAttribute("data-pathogen--copyable-value-target", "successIcon");

  const announcement = document.createElement("span");
  announcement.setAttribute("data-pathogen--copyable-value-target", "announcement");

  button.appendChild(icon);
  button.appendChild(successIcon);
  container.appendChild(text);
  container.appendChild(button);
  container.appendChild(announcement);
  document.body.appendChild(container);

  return { container, text, icon, successIcon, announcement };
};

describe("copyable_value_controller", () => {
  let application;
  let originalClipboard;
  let originalExecCommand;

  beforeEach(() => {
    application = Application.start();
    application.register("pathogen--copyable-value", CopyableValueController);

    originalClipboard = navigator.clipboard;
    originalExecCommand = document.execCommand;
  });

  afterEach(async () => {
    application?.stop();
    document.body.innerHTML = "";

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });

    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: originalExecCommand,
      writable: true,
    });

    vi.useRealTimers();
    await waitForController();
  });

  it("sets idle state on connect", async () => {
    const { container } = appendCopyableValue();

    await waitForController();

    expect(container.dataset.state).toBe("idle");
    expect(container.dataset.controllerConnected).toBe("true");
  });

  it("copies exact text and shows success feedback", async () => {
    const { container, text, announcement } = appendCopyableValue();
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    text.textContent = "  INXT_PRJ_A2G6VVJNCN  ";

    await waitForController();
    vi.useFakeTimers();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--copyable-value");
    await controller.copy();

    expect(writeText).toHaveBeenCalledWith("  INXT_PRJ_A2G6VVJNCN  ");
    expect(container.dataset.state).toBe("success");
    expect(announcement.textContent).toBe("Copied to clipboard");

    vi.advanceTimersByTime(2000);

    expect(container.dataset.state).toBe("idle");
    expect(announcement.textContent).toBe("");
  });

  it("announces failure when clipboard API and fallback copy are unavailable", async () => {
    const { container, announcement } = appendCopyableValue();

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });

    Object.defineProperty(document, "execCommand", {
      configurable: true,
      writable: true,
      value: vi.fn(() => false),
    });

    await waitForController();
    vi.useFakeTimers();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--copyable-value");
    await controller.copy();

    expect(container.dataset.state).toBe("idle");
    expect(announcement.textContent).toBe("Unable to copy to clipboard");

    vi.advanceTimersByTime(2000);

    expect(announcement.textContent).toBe("");
  });

  it("clears pending reset timer on disconnect", async () => {
    const { container, announcement } = appendCopyableValue();
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    await waitForController();
    vi.useFakeTimers();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--copyable-value");
    await controller.copy();

    expect(announcement.textContent).toBe("Copied to clipboard");

    container.remove();
    await Promise.resolve();
    vi.advanceTimersByTime(2000);

    expect(announcement.textContent).toBe("Copied to clipboard");
  });

  it("respects resetDelay value for success feedback", async () => {
    const { container, announcement } = appendCopyableValue();
    container.setAttribute("data-pathogen--copyable-value-reset-delay-value", "500");
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    await waitForController();
    vi.useFakeTimers();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--copyable-value");
    await controller.copy();

    expect(container.dataset.state).toBe("success");

    vi.advanceTimersByTime(499);
    expect(container.dataset.state).toBe("success");

    vi.advanceTimersByTime(1);
    expect(container.dataset.state).toBe("idle");
    expect(announcement.textContent).toBe("");
  });
});
