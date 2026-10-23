// The site's URL path, e.g. "/pathogen-view-components". CI sets CATALOG_BASE from
// actions/configure-pages (empty for a custom domain); render.rb reads the same variable.
export const base = (process.env.CATALOG_BASE ?? "/pathogen-view-components").replace(/\/+$/, "");
export const site = process.env.CATALOG_SITE ?? "https://phac-nml.github.io";
