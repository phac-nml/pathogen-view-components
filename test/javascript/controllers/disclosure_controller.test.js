import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import DisclosureController from "../../../app/assets/javascripts/pathogen_view_components/disclosure_controller";

const waitForController = () => new Promise((resolve) => setTimeout(resolve, 0));

const appendDisclosure = ({ open = false } = {}) => {
  const container = document.createElement("div");
  container.id = "disc-1";
  container.className = "pathogen-disclosure";
  container.setAttribute("data-controller", "pathogen--disclosure");
  container.setAttribute("data-pathogen--disclosure-open-value", open ? "true" : "false");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "pathogen-disclosure__trigger";
  button.setAttribute("data-pathogen--disclosure-target", "button");
  button.setAttribute("data-action", "click->pathogen--disclosure#toggle");
  button.setAttribute("aria-expanded", open ? "true" : "false");
  button.setAttribute("aria-controls", "disc-1-panel");
  button.textContent = "Details";

  const panel = document.createElement("div");
  panel.id = "disc-1-panel";
  panel.setAttribute("data-pathogen--disclosure-target", "panel");
  panel.textContent = "Hidden content";
  if (!open) {
    panel.setAttribute("hidden", "");
  }

  container.appendChild(button);
  container.appendChild(panel);
  document.body.appendChild(container);

  return { container, button, panel };
};

describe("disclosure_controller", () => {
  let application;

  beforeEach(() => {
    application = Application.start();
    application.register("pathogen--disclosure", DisclosureController);
  });

  afterEach(async () => {
    application?.stop();
    document.body.innerHTML = "";
    await waitForController();
  });

  it("starts closed with aria-expanded false and hidden panel", async () => {
    const { container, button, panel } = appendDisclosure();
    await waitForController();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--disclosure");
    expect(controller).toBeTruthy();
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hasAttribute("hidden")).toBe(true);
    expect(controller.openValue).toBe(false);
  });

  it("opens on click and updates aria-expanded", async () => {
    const { container, button, panel } = appendDisclosure();
    await waitForController();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--disclosure");
    expect(controller.openValue).toBe(false);

    button.click();
    await waitForController();

    expect(controller.openValue).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(panel.hasAttribute("hidden")).toBe(false);
  });

  it("closes on a second click", async () => {
    const { container, button, panel } = appendDisclosure({ open: true });
    await waitForController();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--disclosure");
    expect(controller.openValue).toBe(true);

    button.click();
    await waitForController();

    expect(controller.openValue).toBe(false);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hasAttribute("hidden")).toBe(true);
  });

  it("keeps focus on the button after toggle so screen readers hear the new state", async () => {
    const { container, button } = appendDisclosure();
    await waitForController();

    button.focus();
    button.click();
    await waitForController();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--disclosure");
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(controller.openValue).toBe(true);
  });

  it("open() and close() set the value and aria-expanded directly", async () => {
    const { container, button, panel } = appendDisclosure();
    await waitForController();

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--disclosure");
    controller.open();
    await waitForController();

    expect(controller.openValue).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(panel.hasAttribute("hidden")).toBe(false);

    controller.close();
    await waitForController();

    expect(controller.openValue).toBe(false);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hasAttribute("hidden")).toBe(true);
  });

  it.each([false, true])("does not dispatch a state event when connecting with open=%s", async (open) => {
    const { container } = appendDisclosure({ open });
    const events = [];
    container.addEventListener("pathogen--disclosure:opened", () => events.push("opened"));
    container.addEventListener("pathogen--disclosure:closed", () => events.push("closed"));

    await waitForController();

    expect(events).toEqual([]);
  });

  it("dispatches opened and closed events", async () => {
    const { container } = appendDisclosure();
    await waitForController();

    const opened = [];
    const closed = [];
    container.addEventListener("pathogen--disclosure:opened", () => opened.push(true));
    container.addEventListener("pathogen--disclosure:closed", () => closed.push(true));

    const controller = application.getControllerForElementAndIdentifier(container, "pathogen--disclosure");
    controller.open();
    await waitForController();
    controller.close();
    await waitForController();

    expect(opened).toHaveLength(1);
    expect(closed).toHaveLength(1);
  });
});
