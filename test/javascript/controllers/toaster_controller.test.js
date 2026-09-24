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
].join(" ");

const buildToast = ({ text, persistent = false, type = "info", timeout = 6000 }) => {
  const toast = document.createElement("li");
  toast.textContent = text;
  toast.setAttribute("data-pathogen--toaster-target", "toast");
  toast.setAttribute("data-pathogen--toast-persistent-value", String(persistent));
  toast.setAttribute("data-pathogen--toast-type-value", type);
  toast.setAttribute("data-pathogen--toast-timeout-value", String(timeout));
  return toast;
};

const buildConnectedToast = ({ message = "Saved", type = "success", typeLabel = "Success", timeout = 0 } = {}) => {
  const toast = document.createElement("li");
  toast.tabIndex = 0;
  toast.dataset.state = "open";
  toast.setAttribute("data-controller", "pathogen--toast");
  toast.setAttribute("data-pathogen--toaster-target", "toast");
  toast.setAttribute("data-pathogen--toast-timeout-value", String(timeout));
  toast.setAttribute("data-pathogen--toast-type-value", type);
  toast.setAttribute("data-pathogen--toast-type-label-value", typeLabel);
  toast.setAttribute("data-pathogen--toast-dismiss-duration-value", "0");

  const messageText = document.createElement("span");
  messageText.setAttribute("data-pathogen--toast-target", "message");
  messageText.textContent = message;
  toast.appendChild(messageText);

  return toast;
};

const buildToaster = ({ maxVisible = 3, count = 4, position = "top_center" } = {}) => {
  const section = document.createElement("section");
  section.setAttribute("data-controller", "pathogen--toaster");
  section.setAttribute("data-pathogen--toaster-max-visible-value", String(maxVisible));
  section.setAttribute("data-pathogen--toaster-position-value", position);
  section.setAttribute("data-action", TOASTER_ACTIONS);

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
    list.appendChild(toast);
  }

  document.body.appendChild(section);
  return { section, list, polite, assertive };
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
    const { section, list } = buildToaster({ maxVisible: 3, count: 3 });
    await waitForController();

    const toasts = Array.from(list.querySelectorAll("li"));
    expect(section.dataset.stack).toBe("peek");
    expect(section.dataset.expanded).toBe("false");
    expect(section.dataset.anchor).toBe("top");
    expect(toasts[2].dataset.behind).toBe("false");
    expect(toasts[2].tabIndex).toBe(0);
    expect(toasts[1].dataset.behind).toBe("true");
    expect(toasts[1].tabIndex).toBe(-1);
    expect(toasts[1].getAttribute("aria-hidden")).toBe("true");
    expect(toasts[0].dataset.behind).toBe("true");
    expect(list.style.getPropertyValue("--peek-count")).toBe("2");
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
      expect(toast.tabIndex).toBe(0);
    });
    expect(section.dataset.expanded).toBe("true");
    expect(list.style.getPropertyValue("--stack-height")).not.toBe("");
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

  it("routes child toast announcements into the polite live region", async () => {
    const { list, polite } = buildToaster({ maxVisible: 3, count: 0 });
    list.appendChild(buildConnectedToast({ message: "Saved", type: "success", typeLabel: "Success" }));
    await waitForController();
    await flushAnnouncements();
    expect(polite.textContent).toBe("Success: Saved");
  });

  it("routes child error toast announcements into the assertive live region", async () => {
    const { list, assertive } = buildToaster({ maxVisible: 3, count: 0 });
    list.appendChild(buildConnectedToast({ message: "Upload failed", type: "error", typeLabel: "Error" }));
    await waitForController();
    await flushAnnouncements();
    expect(assertive.textContent).toBe("Error: Upload failed");
  });
});
