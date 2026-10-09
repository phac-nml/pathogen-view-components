import { vi } from "vitest";

import { ANNOUNCE_DEBOUNCE_MS } from "../../../../app/assets/javascripts/pathogen_view_components/toaster_controller";

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

export {
  waitForController,
  waitForAnimationFrame,
  flushAnnouncements,
  buildToast,
  buildConnectedToast,
  buildToaster,
  mockReducedMotion,
};
