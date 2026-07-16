import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

// jsdom disables Web Storage for opaque origins and some builds omit it
// entirely, leaving window.localStorage present but without working methods.
// Provide an in-memory implementation so localStorage-backed controllers (and
// their tests) behave like a real browser.
if (typeof window.localStorage?.setItem !== "function") {
  const createMemoryStorage = () => {
    let store = new Map();
    return {
      getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
      setItem: (key, value) => {
        store.set(String(key), String(value));
      },
      removeItem: (key) => {
        store.delete(String(key));
      },
      clear: () => {
        store = new Map();
      },
      key: (index) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    };
  };

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    writable: true,
    value: createMemoryStorage(),
  });
}

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
