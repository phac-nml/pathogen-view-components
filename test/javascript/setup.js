import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

if (typeof window.localStorage?.clear !== "function") {
  const stores = new WeakMap();

  Object.defineProperties(Storage.prototype, {
    clear: {
      configurable: true,
      value() {
        stores.get(this)?.clear();
      },
    },
    getItem: {
      configurable: true,
      value(key) {
        return stores.get(this)?.get(String(key)) ?? null;
      },
    },
    key: {
      configurable: true,
      value(index) {
        return [...(stores.get(this)?.keys() ?? [])][index] ?? null;
      },
    },
    removeItem: {
      configurable: true,
      value(key) {
        stores.get(this)?.delete(String(key));
      },
    },
    setItem: {
      configurable: true,
      value(key, value) {
        stores.get(this)?.set(String(key), String(value));
      },
    },
  });

  const memoryStorage = Object.create(Storage.prototype);
  stores.set(memoryStorage, new Map());
  Object.defineProperty(window, "localStorage", { configurable: true, value: memoryStorage });
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
