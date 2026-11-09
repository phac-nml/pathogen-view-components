function describeToast(toast) {
  const dialog = toast.getAttribute("data-pathogen--toast-mode-value") === "dialog";
  const timeoutValue = toast.getAttribute("data-pathogen--toast-timeout-value");
  const timeout = timeoutValue === null ? null : Number(timeoutValue);
  const persistent =
    dialog ||
    toast.getAttribute("data-pathogen--toast-persistent-value") === "true" ||
    (timeout !== null && Number.isFinite(timeout) && timeout <= 0);
  return { toast, dialog, persistent };
}

// Layout belongs to CSS. This plan owns only visibility and interaction state.
function createStackPlan(toasts, { expanded, maxVisible, reducedMotion }) {
  const records = toasts.map(describeToast);
  const dialogCount = records.filter((record) => record.dialog).length;
  const peek = !reducedMotion && dialogCount === 0;
  const overflowCount = Math.max(0, records.filter((record) => !record.persistent).length - maxVisible);
  let statusIndex = 0;
  const entries = records.map((record) => {
    const overflow = !record.persistent && statusIndex++ < overflowCount;
    return { ...record, hidden: !expanded && overflow, behind: false, index: 0 };
  });
  const visible = entries.filter((entry) => !entry.hidden);
  visible.forEach((entry, index) => {
    entry.index = visible.length - index - 1;
    entry.behind = peek && !expanded && entry.index > 0;
  });

  return {
    entries,
    peek,
    peekCount: peek && !expanded ? Math.max(0, visible.length - 1) : 0,
    // Keep the expansion control present while the user is interacting with it.
    moreCount: peek ? Math.max(0, records.length - 1) : overflowCount,
    dialogCount,
  };
}

export { createStackPlan, describeToast };
