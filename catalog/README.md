# Static catalog experiment

An isolated Astro Starlight proof of concept for issue #258. It renders real
Pathogen components from ordinary ERB, without loading Lookbook or starting Rails.
Lookbook and the public library remain unchanged.

From the repository root, in the normal development environment (Ruby from
`.ruby-version`, Node 24, pnpm 11.22, and `bin/bundle check` passing):

```sh
pnpm --dir catalog install --frozen-lockfile
pnpm --dir catalog build
pnpm --dir catalog preview
```

Open <http://localhost:4321/pathogen-view-components/>. The generated `catalog/dist/`
can be served by any static HTTP server; Ruby is only needed for generation.
The project subpath is intentional and can be changed with `CATALOG_BASE` (see
`base.mjs`). These commands deploy nothing; the `Component catalog` workflow builds and
tests the catalog on pull requests and publishes it to GitHub Pages from `main`.

For editing, `pnpm --dir catalog dev` exports examples and starts Astro. Markdown
updates refresh through Astro. After ERB, Ruby, or component asset edits, run
`pnpm --dir catalog export` and refresh the page. This spike does not implement a
Ruby watcher or arbitrary parameter controls.

## What to evaluate

- Button, tabs, and form pages show real components and the exact ERB used to render them.
- Both light and dark previews work, including tab arrow keys and native form controls.
- Search works in the production build (Pagefind is generated during build).
- Documentation links and preview assets work under the GitHub Pages subpath.
- The generated site works with no Ruby/Rails process running.

## Deliberate limits

Only three examples and three existing prose documents are included. Other
design-system links point to the repository source until those pages are migrated.
No endpoint-backed examples, automatic API reference,
component index filters, styling customization, or complete accessibility audit.
Starlight owns the documentation shell; component CSS is isolated in iframes.

## Validation

```sh
pnpm --dir catalog exec playwright install chromium
pnpm --dir catalog test
```

Run the build first. These browser smoke tests serve only `dist/`, check tab arrow
keys, native form controls, disabled buttons, loaded CSS, search, documentation
links, and a 320px viewport. Light, dark, and narrow screenshots are saved under
`catalog/test-results/`. They do not replace manual screen-reader testing.

`render.rb` is a small build host using the root Ruby bundle. `prepare.mjs` copies
the shipped CSS and bundles `application.js` (Stimulus and the Pathogen controllers,
without Turbo) with the shared esbuild configuration. Preview iframes grow to fit their
content. Generated pages, assets, and `dist/` are ignored. JavaScript dependencies,
including those the preview bundle needs, and their lockfile are isolated here, so the
catalog does not need the root `pnpm install` and the library build is unaffected.
