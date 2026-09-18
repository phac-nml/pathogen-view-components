import { Application } from "@hotwired/stimulus";
import { afterEach, describe, expect, it } from "vitest";

import ToolbarController from "../../../app/assets/javascripts/pathogen_view_components/toolbar_controller";
import { toolbarShell } from "../support/toolbar_controller_fixtures";

const flush = async () => Promise.resolve();

const dispatchKey = (target, key) => {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key });
  target.dispatchEvent(event);
  return event;
};

describe("toolbar_controller edge cases", () => {
  let application;

  const start = async (markup) => {
    document.body.innerHTML = markup;
    application?.stop();
    application = Application.start();
    application.register("pathogen--toolbar", ToolbarController);
    await flush();
  };

  const submitEnd = (form, submitter) =>
    form.dispatchEvent(
      new CustomEvent("turbo:submit-end", {
        bubbles: true,
        detail: { formSubmission: { submitter } },
      }),
    );

  afterEach(() => {
    application?.stop();
    document.body.innerHTML = "";
  });

  it("ignores keys that are not toolbar navigation keys", async () => {
    await start(
      toolbarShell(`
        <button id="item-one" type="button" data-pathogen--toolbar-target="item" tabindex="0">One</button>
        <button id="item-two" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Two</button>
      `),
    );

    const one = document.querySelector("#item-one");
    one.focus();
    const event = dispatchKey(one, "a");

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(one);
  });

  it("ignores navigation keys dispatched from outside any toolbar item", async () => {
    await start(
      toolbarShell(`
        <span id="not-an-item">label</span>
        <button id="item-one" type="button" data-pathogen--toolbar-target="item" tabindex="0">One</button>
      `),
    );

    const label = document.querySelector("#not-an-item");
    const event = dispatchKey(label, "ArrowRight");

    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores navigation when the only item is hidden", async () => {
    await start(
      toolbarShell(`
        <button id="item-one" type="button" data-pathogen--toolbar-target="item" tabindex="-1" hidden>One</button>
      `),
    );

    const one = document.querySelector("#item-one");
    const event = dispatchKey(one, "ArrowRight");

    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores navigation from a hidden item while other items remain visible", async () => {
    await start(
      toolbarShell(`
        <button id="item-hidden" type="button" data-pathogen--toolbar-target="item" tabindex="-1" hidden>Hidden</button>
        <button id="item-visible" type="button" data-pathogen--toolbar-target="item" tabindex="0">Visible</button>
      `),
    );

    const hidden = document.querySelector("#item-hidden");
    const visible = document.querySelector("#item-visible");
    const event = dispatchKey(hidden, "ArrowRight");

    expect(event.defaultPrevented).toBe(false);
    expect(visible.tabIndex).toBe(0);
  });

  it("ignores focusin events that originate outside toolbar items", async () => {
    await start(
      toolbarShell(`
        <span id="not-an-item" tabindex="0">label</span>
        <button id="item-one" type="button" data-pathogen--toolbar-target="item" tabindex="0">One</button>
      `),
    );

    const label = document.querySelector("#not-an-item");
    const one = document.querySelector("#item-one");
    label.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

    expect(one.tabIndex).toBe(0);
  });

  it("tracks focus on an item without an id without recording it for restoration", async () => {
    await start(
      toolbarShell(`
        <button type="button" data-pathogen--toolbar-target="item" tabindex="0">One</button>
        <button id="item-two" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Two</button>
      `),
    );

    const [one, two] = document.querySelectorAll('[data-pathogen--toolbar-target="item"]');
    one.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

    expect(one.tabIndex).toBe(0);
    expect(two.tabIndex).toBe(-1);
  });

  it("ignores focusin events from hidden toolbar items", async () => {
    await start(
      toolbarShell(`
        <button id="item-hidden" type="button" data-pathogen--toolbar-target="item" tabindex="-1" hidden>Hidden</button>
        <button id="item-visible" type="button" data-pathogen--toolbar-target="item" tabindex="0">Visible</button>
      `),
    );

    const hidden = document.querySelector("#item-hidden");
    const visible = document.querySelector("#item-visible");
    hidden.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

    expect(visible.tabIndex).toBe(0);
  });

  it("does not intercept clicks on items that are not aria-disabled", async () => {
    await start(
      toolbarShell(`
        <button id="item-one" type="button" data-pathogen--toolbar-target="item" tabindex="0">One</button>
      `),
    );

    const one = document.querySelector("#item-one");
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    one.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("does not intercept clicks that miss any toolbar item", async () => {
    await start(
      toolbarShell(`
        <span id="not-an-item">label</span>
        <button id="item-one" type="button" data-pathogen--toolbar-target="item" tabindex="0">One</button>
      `),
    );

    const label = document.querySelector("#not-an-item");
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    label.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores submit-end events without a valid submitter element", async () => {
    await start(
      toolbarShell(`
        <form id="toolbar-form">
          <button id="item-one" type="submit" data-pathogen--toolbar-target="item" tabindex="0">One</button>
        </form>
      `),
    );

    const form = document.querySelector("#toolbar-form");

    expect(() => submitEnd(form, null)).not.toThrow();
  });

  it("ignores submit-end events for submitters outside the toolbar", async () => {
    await start(`
      <button id="outside" type="button">Outside</button>
      ${toolbarShell(`
        <form id="toolbar-form">
          <button id="item-one" type="submit" data-pathogen--toolbar-target="item" tabindex="0">One</button>
        </form>
      `)}
    `);

    const form = document.querySelector("#toolbar-form");
    const outside = document.querySelector("#outside");

    expect(() => submitEnd(form, outside)).not.toThrow();
  });

  it("ignores submit-end events whose submitter is not a toolbar item", async () => {
    await start(
      toolbarShell(`
        <form id="toolbar-form">
          <button id="not-an-item" type="submit">Plain</button>
          <button id="item-one" type="button" data-pathogen--toolbar-target="item" tabindex="0">One</button>
        </form>
      `),
    );

    const form = document.querySelector("#toolbar-form");
    const plain = document.querySelector("#not-an-item");

    expect(() => submitEnd(form, plain)).not.toThrow();
  });

  it("restores focus to the submitting item once focus has left the toolbar", async () => {
    await start(
      toolbarShell(`
        <form id="toolbar-form">
          <button id="item-one" type="submit" data-pathogen--toolbar-target="item" tabindex="0">One</button>
        </form>
        <button id="item-two" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Two</button>
      `),
    );

    const form = document.querySelector("#toolbar-form");
    const one = document.querySelector("#item-one");

    one.focus();
    one.blur();
    expect(document.activeElement).not.toBe(one);

    submitEnd(form, one);
    await flush();

    expect(document.activeElement).toBe(one);
    expect(one.tabIndex).toBe(0);
  });

  it("does not restore focus to a submitting item that is no longer navigable", async () => {
    await start(
      toolbarShell(`
        <form id="toolbar-form">
          <button id="item-one" type="submit" data-pathogen--toolbar-target="item" tabindex="0">One</button>
        </form>
        <button id="item-two" type="button" data-pathogen--toolbar-target="item" tabindex="-1">Two</button>
      `),
    );

    const form = document.querySelector("#toolbar-form");
    const one = document.querySelector("#item-one");

    one.focus();
    one.blur();
    one.disabled = true;

    submitEnd(form, one);
    await flush();

    expect(document.activeElement).not.toBe(one);
  });

  it("tears down document and element listeners on disconnect", async () => {
    await start(
      toolbarShell(`
        <button id="item-one" type="button" data-pathogen--toolbar-target="item" tabindex="0">One</button>
      `),
    );

    const toolbar = document.querySelector('[data-controller="pathogen--toolbar"]');
    toolbar.remove();
    await flush();

    const one = document.querySelector("#item-one");
    expect(one).toBeNull();
    expect(() => document.dispatchEvent(new CustomEvent("turbo:morph"))).not.toThrow();
  });
});
