import { enableTabsLazyLoadMocks } from "lookbook_mocks/tabs_lazy_load";

try {
  await enableTabsLazyLoadMocks();
} catch (error) {
  console.warn("[pathogen lookbook] Lazy-load mocks are unavailable.", error);
}

await import("application");
