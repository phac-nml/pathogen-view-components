import { Application } from "@hotwired/stimulus";
import { afterEach, describe, expect, it } from "vitest";

import ToolbarController from "../../../app/assets/javascripts/pathogen_view_components/toolbar_controller";

const flush = async () => Promise.resolve();

const dispatchKey = (target, key) => {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key,
  });

  target.dispatchEvent(event);

  return event;
};

const toolbarMarkup = ({ includeInput = false } = {}) => `
  <div id="toolbar-shell">
    <div
      role="toolbar"
      data-controller="pathogen--toolbar"
      data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
    >
      <button id="item-one" type="button" data-pathogen--toolbar-target="item" tabindex="-1">One</button>
      <button id="item-two" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Two</button>
      <button id="item-three" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Three</button>
      ${
        includeInput
          ? '<input id="item-search" type="search" data-pathogen--toolbar-target="item" tabindex="-1" value="abc" />'
          : ""
      }
    </div>
  </div>
`;

describe("toolbar_controller", () => {
  let application;

  const startController = async (markup) => {
    document.body.innerHTML = markup;

    application?.stop();
    application = Application.start();
    application.register("pathogen--toolbar", ToolbarController);

    await flush();
  };

  afterEach(() => {
    application?.stop();
    document.body.innerHTML = "";
  });

  it("sets the first non-disabled item as the initial tab stop", async () => {
    await startController(`
      <div
        role="toolbar"
        data-controller="pathogen--toolbar"
        data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
      >
        <button id="item-disabled" type="button" data-pathogen--toolbar-target="item" tabindex="-1" aria-disabled="true">
          Disabled
        </button>
        <button id="item-enabled" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Enabled</button>
        <button id="item-third" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Third</button>
      </div>
    `);

    const disabled = document.querySelector("#item-disabled");
    const enabled = document.querySelector("#item-enabled");
    const third = document.querySelector("#item-third");
    const toolbar = document.querySelector('[data-controller="pathogen--toolbar"]');

    expect(toolbar.dataset.controllerConnected).toBe("true");
    expect(disabled.tabIndex).toBe(-1);
    expect(enabled.tabIndex).toBe(0);
    expect(third.tabIndex).toBe(-1);
  });

  it("moves focus with ArrowRight and wraps from last to first", async () => {
    await startController(toolbarMarkup());

    const one = document.querySelector("#item-one");
    const two = document.querySelector("#item-two");
    const three = document.querySelector("#item-three");

    one.focus();
    const moveForward = dispatchKey(one, "ArrowRight");

    expect(moveForward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(two);
    expect(two.tabIndex).toBe(0);

    three.focus();
    const wrapForward = dispatchKey(three, "ArrowRight");

    expect(wrapForward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(one);
    expect(one.tabIndex).toBe(0);
  });

  it("wraps focus from first to last with ArrowLeft", async () => {
    await startController(toolbarMarkup());

    const one = document.querySelector("#item-one");
    const three = document.querySelector("#item-three");

    one.focus();
    const event = dispatchKey(one, "ArrowLeft");

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(three);
    expect(three.tabIndex).toBe(0);
  });

  it("jumps to the first and last items with Home and End", async () => {
    await startController(toolbarMarkup());

    const one = document.querySelector("#item-one");
    const two = document.querySelector("#item-two");
    const three = document.querySelector("#item-three");

    two.focus();
    dispatchKey(two, "Home");
    expect(document.activeElement).toBe(one);
    expect(one.tabIndex).toBe(0);

    one.focus();
    dispatchKey(one, "End");
    expect(document.activeElement).toBe(three);
    expect(three.tabIndex).toBe(0);
  });

  it("intercepts clicks for aria-disabled toolbar items", async () => {
    await startController(`
      <div id="toolbar-shell">
        <div
          role="toolbar"
          data-controller="pathogen--toolbar"
          data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
        >
          <button id="item-disabled" type="button" data-pathogen--toolbar-target="item" aria-disabled="true" tabindex="-1">
            Disabled
          </button>
          <button id="item-enabled" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Enabled</button>
        </div>
      </div>
    `);

    const shell = document.querySelector("#toolbar-shell");
    const disabled = document.querySelector("#item-disabled");
    let bubbledClicks = 0;
    let targetClicks = 0;

    shell.addEventListener("click", () => {
      bubbledClicks += 1;
    });
    disabled.addEventListener("click", () => {
      targetClicks += 1;
    });

    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });

    disabled.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(targetClicks).toBe(0);
    expect(bubbledClicks).toBe(0);
  });

  it("does not intercept arrow keys for text-entry targets", async () => {
    await startController(toolbarMarkup({ includeInput: true }));

    const input = document.querySelector("#item-search");
    input.focus();

    const event = dispatchKey(input, "ArrowRight");

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(input);
  });

  it("does not intercept arrow keys for contenteditable toolbar items", async () => {
    await startController(`
      <div
        role="toolbar"
        data-controller="pathogen--toolbar"
        data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
      >
        <div id="editor" contenteditable data-pathogen--toolbar-target="item" tabindex="-1">Editable</div>
        <button id="item-two" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Two</button>
      </div>
    `);

    const editor = document.querySelector("#editor");
    editor.focus();

    const event = dispatchKey(editor, "ArrowRight");

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(editor);
  });

  it("allows arrow key navigation from non-text input buttons", async () => {
    await startController(`
      <div
        role="toolbar"
        data-controller="pathogen--toolbar"
        data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
      >
        <input id="item-reset" type="reset" data-pathogen--toolbar-target="item" tabindex="-1" value="Reset" />
        <button id="item-two" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Two</button>
      </div>
    `);

    const reset = document.querySelector("#item-reset");
    const second = document.querySelector("#item-two");
    reset.focus();

    const event = dispatchKey(reset, "ArrowRight");

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(second);
  });

  it("updates the tab stop when focus enters a custom targeted control", async () => {
    await startController(`
      <div
        role="toolbar"
        data-controller="pathogen--toolbar"
        data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
      >
        <button id="item-one" type="button" data-pathogen--toolbar-target="item" tabindex="-1">One</button>
        <a id="custom-item" href="#" data-pathogen--toolbar-target="item" tabindex="-1">Custom</a>
      </div>
    `);

    const one = document.querySelector("#item-one");
    const custom = document.querySelector("#custom-item");

    custom.focus();
    custom.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

    expect(one.tabIndex).toBe(-1);
    expect(custom.tabIndex).toBe(0);
  });

  it("fails fast when no toolbar item targets are present", async () => {
    await startController(`
      <div
        role="toolbar"
        data-controller="pathogen--toolbar"
        data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
      >
        <span>No controls</span>
      </div>
    `);

    const toolbar = document.querySelector('[data-controller="pathogen--toolbar"]');

    expect(toolbar.dataset.controllerConnected).toBeUndefined();
    expect(toolbar.textContent).toContain("At least one toolbar item target is required");
  });

  it("keeps navigation scoped to the initial item set until reconnect", async () => {
    await startController(toolbarMarkup());

    const toolbar = document.querySelector('[data-controller="pathogen--toolbar"]');
    const one = document.querySelector("#item-one");
    const two = document.querySelector("#item-two");
    const three = document.querySelector("#item-three");

    const lateItem = document.createElement("button");
    lateItem.type = "button";
    lateItem.id = "late-item";
    lateItem.textContent = "Late";
    lateItem.tabIndex = -1;
    lateItem.setAttribute("data-pathogen--toolbar-target", "item");
    toolbar.append(lateItem);

    two.focus();
    dispatchKey(two, "ArrowRight");

    expect(document.activeElement).toBe(three);

    dispatchKey(three, "ArrowRight");

    expect(document.activeElement).toBe(one);
    expect(lateItem.tabIndex).toBe(-1);
  });
});
