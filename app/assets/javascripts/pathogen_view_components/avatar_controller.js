import { Controller } from "@hotwired/stimulus";

// Image events may fire before Stimulus connects, including cached failures.
// Target callbacks also reconcile cached images after Turbo replacements.
export default class AvatarController extends Controller {
  static targets = ["image", "fallback"];

  imageTargetConnected(image) {
    this.setImageVisibility(!image.complete || image.naturalWidth > 0);
  }

  fallbackTargetConnected() {
    if (this.hasImageTarget) this.imageTargetConnected(this.imageTarget);
  }

  showImage() {
    this.setImageVisibility(true);
  }

  showFallback() {
    this.setImageVisibility(false);
  }

  setImageVisibility(visible) {
    if (!this.hasImageTarget || !this.hasFallbackTarget) return;

    this.imageTarget.hidden = !visible;
    this.fallbackTarget.hidden = visible;
  }
}
