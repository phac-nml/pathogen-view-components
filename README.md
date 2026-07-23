# Pathogen View Components

Pathogen View Components is a focused library of Rails ViewComponents and Stimulus controllers designed for accessible, internationalized, and consistent UI across Pathogen and IRIDA Next applications. It provides a small, opinionated design system: sensible defaults, strong accessibility primitives, and the hooks you need to extend behavior without fighting the framework.

This repository is the extracted, standalone home for the Pathogen UI layer. It ships as a Rails engine with assets, helpers, and importmap pins ready to integrate into modern Rails applications.

## Highlights

- **Accessible by default**: ARIA patterns, focus management, and SR-friendly utilities.
- **Component-first API**: ViewComponents with slots and options that scale with your app.
- **Stimulus-ready**: Built-in controllers for tabs, tooltips, data grids, and toolbars.
- **Pre-built Tailwind CSS**: one compiled stylesheet (`pathogen_view_components.css`) with design tokens as CSS variables; host apps do not run Tailwind.
- **Engine-powered**: Helpers, locales, and assets wired through the Rails engine.

## Requirements

For developing this repository:

- Ruby **3.3+**
- Rails **8.1+**
- `view_component` **>= 4.0, < 5.0**

JavaScript dependencies (importmap or package manager):

- `@hotwired/stimulus` **^3.0.0**
- `@hotwired/turbo-rails` **^8.0.0** (peer dependency)
- `uuid` **^13.0.0**
- `@floating-ui/dom` **^1.7.5**

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
<%= render Pathogen::TabsComponent.new(label: "Sample Tabs") do |tabs| %>
  <% tabs.with_tab("Overview", id: "overview") do %>
    <p>Overview content</p>
  <% end %>
  <% tabs.with_tab("Details", id: "details") do %>
    <p>Details content</p>
  <% end %>
<% end %>
```

#### Toolbar

Table action row (default `variant: :table`):

```erb
<%# Hidden forms + detached submit buttons (see IRIDA shared/selection_buttons). %>
<form id="select-all-form" class="hidden" data-turbo-frame="selected" action="..." method="get">
  <input type="hidden" name="select" value="on">
</form>
<form id="deselect-all-form" class="hidden" data-turbo-frame="selected" action="..." method="get"></form>

<%= render Pathogen::Toolbar.new(label: "Sample grid actions", controls: "samples-grid") do %>
  <%= render Pathogen::Toolbar::Group.new do %>
    <%= render Pathogen::Toolbar::Button.new(form: "select-all-form", label: "Select all samples") { "Select all" } %>
    <%= render Pathogen::Toolbar::Button.new(form: "deselect-all-form", label: "Deselect all samples") { "Deselect all" } %>
  <% end %>

  <%= render Pathogen::Toolbar::Spacer.new %>

  <%= render Pathogen::Toolbar::Group.new do %>
    <%= render Pathogen::Toolbar::Button.new { "Columns" } %>
    <%= render Pathogen::Toolbar::Button.new(aria_disabled: true, label: "Export selected samples") { "Export" } %>
  <% end %>

  <%# Text-entry controls last in DOM order per the APG toolbar pattern. %>
  <%= render Pathogen::Toolbar::Group.new(reflow: :alone) do %>
    <input type="search" tabindex="-1" data-pathogen--toolbar-target="item" aria-label="Search samples">
  <% end %>
<% end %>
```

Toolbar buttons associated with a detached form default to `type="submit"`. Pass an explicit `type:` to override that default.

Compact inline toolbar (`variant: :chip`):

```erb
<%= render Pathogen::Toolbar.new(label: "Editor actions", variant: :chip) do %>
  <%= render Pathogen::Toolbar::Button.new(pressed: params[:dense] == "1") { "Dense" } %>
  <%= render Pathogen::Toolbar::Button.new(pressed: params[:wrap] == "1") { "Wrap" } %>
  <%= render Pathogen::Toolbar::Separator.new %>
  <button type="button" tabindex="-1" data-pathogen--toolbar-target="item">More</button>
<% end %>
```

- Use `Toolbar::Group` so related controls reflow together. Use `reflow: :alone` when a control (typically search) should wrap independently.
- Use `Toolbar::Spacer` between start and end groups on wide viewports; it collapses on narrow screens.
- When composing a toolbar above a data grid, wrap both in one framed surface (`data-pathogen--toolbar-surface`) so the grid omits its outer border; separate the toolbar band with a single `border-b`.
- Toolbar items participate in roving focus only when they expose `data-pathogen--toolbar-target="item"` (via `Toolbar::Button` or an explicit target on custom controls).
- Use a toolbar only when grouping **three or more** controls ([APG toolbar guidance](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)).
- Use `disabled: true` for native, unfocusable buttons. Use `aria_disabled: true` only when an unavailable action must remain focusable for discoverability.
- Text-entry controls and native selects keep Left/Right/Home/End for their own operation; leave them with Tab / Shift+Tab and place them last in DOM order.
- The controller resyncs when items connect/disconnect and on `turbo:morph`, so the toolbar keeps its keyboard wiring across Turbo morphs. After wholesale `innerHTML` swaps that bypass Stimulus targets, dispatch `pathogen--toolbar:sync` on the toolbar element (bubbles).
- Host-local dropdown/menu popups stay consumer-managed in v1: only the closed trigger joins toolbar navigation, and the popup owns its own open-state keyboard model (it must stop propagation so the toolbar does not steal its keys).

#### Tooltip

```erb
<%= render Pathogen::Link.new(href: "/samples") do |link| %>
  <%= link.with_tooltip(text: "View all samples") %>
  Samples
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

Pathogen provides a small set of Stimulus controllers for interactive components.

### Importmap

The engine registers importmap pins from `config/importmap.rb` automatically. After boot, you should see entries for `pathogen_view_components` and its controllers in `/rails/importmap`.

### Controller Registration

Register Pathogen controllers in your Stimulus index **before** any lazy-loading call:

```javascript
import { application } from "controllers/application";
import { registerPathogenControllers } from "pathogen_view_components";

registerPathogenControllers(application);
```

### Available Controllers

- `pathogen--tabs`: WAI-ARIA compliant tabs with keyboard navigation and URL hash syncing
- `pathogen--tooltip`: Accessible tooltip with Floating UI positioning and semantic state attributes
- `pathogen--data-grid`: ARIA grid keyboard navigation with roving tabindex and interactive-cell focus delegation
- `pathogen--toolbar`: Horizontal toolbar roving focus, disabled-action interception, and text-entry-safe key handling

## Development

Set up the development environment:

```bash
bin/setup
```

Use `bin/setup --skip-demo` if you only want the library dependencies and hooks without preparing the Lookbook demo app.

Run tests:

```bash
bin/test           # Ruby component tests
pnpm test          # JavaScript controller tests (requires pnpm install)
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

Open `http://localhost:3001/lookbook`. Design-system guidance lives in the Lookbook Pages section from `docs/lookbook/`. Component previews live in `test/components/previews/pathogen/` and are shared between the test suite and Lookbook.

## Contributing

Bug reports and pull requests are welcome. Please include tests for behavioral changes and note any accessibility impacts.

## License

The gem is available as open source under the terms of the MIT License.
