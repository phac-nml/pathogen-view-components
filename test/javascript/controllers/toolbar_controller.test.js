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

  it("does not intercept arrow keys for text-entry targets away from boundaries", async () => {
    await startController(toolbarMarkup({ includeInput: true }));

    const input = document.querySelector("#item-search");
    input.focus();
    input.setSelectionRange(1, 1);

    const event = dispatchKey(input, "ArrowRight");

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(input);
  });

  it("moves focus out of text-entry targets with ArrowRight at the end", async () => {
    await startController(toolbarMarkup({ includeInput: true }));

    const one = document.querySelector("#item-one");
    const input = document.querySelector("#item-search");

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    const event = dispatchKey(input, "ArrowRight");

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(one);
  });

  it("moves focus to the next visible toolbar button from a text-entry target boundary", async () => {
    await startController(`
      <div
        role="toolbar"
        data-controller="pathogen--toolbar"
        data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
      >
        <input id="item-search" type="search" data-pathogen--toolbar-target="item" tabindex="-1" value="abc" />
        <button id="item-search-submit" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Search</button>
        <button id="item-two" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Two</button>
      </div>
    `);

    const input = document.querySelector("#item-search");
    const searchButton = document.querySelector("#item-search-submit");

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    dispatchKey(input, "ArrowRight");

    expect(document.activeElement).toBe(searchButton);
  });

  it("skips hidden toolbar items during arrow navigation", async () => {
    await startController(`
      <div
        role="toolbar"
        data-controller="pathogen--toolbar"
        data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
      >
        <button id="item-one" type="button" data-pathogen--toolbar-target="item" tabindex="-1">One</button>
        <button id="item-hidden" type="button" data-pathogen--toolbar-target="item" hidden tabindex="-1">Hidden</button>
        <button id="item-two" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Two</button>
      </div>
    `);

    const one = document.querySelector("#item-one");
    const two = document.querySelector("#item-two");

    one.focus();
    dispatchKey(one, "ArrowRight");

    expect(document.activeElement).toBe(two);
  });

  it("moves focus out of text-entry targets with ArrowLeft at the start", async () => {
    await startController(toolbarMarkup({ includeInput: true }));

    const three = document.querySelector("#item-three");
    const input = document.querySelector("#item-search");

    input.focus();
    input.setSelectionRange(0, 0);

    const event = dispatchKey(input, "ArrowLeft");

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(three);
  });

  it("moves focus out of text-entry targets with ArrowLeft when all text is selected", async () => {
    await startController(toolbarMarkup({ includeInput: true }));

    const three = document.querySelector("#item-three");
    const input = document.querySelector("#item-search");

    input.focus();
    input.setSelectionRange(0, input.value.length);

    const event = dispatchKey(input, "ArrowLeft");

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(three);
  });

  it("places the caret on the arrival edge when arrowing into a text-entry item", async () => {
    await startController(`
      <div
        role="toolbar"
        data-controller="pathogen--toolbar"
        data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
      >
        <button id="item-actions" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Actions</button>
        <input id="item-search" type="search" data-pathogen--toolbar-target="item" tabindex="-1" value="100" />
        <button id="item-advanced" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Advanced</button>
      </div>
    `);

    const actions = document.querySelector("#item-actions");
    const advanced = document.querySelector("#item-advanced");
    const input = document.querySelector("#item-search");

    actions.focus();
    dispatchKey(actions, "ArrowRight");

    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(input.value.length);
    expect(input.selectionEnd).toBe(input.value.length);

    dispatchKey(input, "ArrowRight");

    expect(document.activeElement).toBe(advanced);

    dispatchKey(advanced, "ArrowLeft");

    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(0);

    dispatchKey(input, "ArrowLeft");

    expect(document.activeElement).toBe(actions);
  });

  it("moves focus to the previous toolbar item when search text is fully selected", async () => {
    await startController(`
      <div
        role="toolbar"
        data-controller="pathogen--toolbar"
        data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
      >
        <button id="item-actions" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Actions</button>
        <input id="item-search" type="search" data-pathogen--toolbar-target="item" tabindex="-1" value="100" />
        <button id="item-advanced" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Advanced</button>
      </div>
    `);

    const actions = document.querySelector("#item-actions");
    const input = document.querySelector("#item-search");

    input.focus();
    input.setSelectionRange(0, input.value.length);

    dispatchKey(input, "ArrowLeft");

    expect(document.activeElement).toBe(actions);
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

  it("does not attempt input caret placement when arrowing into contenteditable toolbar items", async () => {
    await startController(`
    <div
      role="toolbar"
      data-controller="pathogen--toolbar"
      data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
    >
      <button id="item-one" type="button" data-pathogen--toolbar-target="item" tabindex="-1">One</button>
      <div id="editor" contenteditable data-pathogen--toolbar-target="item" tabindex="-1">Editable</div>
    </div>
  `);

    const one = document.querySelector("#item-one");
    const editor = document.querySelector("#editor");

    one.focus();
    const event = dispatchKey(one, "ArrowRight");

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(editor);
    expect(editor.tabIndex).toBe(0);
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

  it("includes newly connected toolbar items after the DOM changes", async () => {
    await startController(toolbarMarkup());

    const toolbar = document.querySelector('[data-controller="pathogen--toolbar"]');
    const two = document.querySelector("#item-two");
    const three = document.querySelector("#item-three");

    const lateItem = document.createElement("button");
    lateItem.type = "button";
    lateItem.id = "late-item";
    lateItem.textContent = "Late";
    lateItem.tabIndex = -1;
    lateItem.setAttribute("data-pathogen--toolbar-target", "item");
    toolbar.append(lateItem);

    await flush();

    two.focus();
    dispatchKey(two, "ArrowRight");

    expect(document.activeElement).toBe(three);

    dispatchKey(three, "ArrowRight");

    expect(document.activeElement).toBe(lateItem);
    expect(lateItem.tabIndex).toBe(0);
  });

  it("ignores disconnected toolbar items after turbo replaces descendants", async () => {
    await startController(toolbarMarkup({ includeInput: true }));

    const toolbar = document.querySelector('[data-controller="pathogen--toolbar"]');
    const input = document.querySelector("#item-search");
    const one = document.querySelector("#item-one");

    input.focus();
    input.setAttribute("data-turbo-permanent", "");

    toolbar.innerHTML = `
      <button id="new-one" type="button" data-pathogen--toolbar-target="item" tabindex="-1">One</button>
      <input id="new-search" type="search" data-pathogen--toolbar-target="item" tabindex="-1" value="100" />
    `;

    await flush();

    const newSearch = document.querySelector("#new-search");
    newSearch.focus();
    newSearch.setSelectionRange(0, 0);

    const event = dispatchKey(newSearch, "ArrowLeft");

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(document.querySelector("#new-one"));
    expect(document.activeElement).not.toBe(one);
  });

  it("refreshes tracked items when toolbar descendants are replaced", async () => {
    await startController(toolbarMarkup());

    const toolbar = document.querySelector('[data-controller="pathogen--toolbar"]');

    toolbar.innerHTML = `
      <button id="new-one" type="button" data-pathogen--toolbar-target="item" tabindex="-1">One</button>
      <button id="new-two" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Two</button>
      <button id="new-three" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Three</button>
    `;

    const two = document.querySelector("#new-two");
    const three = document.querySelector("#new-three");

    two.focus();
    const event = dispatchKey(two, "ArrowRight");

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(three);
    expect(three.tabIndex).toBe(0);
  });

  it("does not capture arrow keys while focus is in an open menu popup", async () => {
    await startController(`
      <div
        role="toolbar"
        data-controller="pathogen--toolbar"
        data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
      >
        <button
          id="menu-trigger"
          type="button"
          data-pathogen--toolbar-target="item"
          tabindex="-1"
          aria-haspopup="true"
          aria-expanded="true"
          aria-controls="sample-menu"
        >
          Actions
        </button>
        <ul id="sample-menu" role="menu" aria-labelledby="menu-trigger">
          <li role="none">
            <a id="menu-first" href="#" role="menuitem" tabindex="0">First</a>
          </li>
          <li role="none">
            <a id="menu-second" href="#" role="menuitem" tabindex="-1">Second</a>
          </li>
        </ul>
      </div>
    `);

    const first = document.querySelector("#menu-first");
    first.focus();

    const event = dispatchKey(first, "ArrowDown");

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(first);
  });

  it("defers ArrowDown on menu button triggers to the consumer", async () => {
    await startController(`
      <div
        role="toolbar"
        data-controller="pathogen--toolbar"
        data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
      >
        <button id="item-one" type="button" data-pathogen--toolbar-target="item" tabindex="-1">One</button>
        <button
          id="menu-trigger"
          type="button"
          data-pathogen--toolbar-target="item"
          tabindex="-1"
          aria-haspopup="true"
          aria-expanded="false"
          aria-controls="sample-menu"
        >
          Actions
        </button>
        <button id="item-two" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Two</button>
        <ul id="sample-menu" role="menu" aria-labelledby="menu-trigger" hidden></ul>
      </div>
    `);

    const trigger = document.querySelector("#menu-trigger");
    trigger.focus();

    const event = dispatchKey(trigger, "ArrowDown");

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("restores focus to the submitter after a turbo form submission within the toolbar", async () => {
    await startController(`
      <div
        role="toolbar"
        data-controller="pathogen--toolbar"
        data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
      >
        <form id="select-all-form" data-turbo-frame="selected">
          <button
            id="select-all-button"
            type="submit"
            data-pathogen--toolbar-target="item"
            tabindex="0"
          >
            Select all
          </button>
        </form>
        <button id="item-two" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Two</button>
      </div>
    `);

    const form = document.querySelector("#select-all-form");
    const selectAll = document.querySelector("#select-all-button");
    const two = document.querySelector("#item-two");

    selectAll.focus();
    document.body.focus();

    form.dispatchEvent(
      new CustomEvent("turbo:submit-end", {
        bubbles: true,
        detail: {
          formSubmission: {
            submitter: selectAll,
          },
        },
      }),
    );

    await flush();

    expect(document.activeElement).toBe(selectAll);
    expect(two.tabIndex).toBe(-1);
    expect(selectAll.tabIndex).toBe(0);
  });

  it("yields arrow keys to an open menu when aria-expanded is missing on the trigger", async () => {
    await startController(`
      <div
        role="toolbar"
        data-controller="pathogen--toolbar"
        data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
      >
        <button id="item-one" type="button" data-pathogen--toolbar-target="item" tabindex="-1">One</button>
        <button
          id="menu-trigger"
          type="button"
          data-pathogen--toolbar-target="item"
          tabindex="0"
          aria-haspopup="true"
          aria-controls="sample-menu"
        >
          Actions
        </button>
        <button id="item-two" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Two</button>
        <ul id="sample-menu" role="menu" aria-labelledby="menu-trigger">
          <li role="none">
            <a id="menu-first" href="#" role="menuitem" tabindex="0">First</a>
          </li>
        </ul>
      </div>
    `);

    const trigger = document.querySelector("#menu-trigger");
    trigger.focus();

    const event = dispatchKey(trigger, "ArrowDown");

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("does not reset roving tabindex while focus is in an open menu popup", async () => {
    await startController(`
      <div
        role="toolbar"
        data-controller="pathogen--toolbar"
        data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
      >
        <button
          id="menu-trigger"
          type="button"
          data-pathogen--toolbar-target="item"
          tabindex="-1"
          aria-haspopup="true"
          aria-expanded="true"
          aria-controls="sample-menu"
        >
          Actions
        </button>
        <ul id="sample-menu" role="menu" aria-labelledby="menu-trigger">
          <li role="none">
            <a id="menu-first" href="#" role="menuitem" tabindex="0">First</a>
          </li>
        </ul>
      </div>
    `);

    const first = document.querySelector("#menu-first");

    first.focus();
    document
      .querySelector('[data-controller="pathogen--toolbar"]')
      .dispatchEvent(new CustomEvent("pathogen--toolbar:sync", { bubbles: true }));

    await flush();

    expect(document.activeElement).toBe(first);
    expect(first.tabIndex).toBe(0);
  });

  it("keeps toolbar navigation when aria-controls points to non-menu content", async () => {
    await startController(`
    <div
      role="toolbar"
      data-controller="pathogen--toolbar"
      data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
    >
      <button
        id="details-trigger"
        type="button"
        data-pathogen--toolbar-target="item"
        tabindex="-1"
        aria-expanded="true"
        aria-controls="details-panel"
      >
        Details
      </button>
      <button id="item-two" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Two</button>
      <section id="details-panel">Expanded details</section>
    </div>
  `);

    const trigger = document.querySelector("#details-trigger");
    const two = document.querySelector("#item-two");

    trigger.focus();
    const event = dispatchKey(trigger, "ArrowRight");

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(two);
  });

  it("keeps toolbar navigation when the controlled menu is hidden by CSS", async () => {
    await startController(`
    <style>
      .hidden-menu {
        display: none;
      }
    </style>
    <div
      role="toolbar"
      data-controller="pathogen--toolbar"
      data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
    >
      <button
        id="menu-trigger"
        type="button"
        data-pathogen--toolbar-target="item"
        tabindex="-1"
        aria-haspopup="true"
        aria-controls="sample-menu"
      >
        Actions
      </button>
      <button id="item-two" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Two</button>
      <ul id="sample-menu" class="hidden-menu" role="menu" aria-labelledby="menu-trigger">
        <li role="none">
          <a href="#" role="menuitem" tabindex="-1">First</a>
        </li>
      </ul>
    </div>
  `);

    const trigger = document.querySelector("#menu-trigger");
    const two = document.querySelector("#item-two");

    trigger.focus();
    const event = dispatchKey(trigger, "ArrowRight");

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(two);
  });

  it("still moves horizontally across menu button triggers with ArrowRight", async () => {
    await startController(`
      <div
        role="toolbar"
        data-controller="pathogen--toolbar"
        data-action="keydown->pathogen--toolbar#handleKeyDown focusin->pathogen--toolbar#handleFocusIn click->pathogen--toolbar#handleClick:capture"
      >
        <button id="item-one" type="button" data-pathogen--toolbar-target="item" tabindex="-1">One</button>
        <button
          id="menu-trigger"
          type="button"
          data-pathogen--toolbar-target="item"
          tabindex="-1"
          aria-haspopup="true"
          aria-expanded="false"
          aria-controls="sample-menu"
        >
          Actions
        </button>
        <button id="item-two" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Two</button>
        <ul id="sample-menu" role="menu" aria-labelledby="menu-trigger" hidden></ul>
      </div>
    `);

    const one = document.querySelector("#item-one");
    const trigger = document.querySelector("#menu-trigger");

    one.focus();
    dispatchKey(one, "ArrowRight");

    expect(document.activeElement).toBe(trigger);
  });
});
