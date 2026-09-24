import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import ToasterController from "../../../app/assets/javascripts/pathogen_view_components/toaster_controller";

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
  await waitForAnimationFrame();
};

const buildToaster = ({ maxVisible = 3, count = 4 } = {}) => {
  const section = document.createElement("section");
  section.setAttribute("data-controller", "pathogen--toaster");
  section.setAttribute("data-pathogen--toaster-max-visible-value", String(maxVisible));
  section.setAttribute(
    "data-action",
    [
      "mouseenter->pathogen--toaster#expand",
      "mouseleave->pathogen--toaster#collapseIfIdle",
      "focusin->pathogen--toaster#expand",
      "focusout->pathogen--toaster#collapseIfIdle",
      "pathogen:toast:dismissed->pathogen--toaster#handleToastDismissed",
      "pathogen:toast:announce->pathogen--toaster#announce",
    ].join(" "),
  );

  const list = document.createElement("ol");
  list.id = "flashes";
  list.setAttribute("data-pathogen--toaster-target", "list");
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

describe("toaster_controller", () => {
  let application;

  beforeEach(() => {
    application = Application.start();
    application.register("pathogen--toaster", ToasterController);
  });

  afterEach(() => {
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

  it("expands stack visibility", async () => {
    const { section, list } = buildToaster({ maxVisible: 2, count: 4 });
    await waitForController();
    const controller = application.getControllerForElementAndIdentifier(section, "pathogen--toaster");

    controller.expand();
    Array.from(list.querySelectorAll("li")).forEach((toast) => {
      expect(toast.hidden).toBe(false);
      expect(toast.getAttribute("aria-hidden")).toBe("false");
    });
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
});
