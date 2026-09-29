const TOAST_GAP_PX = 14;

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

function createStackPlan(toasts, { expanded, maxVisible, reducedMotion, measureToast }) {
  const records = toasts.map(describeToast);
  const dialogCount = records.filter((record) => record.dialog).length;
  const peek = !reducedMotion && dialogCount === 0;
  const overflowCount = Math.max(0, records.filter((record) => !record.persistent).length - maxVisible);
  let nonPersistentIndex = 0;
  const entries = records.map((record) => {
    const overflow = !record.persistent && nonPersistentIndex < overflowCount;
    if (!record.persistent) nonPersistentIndex += 1;
    return { ...record, hidden: !expanded && overflow };
  });
  const frontFirst = entries.filter((entry) => !entry.hidden).reverse();
  const sizes = peek ? frontFirst.map(({ toast }) => measureToast(toast)) : [];
  const frontHeight = Math.ceil(sizes[0]?.height ?? 0);
  const frontWidth = Math.ceil(sizes[0]?.width ?? 0);
  const peekCount = Math.max(0, frontFirst.length - 1);
  const metricsReady = peek && frontFirst.length > 0 && (expanded || peekCount === 0 || frontHeight > 0);
  let offset = 0;

  frontFirst.forEach((entry, index) => {
    entry.index = index;
    entry.height = Math.ceil(sizes[index]?.height ?? 0);
    entry.offset = expanded ? offset : 0;
    entry.behind = peek && metricsReady && !expanded && index > 0;
    offset += entry.height + TOAST_GAP_PX;
  });

  entries.forEach((entry) => {
    entry.inert = entry.hidden || Boolean(entry.behind);
  });

  // Count what the collapsed stack would conceal, so expansion keeps its
  // initiating control present and focused.
  const moreCount = peek && metricsReady ? Math.max(0, records.length - 1) : overflowCount;

  return {
    entries,
    peek,
    metricsReady,
    peekCount,
    frontHeight,
    frontWidth,
    stackHeight: Math.max(0, offset - TOAST_GAP_PX),
    moreCount,
    dialogCount,
  };
}

export { createStackPlan, describeToast, TOAST_GAP_PX };
