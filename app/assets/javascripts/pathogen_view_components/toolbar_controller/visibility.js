export function isAriaDisabled(item) {
  return item.getAttribute("aria-disabled") === "true";
}

export function isVisibleItem(item) {
  if (!(item instanceof HTMLElement)) {
    return false;
  }

  if (item.hidden || item.closest("[hidden]")) {
    return false;
  }

  const { display, visibility } = window.getComputedStyle(item);
  return display !== "none" && visibility !== "hidden";
}

export function visibleItems(items) {
  return items.filter((item) => isVisibleItem(item));
}
