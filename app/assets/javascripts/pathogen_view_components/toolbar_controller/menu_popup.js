import { TOOLBAR_NAV_KEYS } from "pathogen_view_components/toolbar_controller/constants";

export function isOpenMenu(menu) {
  if (menu.getAttribute("role") !== "menu" || menu.hidden || menu.getAttribute("aria-hidden") === "true") {
    return false;
  }

  const { display, visibility } = window.getComputedStyle(menu);
  return display !== "none" && visibility !== "hidden";
}

export function menuElementForId(toolbarRoot, menuId) {
  if (!menuId) {
    return null;
  }

  const escapedId = CSS.escape(menuId);
  const scopedMenu = toolbarRoot.querySelector(`#${escapedId}`);
  if (scopedMenu) {
    return scopedMenu;
  }

  const menu = document.getElementById(menuId);
  if (!menu) {
    return null;
  }

  return menu;
}

export function openMenuForTrigger(toolbarRoot, trigger) {
  const menuId = trigger.getAttribute("aria-controls");
  if (!menuId) {
    return null;
  }

  const menu = menuElementForId(toolbarRoot, menuId);
  if (!menu || !isOpenMenu(menu)) {
    return null;
  }

  return menu;
}

export function toolbarItemForOpenPopup(items, target) {
  if (!(target instanceof Element)) {
    return null;
  }

  const openMenu = target.closest('[role="menu"]');
  if (!openMenu || !isOpenMenu(openMenu)) {
    return null;
  }

  const menuId = openMenu.id;
  if (menuId) {
    const itemByControls = items.find((item) => item.isConnected && item.getAttribute("aria-controls") === menuId);
    if (itemByControls) {
      return itemByControls;
    }
  }

  const labelledBy = openMenu.getAttribute("aria-labelledby");
  if (labelledBy) {
    const itemByLabel = items.find((item) => item.isConnected && item.id === labelledBy);
    if (itemByLabel) {
      return itemByLabel;
    }
  }

  return null;
}

export function shouldYieldMenuNavigation({ event, toolbarRoot, items }) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return false;
  }

  const openMenu = target.closest('[role="menu"]');
  if (openMenu && toolbarRoot.contains(openMenu) && isOpenMenu(openMenu)) {
    return true;
  }

  const triggerWithOpenMenu = items.find(
    (item) =>
      item.isConnected &&
      (item === target || item.contains(target)) &&
      openMenuForTrigger(toolbarRoot, item) &&
      (event.key === "ArrowDown" || event.key === "ArrowUp"),
  );

  return Boolean(triggerWithOpenMenu);
}

export function shouldDeferToPopup({ event, toolbarRoot, item, target }) {
  if (!TOOLBAR_NAV_KEYS.has(event.key)) {
    return false;
  }

  const openMenu = openMenuForTrigger(toolbarRoot, item);
  if (
    openMenu &&
    event.key !== "ArrowRight" &&
    event.key !== "ArrowLeft" &&
    event.key !== "Home" &&
    event.key !== "End"
  ) {
    return true;
  }

  if (target instanceof Element && targetIsInOpenPopup(toolbarRoot, item, target)) {
    return true;
  }

  if ((event.key === "ArrowDown" || event.key === "ArrowUp") && item.hasAttribute("aria-haspopup")) {
    return true;
  }

  return false;
}

export function targetIsInOpenPopup(toolbarRoot, item, target) {
  const menuId = item.getAttribute("aria-controls");
  if (!menuId) {
    return false;
  }

  const menu = menuElementForId(toolbarRoot, menuId);
  if (!menu || !isOpenMenu(menu)) {
    return false;
  }

  return menu.contains(target);
}
