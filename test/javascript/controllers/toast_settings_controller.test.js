import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ToastSettingsController from "../../../app/assets/javascripts/pathogen_view_components/toast_settings_controller";

const STORAGE_KEY = "pathogen.toast.durationMs";

const waitForController = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const buildSettings = ({ storageKey = STORAGE_KEY, selected = "" } = {}) => {
  const root = document.createElement("div");
  root.setAttribute("data-controller", "pathogen--toast-settings");
  root.setAttribute("data-pathogen--toast-settings-storage-key-value", storageKey);

  const select = document.createElement("select");
  select.setAttribute("data-pathogen--toast-settings-target", "select");
  select.setAttribute("data-action", "change->pathogen--toast-settings#save");

  [
    ["", "Default"],
    ["20000", "20 seconds"],
    ["forever", "Keep until I dismiss them"],
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    if (value === selected) option.selected = true;
    select.appendChild(option);
  });

  root.appendChild(select);
  document.body.appendChild(root);
  return { root, select };
};

describe("toast_settings_controller", () => {
  let application;

  beforeEach(() => {
    application = Application.start();
    application.register("pathogen--toast-settings", ToastSettingsController);
  });

  afterEach(() => {
    application?.stop();
    document.body.innerHTML = "";
    window.localStorage?.removeItem(STORAGE_KEY);
    window.localStorage?.removeItem("app.toastDuration");
  });

  it("reflects a stored preference into the select on connect", async () => {
    window.localStorage.setItem(STORAGE_KEY, "forever");
    const { select } = buildSettings({ selected: "" });
    await waitForController();

    expect(select.value).toBe("forever");
  });

  it("keeps the server-rendered selection when no preference is stored", async () => {
    const { select } = buildSettings({ selected: "20000" });
    await waitForController();

    expect(select.value).toBe("20000");
  });

  it("writes the chosen value to storage on change", async () => {
    const { select } = buildSettings();
    await waitForController();

    select.value = "20000";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("20000");
  });

  it("clears the preference when the default (empty) option is chosen", async () => {
    window.localStorage.setItem(STORAGE_KEY, "forever");
    const { select } = buildSettings({ selected: "forever" });
    await waitForController();

    select.value = "";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("honours a custom storage key", async () => {
    const { select } = buildSettings({ storageKey: "app.toastDuration" });
    await waitForController();

    select.value = "forever";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    expect(window.localStorage.getItem("app.toastDuration")).toBe("forever");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("dispatches a change event with the selected value", async () => {
    const { select } = buildSettings();
    await waitForController();

    const listener = vi.fn();
    document.body.addEventListener("pathogen:toast-settings:change", listener);

    select.value = "forever";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.value).toBe("forever");
  });
});
