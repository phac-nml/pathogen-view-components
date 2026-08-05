export function isAriaDisabled(item) {
  return item.getAttribute("aria-disabled") === "true";
}

export function isNativeDisabled(item) {
  return item.matches(":disabled");
}

export function isVisibleItem(item) {
  if (!(item instanceof HTMLElement)) {
    return false;
  }

  let current = item;
  while (current) {
    if (current.hidden || current.hasAttribute("inert") || current.getAttribute("aria-hidden") === "true") {
      return false;
    }

    const { contentVisibility, display, visibility } = window.getComputedStyle(current);
    if (display === "none" || visibility === "hidden" || visibility === "collapse" || contentVisibility === "hidden") {
      return false;
    }

    current = current.parentElement;
  }

  return true;
}

export function isNavigableItem(item) {
  return isVisibleItem(item) && !isNativeDisabled(item);
}

export function visibleItems(items) {
  return items.filter((item) => isNavigableItem(item));
}
