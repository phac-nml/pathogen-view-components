// Every modal owner shares one snapshot, including the off-canvas Sidebar.
const owners = new Set();
let previous = null;

export function acquireScrollLock(owner) {
  if (owners.has(owner)) return;
  if (owners.size === 0) {
    const root = document.documentElement;
    previous = {
      rootOverflow: root.style.overflow,
      bodyOverflow: document.body.style.overflow,
      gutter: root.style.scrollbarGutter,
    };
    root.style.scrollbarGutter = "stable";
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  owners.add(owner);
}

export function releaseScrollLock(owner) {
  if (!owners.delete(owner) || owners.size > 0) return;
  document.documentElement.style.overflow = previous.rootOverflow;
  document.documentElement.style.scrollbarGutter = previous.gutter;
  document.body.style.overflow = previous.bodyOverflow;
  previous = null;
}
