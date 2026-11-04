import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ToastController from "../../../app/assets/javascripts/pathogen_view_components/toast_controller";
import ToasterController from "../../../app/assets/javascripts/pathogen_view_components/toaster_controller";
import {
  buildToast,
  buildToaster,
  mockReducedMotion,
  waitForAnimationFrame,
  waitForController,
} from "./support/toaster_test_setup";

describe("toaster_controller stacking", () => {
  let application;
  const controllerFor = (element) => application.getControllerForElementAndIdentifier(element, "pathogen--toaster");

  beforeEach(() => {
    mockReducedMotion(false);
    application = Application.start();
    application.register("pathogen--toaster", ToasterController);
    application.register("pathogen--toast", ToastController);
  });

  afterEach(async () => {
    document.body.innerHTML = "";
    await waitForController();
    application.stop();
  });

  it("keeps only the newest collapsed card accessible and exposes the concealed count", async () => {
    const { section, list, more, viewport } = buildToaster({ maxVisible: 3, count: 5 });
    await waitForController();

    const toasts = [...list.children];
    expect(toasts.map((toast) => toast.hidden)).toEqual([true, true, false, false, false]);
    expect(toasts.map((toast) => toast.hasAttribute("inert"))).toEqual([true, true, true, true, false]);
    expect(toasts.map((toast) => toast.getAttribute("aria-hidden"))).toEqual(["true", "true", "true", "true", "false"]);
    expect(section.dataset.hasPeek).toBe("true");
    expect(more.textContent).toBe("+4 more");
    expect(viewport.tabIndex).toBe(-1);
  });

  it("expands without geometry reads and preserves document reading order", async () => {
    const { section, list, viewport } = buildToaster({ maxVisible: 2, count: 4 });
    const original = [...list.children];
    const measurements = original.map((toast) => vi.spyOn(toast, "getBoundingClientRect"));
    await waitForController();

    controllerFor(section).expand();

    expect([...list.children]).toEqual(original);
    for (const toast of original) {
      expect(toast.hidden).toBe(false);
      expect(toast.hasAttribute("inert")).toBe(false);
      expect(toast.getAttribute("aria-hidden")).toBe("false");
      expect(toast.dataset.behind).toBe("false");
    }
    expect(measurements.every((measure) => measure.mock.calls.length === 0)).toBe(true);
    expect(viewport.tabIndex).toBe(0);
  });

  it("keeps More focused and visible during keyboard expansion", async () => {
    const { section, list, more } = buildToaster({ maxVisible: 2, count: 4 });
    await waitForController();

    more.focus();
    more.click();

    expect(section.dataset.expanded).toBe("true");
    expect(document.activeElement).toBe(more);
    expect(more.hidden).toBe(false);
    expect(more.getAttribute("aria-expanded")).toBe("true");
    expect(more.textContent).toBe("+3 more");
    expect([...list.children].every((toast) => !toast.hidden && !toast.hasAttribute("inert"))).toBe(true);
  });

  it("does not hide a focused More control when the last toast disappears", async () => {
    const { list, more } = buildToaster({ count: 2 });
    await waitForController();
    more.focus();
    list.replaceChildren();
    await waitForController();
    await waitForAnimationFrame();

    expect(more.hidden).toBe(false);
    expect(document.activeElement).toBe(more);
  });

  it("uses flat accessible cards when a dialog arrives", async () => {
    const { section, list, viewport, more } = buildToaster({ maxVisible: 2, count: 3 });
    await waitForController();
    const [overflow, behind, front] = list.children;
    const dialog = buildToast({ text: "Action required", mode: "dialog", timeout: 0 });
    list.appendChild(dialog);
    await waitForController();
    await waitForAnimationFrame();

    expect(section.dataset.stack).toBe("flat");
    expect(overflow.hidden).toBe(true);
    for (const toast of [behind, front, dialog]) {
      expect(toast.hidden).toBe(false);
      expect(toast.hasAttribute("inert")).toBe(false);
    }
    expect(viewport.tabIndex).toBe(0);
    expect(more.textContent).toBe("+1 more");
  });

  it("never hides persistent dialogs to enforce the status limit", async () => {
    const { section, list } = buildToaster({ count: 0, maxVisible: 1 });
    const dialogs = Array.from({ length: 8 }, (_, i) =>
      buildToast({ text: "Warning " + i, mode: "dialog", timeout: 0 }),
    );
    list.append(...dialogs);
    await waitForController();
    await waitForAnimationFrame();

    expect(section.dataset.stack).toBe("flat");
    expect(dialogs.every((toast) => !toast.hidden && !toast.hasAttribute("inert"))).toBe(true);
  });

  it("makes descendants of peek-behind cards inert", async () => {
    const { list } = buildToaster({ count: 0 });
    const old = buildToast({ text: "Older", withDismiss: true });
    const latest = buildToast({ text: "Latest" });
    list.append(old, latest);
    await waitForController();
    await waitForAnimationFrame();

    expect(old.querySelector("button")).not.toBeNull();
    expect(old.hasAttribute("inert")).toBe(true);
    expect(latest.hasAttribute("inert")).toBe(false);
  });

  it("collapses when focus and pointer leave the stack", async () => {
    const { section, list } = buildToaster({ count: 4, maxVisible: 2 });
    await waitForController();
    controllerFor(section).expand();
    section.dispatchEvent(new MouseEvent("mouseleave"));
    await waitForAnimationFrame();

    expect(section.dataset.expanded).toBe("false");
    expect([...list.children].filter((toast) => toast.hidden)).toHaveLength(2);
  });

  it("uses a flat stack for reduced motion and supports keyboard expansion", async () => {
    mockReducedMotion(true);
    const { section, list, more } = buildToaster({ count: 4, maxVisible: 2 });
    await waitForController();
    expect(section.dataset.stack).toBe("flat");
    expect(more.textContent).toBe("+2 more");

    more.focus();
    expect([...list.children].every((toast) => !toast.hidden && !toast.hasAttribute("inert"))).toBe(true);
  });

  it.each(["bottom_center", "bottom_right"])("uses the bottom deck anchor for %s", async (position) => {
    const { section } = buildToaster({ position, count: 2 });
    await waitForController();
    expect(section.dataset.anchor).toBe("bottom");
  });

  it("promotes the next card when the front card is removed", async () => {
    const { list } = buildToaster({ count: 4, maxVisible: 2 });
    await waitForController();
    list.lastElementChild.remove();
    await waitForController();
    await waitForAnimationFrame();

    expect(list.lastElementChild.hidden).toBe(false);
    expect(list.lastElementChild.hasAttribute("inert")).toBe(false);
    expect(list.children[0].hidden).toBe(true);
  });

  it("removes the empty viewport from the tab order", async () => {
    const { section, list, viewport } = buildToaster({ count: 1 });
    await waitForController();
    controllerFor(section).expand();
    list.replaceChildren();
    await waitForController();
    await waitForAnimationFrame();

    expect(viewport.tabIndex).toBe(-1);
  });
});
