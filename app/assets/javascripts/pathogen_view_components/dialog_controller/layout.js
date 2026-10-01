function configureScroller(element, active, titleId) {
  if (active) {
    element.setAttribute("role", "region");
    element.setAttribute("aria-labelledby", titleId);
  } else {
    element.removeAttribute("role");
    element.removeAttribute("aria-labelledby");
  }
  if (active && element.scrollHeight > element.clientHeight + 1) {
    element.setAttribute("tabindex", "0");
  } else {
    element.removeAttribute("tabindex");
  }
}

// Measure the available viewport independently of current body height. This
// avoids oscillating between layouts when content or translated actions grow.
export function updateDialogLayout(controller) {
  const { dialogTarget: dialog, panelTarget: panel, bodyTarget: body } = controller;
  if (!dialog.open) return;
  const focused = document.activeElement;
  const previousScroller = panel.dataset.scrollMode === "panel" ? panel : body;

  const viewport = window.visualViewport;
  const height = viewport?.height ?? window.innerHeight;
  const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const style = getComputedStyle(dialog);
  const topInset = Math.max(fontSize, parseFloat(style.getPropertyValue("--pvc-dialog-safe-top")) || 0);
  const bottomInset = Math.max(fontSize, parseFloat(style.getPropertyValue("--pvc-dialog-safe-bottom")) || 0);
  const available = Math.max(44, height - topInset - bottomInset);
  dialog.style.setProperty("--pvc-dialog-available-height", `${available}px`);

  const chrome =
    controller.headerTarget.getBoundingClientRect().height +
    (controller.hasFooterTarget ? controller.footerTarget.getBoundingClientRect().height : 0);
  const bodyFontSize = parseFloat(getComputedStyle(body).fontSize) || fontSize;
  const minimumBodyHeight = 6 * Math.max(fontSize, bodyFontSize);
  const mode = available - chrome - 2 < minimumBodyHeight ? "panel" : "body";
  panel.dataset.scrollMode = mode;
  configureScroller(body, mode === "body", controller.titleTarget.id);
  configureScroller(panel, mode === "panel", controller.titleTarget.id);

  const panelHeight = dialog.getBoundingClientRect().height;
  const centeredTop = (height - panelHeight) / 2;
  const top =
    (viewport?.offsetTop ?? 0) + Math.max(topInset, Math.min(centeredTop, height - bottomInset - panelHeight));
  dialog.style.setProperty("--pvc-dialog-top", `${top}px`);

  const scroller = mode === "panel" ? panel : body;
  if (focused === previousScroller && (previousScroller !== scroller || !scroller.hasAttribute("tabindex"))) {
    const focusTarget = scroller.hasAttribute("tabindex") ? scroller : controller.titleTarget;
    focusTarget.focus({ preventScroll: true });
  }
  if (scroller.contains(focused) && focused !== scroller) {
    const bounds = scroller.getBoundingClientRect();
    const target = focused.getBoundingClientRect();
    const inset = 4;
    if (target.height <= bounds.height - 2 * inset) {
      if (target.top < bounds.top + inset) scroller.scrollTop += target.top - bounds.top - inset;
      else if (target.bottom > bounds.bottom - inset) scroller.scrollTop += target.bottom - bounds.bottom + inset;
    }
  }
}
