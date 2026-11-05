// WebKit permits focus in an older native modal when another modal opens.
// Explicit inertness supplies that missing background isolation, while native
// showModal still owns focus confinement and lets a modal escape inert ancestors.
const active = [];
const previousInert = new Map();

function restore(dialog) {
  const attribute = previousInert.get(dialog);
  if (attribute === null) dialog.removeAttribute("inert");
  else dialog.setAttribute("inert", attribute);
  previousInert.delete(dialog);
}

function synchronize() {
  const top = active.findLast((dialog) => dialog.isConnected && dialog.open);
  for (const dialog of previousInert.keys()) {
    if (!top || dialog === top || !dialog.open || !dialog.isConnected) restore(dialog);
  }
  if (!top) return;
  for (const dialog of document.querySelectorAll("dialog[open]")) {
    if (dialog === top) continue;
    if (!previousInert.has(dialog)) previousInert.set(dialog, dialog.getAttribute("inert"));
    dialog.setAttribute("inert", "");
  }
}

export function registerModal(dialog) {
  const index = active.indexOf(dialog);
  if (index !== -1) active.splice(index, 1);
  active.push(dialog);
  synchronize();
}

export function unregisterModal(dialog) {
  const index = active.indexOf(dialog);
  if (index !== -1) active.splice(index, 1);
  synchronize();
}
