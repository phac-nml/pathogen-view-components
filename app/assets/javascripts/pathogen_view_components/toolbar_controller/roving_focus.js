import { isAriaDisabled, visibleItems } from "pathogen_view_components/toolbar_controller/visibility";

export function nextIndex(currentIndex, length) {
  return (currentIndex + 1) % length;
}

export function previousIndex(currentIndex, length) {
  return (currentIndex - 1 + length) % length;
}

export function setTabStopForItems(items, activeItem) {
  items.forEach((item) => {
    item.tabIndex = item === activeItem ? 0 : -1;
  });
}

export function initialTabStopItem(visibleItems) {
  const firstEnabledIndex = visibleItems.findIndex((item) => !isAriaDisabled(item));
  return visibleItems[firstEnabledIndex === -1 ? 0 : firstEnabledIndex];
}

export function setInitialTabStop(items) {
  const visible = visibleItems(items);
  if (visible.length === 0) {
    return;
  }

  items.forEach((item) => {
    item.tabIndex = -1;
  });

  setTabStopForItems(items, initialTabStopItem(visible));
}

export function connectedItemForTarget(items, target) {
  if (!(target instanceof Node)) {
    return null;
  }

  return items.find((item) => item.isConnected && (item === target || item.contains(target))) || null;
}
