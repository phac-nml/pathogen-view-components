import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateDialogLayout } from "../../../app/assets/javascripts/pathogen_view_components/dialog_controller/layout";

function bounds(element, top, height) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: top,
    top,
    bottom: top + height,
    left: 0,
    right: 300,
    width: 300,
    height,
  });
}

function overflow(element, scrollHeight, clientHeight) {
  Object.defineProperties(element, {
    scrollHeight: { configurable: true, value: scrollHeight },
    clientHeight: { configurable: true, value: clientHeight },
  });
}

describe("dialog layout", () => {
  let controller;
  let rootStyle;

  beforeEach(() => {
    rootStyle = document.documentElement.getAttribute("style");
    document.documentElement.style.fontSize = "16px";
    vi.stubGlobal("innerHeight", 800);
    vi.stubGlobal("visualViewport", undefined);
    document.body.innerHTML = `<button id="outside">Outside</button>
      <dialog open id="dialog">
        <div id="panel">
          <header id="header"><h2 id="title" tabindex="-1">Dialog title</h2></header>
          <div id="body"><button id="action">Body action</button></div>
          <footer id="footer"><button>Save</button></footer>
        </div>
      </dialog>`;
    controller = Object.fromEntries(
      ["dialog", "panel", "header", "title", "body", "footer"].map((name) => [
        `${name}Target`,
        document.getElementById(name),
      ]),
    );
    controller.hasFooterTarget = true;
    controller.bodyTarget.style.fontSize = "16px";
    bounds(controller.dialogTarget, 150, 500);
    bounds(controller.panelTarget, 150, 500);
    bounds(controller.headerTarget, 150, 44);
    bounds(controller.footerTarget, 606, 44);
    bounds(controller.bodyTarget, 194, 412);
    bounds(controller.titleTarget, 166, 28);
    bounds(document.getElementById("action"), 210, 44);
    overflow(controller.bodyTarget, 800, 412);
    overflow(controller.panelTarget, 900, 500);
  });

  afterEach(() => {
    if (rootStyle === null) document.documentElement.removeAttribute("style");
    else document.documentElement.setAttribute("style", rootStyle);
    vi.unstubAllGlobals();
  });

  function panelViewport() {
    vi.stubGlobal("innerHeight", 160);
    bounds(controller.dialogTarget, 16, 128);
    bounds(controller.panelTarget, 17, 126);
    bounds(controller.bodyTarget, 61, 800);
    overflow(controller.panelTarget, 900, 126);
  }

  it("leaves a closed dialog's last layout unchanged", () => {
    updateDialogLayout(controller);
    const style = controller.dialogTarget.getAttribute("style");
    controller.dialogTarget.open = false;
    panelViewport();

    updateDialogLayout(controller);

    expect(controller.dialogTarget.getAttribute("style")).toBe(style);
    expect(controller.panelTarget.dataset.scrollMode).toBe("body");
    expect(controller.bodyTarget).toHaveAttribute("tabindex", "0");
  });

  it("names only the active scrolling region and removes stale panel attributes", () => {
    controller.panelTarget.setAttribute("role", "region");
    controller.panelTarget.setAttribute("aria-labelledby", "title");
    controller.panelTarget.setAttribute("tabindex", "0");

    updateDialogLayout(controller);

    expect(controller.bodyTarget).toHaveAttribute("role", "region");
    expect(controller.bodyTarget).toHaveAttribute("aria-labelledby", "title");
    expect(controller.bodyTarget).toHaveAttribute("tabindex", "0");
    expect(controller.panelTarget).not.toHaveAttribute("role");
    expect(controller.panelTarget).not.toHaveAttribute("aria-labelledby");
    expect(controller.panelTarget).not.toHaveAttribute("tabindex");
  });

  it.each([
    [200, false],
    [201, false],
    [202, true],
  ])("adds a tab stop only beyond the one-pixel overflow tolerance (%ipx)", (scrollHeight, tabbable) => {
    overflow(controller.bodyTarget, scrollHeight, 200);

    updateDialogLayout(controller);

    expect(controller.bodyTarget.hasAttribute("tabindex")).toBe(tabbable);
    expect(controller.bodyTarget).toHaveAttribute("role", "region");
    expect(controller.bodyTarget).toHaveAttribute("aria-labelledby", "title");
  });

  it("centres the panel using the window height when no visual viewport is available", () => {
    updateDialogLayout(controller);

    expect(controller.dialogTarget.style.getPropertyValue("--pvc-dialog-available-height")).toBe("768px");
    expect(controller.dialogTarget.style.getPropertyValue("--pvc-dialog-top")).toBe("150px");
  });

  it("uses the visual viewport's height and offset while preserving its bottom safe area", () => {
    vi.stubGlobal("visualViewport", { height: 500, offsetTop: 120 });
    controller.dialogTarget.style.setProperty("--pvc-dialog-safe-top", "20px");
    controller.dialogTarget.style.setProperty("--pvc-dialog-safe-bottom", "80px");
    bounds(controller.dialogTarget, 0, 400);

    updateDialogLayout(controller);

    expect(controller.dialogTarget.style.getPropertyValue("--pvc-dialog-available-height")).toBe("400px");
    expect(controller.dialogTarget.style.getPropertyValue("--pvc-dialog-top")).toBe("140px");
  });

  it("keeps a panel below a larger top safe area", () => {
    vi.stubGlobal("innerHeight", 500);
    controller.dialogTarget.style.setProperty("--pvc-dialog-safe-top", "80px");
    bounds(controller.dialogTarget, 0, 360);

    updateDialogLayout(controller);

    expect(controller.dialogTarget.style.getPropertyValue("--pvc-dialog-available-height")).toBe("404px");
    expect(controller.dialogTarget.style.getPropertyValue("--pvc-dialog-top")).toBe("80px");
  });

  it("falls back to window geometry when visual viewport fields are unavailable", () => {
    vi.stubGlobal("visualViewport", {});
    controller.dialogTarget.style.setProperty("--pvc-dialog-safe-top", "4px");
    controller.dialogTarget.style.setProperty("--pvc-dialog-safe-bottom", "0px");

    updateDialogLayout(controller);

    expect(controller.dialogTarget.style.getPropertyValue("--pvc-dialog-available-height")).toBe("768px");
    expect(controller.dialogTarget.style.getPropertyValue("--pvc-dialog-top")).toBe("150px");
  });

  it("keeps a minimum usable height when the viewport is smaller than its safe areas", () => {
    vi.stubGlobal("visualViewport", { height: 60, offsetTop: 5 });
    controller.dialogTarget.style.setProperty("--pvc-dialog-safe-top", "24px");
    controller.dialogTarget.style.setProperty("--pvc-dialog-safe-bottom", "32px");
    bounds(controller.dialogTarget, 0, 44);

    updateDialogLayout(controller);

    expect(controller.dialogTarget.style.getPropertyValue("--pvc-dialog-available-height")).toBe("44px");
    expect(controller.dialogTarget.style.getPropertyValue("--pvc-dialog-top")).toBe("29px");
    expect(controller.panelTarget.dataset.scrollMode).toBe("panel");
  });

  it("reserves no footer space when the optional footer is absent", () => {
    vi.stubGlobal("innerHeight", 200);
    controller.hasFooterTarget = false;
    controller.footerTarget.remove();
    delete controller.footerTarget;

    updateDialogLayout(controller);

    expect(controller.panelTarget.dataset.scrollMode).toBe("body");
    expect(controller.bodyTarget).toHaveAttribute("role", "region");
  });

  it("keeps 16px viewport margins when host styles resolve the root font to zero", () => {
    document.documentElement.style.fontSize = "0px";
    controller.bodyTarget.style.fontSize = "0px";

    updateDialogLayout(controller);

    expect(controller.dialogTarget.style.getPropertyValue("--pvc-dialog-available-height")).toBe("768px");
    expect(controller.dialogTarget.style.getPropertyValue("--pvc-dialog-top")).toBe("150px");
  });

  it("keeps the root text budget when the computed body font is unavailable or smaller", () => {
    vi.stubGlobal("innerHeight", 280);
    document.documentElement.style.fontSize = "24px";
    const readStyle = getComputedStyle;
    vi.stubGlobal("getComputedStyle", (element) =>
      element === controller.bodyTarget ? { fontSize: "" } : readStyle(element),
    );

    updateDialogLayout(controller);
    expect(controller.panelTarget.dataset.scrollMode).toBe("panel");

    vi.stubGlobal("getComputedStyle", readStyle);
    controller.bodyTarget.style.fontSize = "12px";
    updateDialogLayout(controller);
    expect(controller.panelTarget.dataset.scrollMode).toBe("panel");
  });

  it("switches to panel scrolling when independently enlarged body text needs more space", () => {
    vi.stubGlobal("innerHeight", 250);
    updateDialogLayout(controller);
    expect(controller.panelTarget.dataset.scrollMode).toBe("body");

    controller.bodyTarget.style.fontSize = "24px";
    updateDialogLayout(controller);

    expect(controller.panelTarget.dataset.scrollMode).toBe("panel");
    expect(controller.panelTarget).toHaveAttribute("aria-labelledby", "title");
  });

  it("transfers focus from the body to the overflowing panel as the viewport shrinks", () => {
    updateDialogLayout(controller);
    controller.bodyTarget.scrollTop = 70;
    controller.panelTarget.scrollTop = 40;
    controller.bodyTarget.focus();
    panelViewport();

    updateDialogLayout(controller);

    expect(document.activeElement).toBe(controller.panelTarget);
    expect(controller.panelTarget).toHaveAttribute("tabindex", "0");
    expect(controller.bodyTarget).not.toHaveAttribute("tabindex");
    expect(controller.bodyTarget).not.toHaveAttribute("role");
    expect(controller.bodyTarget.scrollTop).toBe(70);
    expect(controller.panelTarget.scrollTop).toBe(40);
  });

  it("transfers focus from the panel to the overflowing body as the viewport grows", () => {
    panelViewport();
    updateDialogLayout(controller);
    controller.panelTarget.focus();
    vi.stubGlobal("innerHeight", 800);

    updateDialogLayout(controller);

    expect(document.activeElement).toBe(controller.bodyTarget);
    expect(controller.bodyTarget).toHaveAttribute("tabindex", "0");
    expect(controller.panelTarget).not.toHaveAttribute("tabindex");
    expect(controller.panelTarget).not.toHaveAttribute("aria-labelledby");
  });

  it("returns focus to the title when the replacement scrolling region does not overflow", () => {
    updateDialogLayout(controller);
    controller.bodyTarget.focus();
    panelViewport();
    overflow(controller.panelTarget, 126, 126);

    updateDialogLayout(controller);

    expect(document.activeElement).toBe(controller.titleTarget);
    expect(controller.panelTarget).toHaveAttribute("role", "region");
    expect(controller.panelTarget).not.toHaveAttribute("tabindex");
  });

  it.each(["body", "panel"])("returns focus to the title when the focused %s stops overflowing", (mode) => {
    if (mode === "panel") panelViewport();
    updateDialogLayout(controller);
    const scroller = mode === "panel" ? controller.panelTarget : controller.bodyTarget;
    scroller.focus();
    overflow(scroller, 100, 100);

    updateDialogLayout(controller);

    expect(document.activeElement).toBe(controller.titleTarget);
    expect(scroller).not.toHaveAttribute("tabindex");
    expect(scroller).toHaveAttribute("aria-labelledby", "title");
  });

  it("keeps focus and scroll position on a scrolling region that remains active", () => {
    updateDialogLayout(controller);
    controller.bodyTarget.scrollTop = 180;
    controller.bodyTarget.focus();

    updateDialogLayout(controller);

    expect(document.activeElement).toBe(controller.bodyTarget);
    expect(controller.bodyTarget.scrollTop).toBe(180);
  });

  for (const mode of ["body", "panel"]) {
    it.each([
      ["above the viewport", 80, 40, 476],
      ["below the viewport", 290, 30, 524],
      ["inside the padded viewport", 104, 192, 500],
      ["too tall for the viewport", 80, 193, 500],
    ])(`adjusts ${mode} scrolling for a focused action %s`, (_description, top, height, expectedScroll) => {
      if (mode === "panel") panelViewport();
      updateDialogLayout(controller);
      const scroller = mode === "panel" ? controller.panelTarget : controller.bodyTarget;
      bounds(scroller, 100, 200);
      scroller.scrollTop = 500;
      const action = document.getElementById("action");
      bounds(action, top, height);
      action.focus();

      updateDialogLayout(controller);

      expect(scroller.scrollTop).toBe(expectedScroll);
      expect(document.activeElement).toBe(action);
    });
  }

  it("does not move a scrolling region when focus is outside it", () => {
    updateDialogLayout(controller);
    controller.bodyTarget.scrollTop = 250;
    const outside = document.getElementById("outside");
    outside.focus();

    updateDialogLayout(controller);

    expect(controller.bodyTarget.scrollTop).toBe(250);
    expect(document.activeElement).toBe(outside);
  });
});
