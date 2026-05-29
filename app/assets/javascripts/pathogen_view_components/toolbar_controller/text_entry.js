import { MOVE_FORWARD, TEXT_ENTRY_SELECTOR } from "pathogen_view_components/toolbar_controller/constants";

export function textEntryControl(item) {
  if (item instanceof HTMLInputElement || item instanceof HTMLTextAreaElement) {
    return item;
  }

  if (!(item instanceof Element)) {
    return null;
  }

  const input = item.querySelector("input, textarea");
  return input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement ? input : null;
}

export function placeTextEntryCaret(item, moveDirection) {
  const input = textEntryControl(item);
  if (!input || input.selectionStart === null || input.selectionEnd === null) {
    return;
  }

  const position = moveDirection === MOVE_FORWARD ? input.value.length : 0;
  input.setSelectionRange(position, position);
}

export function isTextEntryTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest(TEXT_ENTRY_SELECTOR));
}

export function shouldNavigateFromTextEntry(target, key) {
  if (key !== "ArrowLeft" && key !== "ArrowRight") {
    return false;
  }

  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
    return false;
  }

  const { selectionStart, selectionEnd } = target;
  if (selectionStart === null || selectionEnd === null) {
    return false;
  }

  const selectionStartIndex = Math.min(selectionStart, selectionEnd);
  const selectionEndIndex = Math.max(selectionStart, selectionEnd);

  if (key === "ArrowLeft") {
    return selectionStartIndex === 0;
  }

  return selectionEndIndex === target.value.length;
}
