# Pathogen View Components

Pathogen View Components is a focused library of Rails ViewComponents and Stimulus controllers designed for accessible, internationalized, and consistent UI across Pathogen and IRIDA Next applications. It provides a small, opinionated design system: sensible defaults, strong accessibility primitives, and the hooks you need to extend behavior without fighting the framework.

This repository is the extracted, standalone home for the Pathogen UI layer. It ships as a Rails engine with helpers, precompiled CSS, and JavaScript source for host applications to bundle with esbuild.

## Highlights

- **Accessible by default**: ARIA patterns, focus management, and SR-friendly utilities.
- **Component-first API**: ViewComponents with slots and options that scale with your app.
- **Stimulus-ready**: Built-in controllers for tabs, tooltips, disclosures, and DataGrid.
- **Pre-built Tailwind CSS**: one compiled stylesheet (`pathogen_view_components.css`) with design tokens as CSS variables; host apps do not run Tailwind.
- **Engine-powered**: Helpers, locales, and assets wired through the Rails engine.

## Testing and Coverage

[![JavaScript coverage](https://codecov.io/gh/phac-nml/pathogen-view-components/graph/badge.svg?flag=javascript)](https://codecov.io/gh/phac-nml/pathogen-view-components)

JavaScript coverage runs in CI and is surfaced in two places for pull requests:

- Sticky PR comment with lines, statements, functions, and branches coverage.
- Workflow summary plus uploaded `javascript-coverage` artifact containing HTML, LCOV, and JSON reports.

## Requirements

For developing this repository:

- Ruby **3.3+**
- Rails **8.1+**
- `view_component` **>= 4.0, < 5.0**
- Node.js **24** and pnpm **11.22**

JavaScript dependencies (installed by the host application):

- `@hotwired/stimulus` **^3.0.0**
- `@hotwired/turbo-rails` **^8.0.0** (peer dependency)
- `uuid` **^14.0.2**
- `@floating-ui/dom` **^1.8.0**

## Installation

Add this line to your application's `Gemfile`:

```ruby
gem 'pathogen_view_components'
```

Then install:

```bash
bundle install
```

## Usage

### ViewComponents

Pathogen components are under the `Pathogen` namespace and follow the ViewComponent render pattern.

#### Button

```erb
<%= render Pathogen::Button.new(tone: :primary, emphasis: :solid, text: "Save") %>
```

Pass button text with `text:` in Lookbook preview templates and other ERB templates rendered outside a normal ViewComponent block context. Content blocks still work from Ruby preview methods and host app views.

Use `disabled: true` for fully inactive buttons (removed from tab order). Use `aria_disabled: true` when the
button should stay focusable but not act yet, for example, a form submit that announces validation errors after
activation ([focusable disabled pattern](https://www.atomica11y.com/accessible-design/button/)).

```erb
<%= render Pathogen::Button.new(tone: :primary, emphasis: :solid, aria_disabled: true, text: "Continue") %>
```

For icon-only actions, use `icon_only: true` with a required accessible name. Pass the icon through
`leading_visual` or `trailing_visual`. When multiple icon-only buttons repeat the same visual, give each a
distinct name:

```erb
<%= render Pathogen::Button.new(icon_only: true, text: "Edit payment date", size: :small) do |button| %>
  <% button.with_leading_visual do %>
    <%= icon("pencil", class: "size-4") %>
  <% end %>
<% end %>
```

Navigation that looks like a button should use `tag: :a` with an `href`:

```erb
<%= render Pathogen::Button.new(tag: :a, href: samples_path, tone: :primary, emphasis: :solid) { "View samples" } %>
```

#### DataGrid

```erb
<%= render Pathogen::DataGridComponent.new(rows: @rows, caption: "Samples") do |grid| %>
  <% grid.with_column("ID", key: :id, width: 120) %>
  <% grid.with_column("Name", key: :name, width: 240) %>
<% end %>
```

Custom cell rendering:

```erb
<%= render Pathogen::DataGridComponent.new(rows: @rows) do |grid| %>
  <% grid.with_column("Name") { |row| tag.strong(row[:name]) } %>
<% end %>
```

Sticky columns:

```erb
<%= render Pathogen::DataGridComponent.new(rows: @rows, sticky_columns: 1) do |grid| %>
  <% grid.with_column("ID", key: :id, width: 120) %>
  <% grid.with_column("Name", key: :name, width: 240) %>
<% end %>
```

#### Tabs

```erb
<%= render Pathogen::Tabs.new(id: "sample-tabs", label: "Sample tabs") do |tabs| %>
  <% tabs.with_tab(id: "overview-tab", label: "Overview", selected: true) %>
  <% tabs.with_tab(id: "details-tab", label: "Details") %>

  <% tabs.with_panel(id: "overview-panel", tab_id: "overview-tab") do %>
    <p>Overview content</p>
  <% end %>

  <% tabs.with_panel(id: "details-panel", tab_id: "details-tab") do %>
    <p>Details content</p>
  <% end %>
<% end %>
```

#### Tooltip

```erb
<%= render Pathogen::Link.new(href: "/samples") do |link| %>
  <%= link.with_tooltip(text: "View all samples") %>
  Samples
<% end %>
```

#### Disclosure

```erb
<%= render Pathogen::Disclosure.new(id: "advanced-options", label: "Advanced options") do %>
  <p>Include quality metrics and protocol attachments.</p>
<% end %>
```

`Pathogen::Disclosure` follows the WAI-ARIA disclosure pattern: a native `<button>` with
`aria-expanded` / `aria-controls`, and a panel toggled with `hidden`. Stimulus updates
`aria-expanded` on the focused control so screen readers announce expanded/collapsed on
activation (including VoiceOver), not only when the control receives focus.

- Default size is `:medium` (44px minimum target). Use `size: :small` for dense toolbars (24px).
- Set `heading_level: 2..6` to wrap the button in a heading (APG FAQ pattern).
- Prefer visible trigger text as the accessible name. Use `aria_label:` only when the trigger has
  no usable text, or when you need a richer name that still includes the visible label (WCAG 2.5.3).
- Do not put links, buttons, inputs, or other interactive elements in a trigger slot.
- Pass `trigger_arguments:` / `panel_arguments:` to extend the button or panel without forking.

```erb
<%= render Pathogen::Disclosure.new(
  id: "metadata-templates",
  heading_level: 3,
  aria_label: "Metadata templates, 3 available"
) do |disclosure| %>
  <% disclosure.with_trigger do %>
    Metadata templates <span>(3)</span>
  <% end %>
  <p>Specimen, isolate, and outbreak templates.</p>
<% end %>
```

### Styles

The engine ships a single precompiled `pathogen_view_components.css`, produced in this repository with **Tailwind CSS v4** from `app/assets/stylesheets/pathogen.tailwind.css` (sources scanned across components, ERB, and Stimulus). In most Rails setups, the engine will precompile this file. Ensure your application includes the stylesheet via your asset pipeline or build tooling.

**Breaking change (v1):** components no longer emit BEM-style `pathogen-*` class hooks for styling. Prefer roles, ARIA, and `data-*` targets (for example `data-pathogen-grid`, Stimulus `data-pathogen--*`) for tests and host-app hooks.

To rebuild the stylesheet during development:

```bash
pnpm run build:css         # one-shot build
pnpm run build:css:watch   # watch mode
pnpm run build:css:check   # CI: fail if artifact is out of date
```

### Internationalization

Translations live under `config/locales` in the engine. Rails automatically loads these locales when the engine is mounted, so you can provide app-level overrides in your own `config/locales` files as needed.

## JavaScript Integration

Pathogen ships JavaScript source in the gem. Your application bundles it with esbuild and owns the Turbo and Stimulus instances. No separate Pathogen npm package or prebuilt JavaScript bundle is needed.

**Breaking change:** importmap support has been removed. Upgrade the host's JavaScript build before adopting this version. Pathogen's CSS integration is unchanged.

### esbuild Setup

Install the JavaScript dependencies listed above with your application's package manager, and add esbuild as a build dependency. For example:

```bash
pnpm add "@hotwired/stimulus@^3.0.0" "@hotwired/turbo-rails@^8.0.0" "@floating-ui/dom@^1.8.0" "uuid@^14.0.2"
pnpm add -D "esbuild@^0.28.1"
```

Add the gem source and host dependencies to your esbuild configuration. This example lives at the application root as `esbuild.config.mjs`:

```javascript
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = dirname(fileURLToPath(import.meta.url));
const gemRoot = execFileSync("bundle", ["show", "pathogen_view_components"], {
  cwd: root,
  encoding: "utf8",
}).trim();
const production = process.env.NODE_ENV === "production" || process.env.RAILS_ENV === "production";
const hostPackages = ["@hotwired/stimulus", "@hotwired/turbo-rails", "@floating-ui/dom", "uuid"];
const options = {
  absWorkingDir: root,
  entryPoints: ["app/javascript/application.js"],
  outdir: "app/assets/builds",
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "es2022",
  minify: production,
  sourcemap: !production,
  define: {
    "import.meta.env.DEV": String(!production),
    "process.env.NODE_ENV": JSON.stringify(production ? "production" : "development"),
  },
  alias: {
    // The stem resolves both the entry .js file and controller subpaths.
    pathogen_view_components: join(gemRoot, "app/assets/javascripts/pathogen_view_components"),
    ...Object.fromEntries(hostPackages.map((name) => [name, name])),
  },
};

if (process.argv.includes("--watch")) {
  const context = await esbuild.context(options);
  await context.watch();
} else {
  await esbuild.build(options);
}
```

The identity aliases are intentional: esbuild resolves aliased packages from `absWorkingDir`, so the gem uses the host's installed packages and their package exports. This keeps one copy of Stimulus even when the gem comes from a separate checkout. Merge these aliases into an existing esbuild configuration if you already have one. Match the target to your application's supported browsers.

Run `node esbuild.config.mjs` before asset precompilation and tests that load JavaScript. Use `node esbuild.config.mjs --watch` alongside your development server. Install dependencies from your lockfile before building; deployments need esbuild available at build time.

Register `app/assets/builds` with Propshaft, including on a fresh checkout where the directory does not exist yet. Exclude the host's unbundled JavaScript directory so it cannot shadow the generated `application.js`:

```ruby
# config/initializers/assets.rb
Rails.application.config.assets.paths << Rails.root.join('app/assets/builds')
Rails.application.config.assets.excluded_paths << Rails.root.join('app/javascript')
```

Pathogen's engine excludes its own JavaScript source from Propshaft. Load the host bundle in your layout:

```erb
<%= javascript_include_tag "application", type: "module", "data-turbo-track": "reload" %>
```

### Controller Registration

Register Pathogen controllers once on the application's Stimulus instance. For a new entrypoint:

```javascript
import "@hotwired/turbo-rails";
import { Application } from "@hotwired/stimulus";
import { registerPathogenControllers } from "pathogen_view_components";

const application = Application.start();
registerPathogenControllers(application);
```

If your application already starts Stimulus, reuse that instance and add only the Pathogen import and registration call. Replace importmap-based controller discovery with bundled imports as part of the host migration.

### Available Controllers

- `pathogen--tabs`: WAI-ARIA compliant tabs with keyboard navigation and URL hash syncing
- `pathogen--tooltip`: Accessible tooltip with Floating UI positioning and semantic state attributes
- `pathogen--disclosure`: APG disclosure with `aria-expanded` / `aria-controls` and programmatic open state
- `pathogen--data-grid`: ARIA grid keyboard navigation with roving tabindex and interactive-cell focus delegation

## Development

Set up the development environment:

```bash
bin/setup
```

Use `bin/setup --skip-demo` if you only want the library dependencies and hooks without preparing the Lookbook demo app.

Run checks:

```bash
bin/verify         # Generated CSS + packaged-gem JavaScript checks
bin/test           # Ruby component tests (excludes shipped-file gates)
pnpm test          # JavaScript controller tests (requires pnpm install)
pnpm run build:js  # Bundle the demo JavaScript with esbuild
```

Git hooks are managed with `lefthook`. The pre-commit hook runs `bundle exec i18n-tasks health`, formats staged JavaScript, JSON, Markdown, CSS, and YAML with Prettier, auto-fixes staged JavaScript with ESLint, runs RuboCop autocorrections on staged Ruby files, and re-stages any changes.

### Screen reader testing

Before merging keyboard navigation changes, manually verify with a screen reader:

- **macOS:** VoiceOver + Safari (`Cmd+F5` to toggle VO)
- **Windows:** NVDA + Firefox (free at nvaccess.org)

Key behaviors to spot-check:

- Arrow key navigation announces cell content and grid position (e.g., "row 2 of 3, column 1 of 2")
- `Enter` or `F2` enters widget mode and announces the focused interactive element
- `Escape` exits widget mode and returns announcement to the cell
- `Ctrl+Home` / `Ctrl+End` announces first/last cell

### Lookbook demo app

A Lookbook instance at `demo/` lets you browse and interact with all components in the browser without a full host application.

```bash
cd demo
bundle install
bin/dev
```

`bin/dev` builds JavaScript before starting Rails and watches JavaScript and CSS for changes. The demo uses the root `package.json` and `pnpm-lock.yaml`; it has no separate JavaScript dependency install. Its asset precompilation task also builds JavaScript.

Open `http://localhost:3001/lookbook`. Design-system guidance lives in the Lookbook Pages section from `docs/lookbook/`. Component previews live in `test/components/previews/pathogen/` and are shared between the test suite and Lookbook.

## Contributing

Bug reports and pull requests are welcome. Please include tests for behavioral changes and note any accessibility impacts.

## License

The gem is available as open source under the terms of the MIT License.
