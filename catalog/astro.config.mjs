import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { base, site } from "./base.mjs";

export default defineConfig({
  site,
  base: base || "/",
  integrations: [
    starlight({
      title: "Pathogen",
      sidebar: [
        { label: "Start here", slug: "index" },
        { label: "Components", items: [{ autogenerate: { directory: "components" } }] },
        { label: "Design system", items: [{ autogenerate: { directory: "design-system" } }] },
      ],
    }),
  ],
});
