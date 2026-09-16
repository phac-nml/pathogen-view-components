import "./application.js";
import { enableTabsLazyLoadMocks } from "./lookbook_mocks/tabs_lazy_load.js";

try {
  await enableTabsLazyLoadMocks();
} catch (error) {
  console.warn("[pathogen lookbook] Lazy-load mocks are unavailable.", error);
}
