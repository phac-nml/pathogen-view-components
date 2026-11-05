import { afterEach, describe, expect, it } from "vitest";
import { registerModal, unregisterModal } from "../../app/assets/javascripts/pathogen_view_components/modal_stack";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("native modal stacking", () => {
  it("isolates every older modal and restores its exact original inert value", () => {
    document.body.innerHTML =
      '<dialog open id="first" inert="true"></dialog><dialog open id="second"></dialog><dialog open id="third"></dialog>';
    const first = document.getElementById("first");
    const second = document.getElementById("second");
    const third = document.getElementById("third");
    registerModal(first);
    registerModal(second);
    registerModal(third);
    expect(first.hasAttribute("inert")).toBe(true);
    expect(second.hasAttribute("inert")).toBe(true);
    second.open = false;
    unregisterModal(second);
    expect(first.hasAttribute("inert")).toBe(true);
    expect(second.hasAttribute("inert")).toBe(false);
    third.open = false;
    unregisterModal(third);
    expect(first.getAttribute("inert")).toBe("true");
    first.open = false;
    unregisterModal(first);
  });

  it("can reopen an older modal above the current one without retaining inertness", () => {
    document.body.innerHTML = '<dialog open id="first"></dialog><dialog open id="second"></dialog>';
    const first = document.getElementById("first");
    const second = document.getElementById("second");
    registerModal(first);
    registerModal(second);
    expect(first.hasAttribute("inert")).toBe(true);
    registerModal(first);
    expect(first.hasAttribute("inert")).toBe(false);
    expect(second.hasAttribute("inert")).toBe(true);
    first.remove();
    unregisterModal(first);
    expect(second.hasAttribute("inert")).toBe(false);
    second.open = false;
    unregisterModal(second);
  });
});
