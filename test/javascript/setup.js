import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

// jsdom does not implement window.matchMedia; provide a minimal stub so that
// libraries or controllers that reference matchMedia do not trigger a jsdom
// HTMLBaseElement.href inspection bug during teardown.
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
