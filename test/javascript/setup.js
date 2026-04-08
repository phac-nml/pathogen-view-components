import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

// jsdom does not implement window.matchMedia; provide a minimal stub so
// Stimulus controllers that call matchMedia (e.g. tooltip_controller) do not
// trigger a jsdom HTMLBaseElement.href inspection bug during teardown.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  document.body.innerHTML = "";
});
