import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DialogController from "../../../app/assets/javascripts/pathogen_view_components/dialog_controller";
import {
  acquireScrollLock,
  releaseScrollLock,
} from "../../../app/assets/javascripts/pathogen_view_components/scroll_lock";

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function markup(id, open = false) {
  return `<div data-controller="pathogen--dialog" data-pathogen--dialog-open-value="${open}">
    <button id="${id}-trigger" data-action="click->pathogen--dialog#openFromTrigger">Open</button>
    <dialog id="${id}" data-pathogen--dialog-target="dialog">
      <div data-pathogen--dialog-target="panel">
        <header data-pathogen--dialog-target="header">
          <h2 id="${id}-title" tabindex="-1" data-pathogen--dialog-target="title">Title</h2>
          <button data-action="click->pathogen--dialog#requestClose">Close</button>
        </header>
        <div data-pathogen--dialog-target="body"><div data-pathogen--dialog-target="content">
          <input id="${id}-field"><button id="${id}-safe">Cancel</button>
        </div></div>
        <footer data-pathogen--dialog-target="footer">Actions</footer>
      </div>
    </dialog>
  </div>`;
}

describe("dialog_controller", () => {
  let application;
  let controller;
  let observers;

  beforeEach(async () => {
    observers = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback) {
          this.callback = callback;
          this.observe = vi.fn();
          this.disconnect = vi.fn();
          observers.push(this);
        }
      },
    );
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{ width: 10, height: 10 }]);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ height: 44 });
    HTMLDialogElement.prototype.showModal = vi.fn(function () {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function () {
      this.open = false;
    });
    document.body.innerHTML = `<button id="fallback">Fallback</button>${markup("first")}${markup("second")}`;
    application = Application.start();
    application.register("pathogen--dialog", DialogController);
    await settle();
    controller = application.getControllerForElementAndIdentifier(
      document.querySelector("[data-controller]"),
      "pathogen--dialog",
    );
  });

  afterEach(async () => {
    document.querySelectorAll("[data-controller]").forEach((element) => element.remove());
    await settle();
    application.stop();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("opens once from a trigger, focuses the title and reports the opener", async () => {
    const opened = vi.fn();
    controller.element.addEventListener("pathogen--dialog:opened", opened);
    document.getElementById("first-trigger").click();
    controller.open();
    await settle();
    expect(controller.dialogTarget.showModal).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(controller.titleTarget);
    expect(opened.mock.calls[0][0].detail.trigger.id).toBe("first-trigger");
    expect(document.body.style.overflow).toBe("hidden");
    expect(controller.openValue).toBe(true);
  });

  it("routes close buttons and native cancellation through a cancelable request", () => {
    const reasons = [];
    const guard = (event) => {
      reasons.push(event.detail.reason);
      event.preventDefault();
    };
    controller.element.addEventListener("pathogen--dialog:before-close", guard);
    controller.open();
    controller.requestClose();
    const cancel = new Event("cancel", { cancelable: true });
    controller.dialogTarget.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(reasons).toEqual(["close-button", "escape"]);
    expect(controller.dialogTarget.open).toBe(true);
    controller.close();
    expect(controller.dialogTarget.open).toBe(false);
  });

  it("closes once, restores the opener and releases the original scroll styles", () => {
    document.body.style.overflow = "clip";
    document.documentElement.style.overflow = "auto";
    const closed = vi.fn();
    controller.element.addEventListener("pathogen--dialog:closed", closed);
    const trigger = document.getElementById("first-trigger");
    controller.open({ trigger });
    controller.requestClose(null, { reason: "cancel" });
    controller.dialogTarget.dispatchEvent(new Event("close"));
    controller.close();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("clip");
    expect(document.documentElement.style.overflow).toBe("auto");
    expect(closed).toHaveBeenCalledOnce();
    expect(closed.mock.calls[0][0].detail.reason).toBe("cancel");
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  });

  it("uses scoped initial focus and falls back safely for invalid or hidden selectors", () => {
    controller.initialFocusValue = "#first-safe";
    controller.open();
    expect(document.activeElement.id).toBe("first-safe");
    controller.close();
    controller.initialFocusValue = "[";
    controller.open();
    expect(document.activeElement).toBe(controller.titleTarget);
    controller.close();
    controller.initialFocusValue = "#first-safe";
    document.getElementById("first-safe").hidden = true;
    controller.open();
    expect(document.activeElement).toBe(controller.titleTarget);
  });

  it("ignores a visible selector target that cannot receive keyboard focus", () => {
    controller.initialFocusValue = '[data-pathogen--dialog-target="content"]';
    controller.open();
    expect(document.activeElement).toBe(controller.titleTarget);
  });

  it("uses the document return-focus fallback after the opener is removed", () => {
    const trigger = document.getElementById("first-trigger");
    controller.returnFocusValue = "#fallback";
    controller.open({ trigger });
    trigger.remove();
    controller.close();
    expect(document.activeElement.id).toBe("fallback");
  });

  it("keeps scrolling locked for a parent and another modal owner", () => {
    const second = application.getControllerForElementAndIdentifier(
      document.querySelectorAll("[data-controller]")[1],
      "pathogen--dialog",
    );
    const sidebarOwner = {};
    acquireScrollLock(sidebarOwner);
    controller.open();
    second.open({ trigger: document.getElementById("first-safe") });
    controller.close({ restoreFocus: false });
    expect(document.body.style.overflow).toBe("hidden");
    second.close();
    expect(document.body.style.overflow).toBe("hidden");
    releaseScrollLock(sidebarOwner);
    expect(document.body.style.overflow).toBe("");
  });

  it("makes the overflowing body keyboard reachable and adapts to short heights", () => {
    Object.defineProperty(controller.bodyTarget, "scrollHeight", { configurable: true, value: 800 });
    Object.defineProperty(controller.bodyTarget, "clientHeight", { configurable: true, value: 300 });
    controller.open();
    expect(controller.panelTarget.dataset.scrollMode).toBe("body");
    expect(controller.bodyTarget.getAttribute("role")).toBe("region");
    expect(controller.bodyTarget.getAttribute("tabindex")).toBe("0");
    const height = window.innerHeight;
    window.innerHeight = 150;
    Object.defineProperty(controller.panelTarget, "scrollHeight", { configurable: true, value: 800 });
    Object.defineProperty(controller.panelTarget, "clientHeight", { configurable: true, value: 120 });
    window.dispatchEvent(new Event("resize"));
    expect(controller.panelTarget.dataset.scrollMode).toBe("panel");
    expect(controller.panelTarget.getAttribute("tabindex")).toBe("0");
    expect(controller.bodyTarget.hasAttribute("role")).toBe(false);
    expect(controller.bodyTarget.hasAttribute("tabindex")).toBe(false);
    window.innerHeight = height;
  });

  it("removes the unnecessary scrolling tab stop when content fits", () => {
    controller.open();
    expect(controller.bodyTarget.hasAttribute("tabindex")).toBe(false);
    expect(controller.bodyTarget.getAttribute("aria-labelledby")).toBe("first-title");
  });

  it("increases the minimum body space when its text is enlarged independently of the root", () => {
    const height = window.innerHeight;
    window.innerHeight = 260;
    controller.bodyTarget.style.fontSize = "32px";
    try {
      controller.open();
      expect(controller.panelTarget.dataset.scrollMode).toBe("panel");

      controller.bodyTarget.style.fontSize = "16px";
      window.dispatchEvent(new Event("resize"));
      expect(controller.panelTarget.dataset.scrollMode).toBe("body");
    } finally {
      window.innerHeight = height;
    }
  });

  it("synchronizes native closure and ignores an old close event after reopening", () => {
    controller.open();
    controller.dialogTarget.open = false;
    controller.dialogTarget.dispatchEvent(new Event("close"));
    expect(controller.openValue).toBe(false);
    controller.open();
    controller.dialogTarget.dispatchEvent(new Event("close"));
    expect(controller.openValue).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("cleans up on Turbo caching and disconnect, and does not reopen on reconnect", async () => {
    controller.open();
    document.dispatchEvent(new Event("turbo:before-cache"));
    expect(controller.dialogTarget.open).toBe(false);
    expect(document.body.style.overflow).toBe("");
    const element = controller.element;
    element.remove();
    await settle();
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
    document.body.append(element);
    await settle();
    const reconnected = application.getControllerForElementAndIdentifier(element, "pathogen--dialog");
    expect(reconnected.dialogTarget.open).toBe(false);
  });

  it("opens a newly mounted server-rendered dialog with open true", async () => {
    document.body.insertAdjacentHTML("beforeend", markup("server", true));
    await settle();
    expect(document.getElementById("server").open).toBe(true);
    expect(document.activeElement.id).toBe("server-title");
  });
});
