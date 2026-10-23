// Preview frames are static, so they only need Stimulus and the Pathogen controllers.
import { Application } from "@hotwired/stimulus";
import { registerPathogenControllers } from "pathogen_view_components";

registerPathogenControllers(Application.start());

// Grow the embedding iframe with its content so narrow or zoomed previews never clip.
const frame = globalThis.window?.frameElement;
if (frame) {
  new globalThis.ResizeObserver(() => {
    const border = frame.offsetHeight - frame.clientHeight;
    frame.style.height = `${Math.ceil(globalThis.document.body.getBoundingClientRect().height) + border}px`;
  }).observe(globalThis.document.body);
}
