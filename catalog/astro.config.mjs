import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://phac-nml.github.io",
  base: "/pathogen-view-components",
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
