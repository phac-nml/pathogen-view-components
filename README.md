# Pathogen View Components

Pathogen View Components is a focused library of Rails ViewComponents and Stimulus controllers designed for accessible, internationalized, and consistent UI across Pathogen and IRIDA Next applications. It provides a small, opinionated design system: sensible defaults, strong accessibility primitives, and the hooks you need to extend behavior without fighting the framework.

This repository is the extracted, standalone home for the Pathogen UI layer. It ships as a Rails engine with assets, helpers, and importmap pins ready to integrate into modern Rails applications.

## Highlights

- **Accessible by default**: ARIA patterns, focus management, and SR-friendly utilities.
- **Component-first API**: ViewComponents with slots and options that scale with your app.
- **Stimulus-ready**: Built-in controllers for tabs and tooltips.
- **Tokenized styling**: CSS variables and layers so host apps can override safely.
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
- `flowbite` **^3.1.2** (temporary dependency for tooltips)

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

#### Tooltip

```erb
<%= render Pathogen::TooltipComponent.new(text: "More details") do %>
  <%= render Pathogen::ButtonComponent.new(text: "Hover me") %>
<% end %>
```

### Styles

The engine ships `pathogen_view_components.css`, built on layered CSS tokens. In most Rails setups, the engine will precompile this file. Ensure your application includes the stylesheet via your asset pipeline or build tooling.

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
- `pathogen--tooltip`: Lightweight tooltip behavior (Flowbite-backed)
- `pathogen--data-grid`: ARIA grid keyboard navigation with roving tabindex and interactive-cell focus delegation

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

Open `http://localhost:3001/lookbook`. Component previews live in `test/components/previews/pathogen/` and are shared between the test suite and Lookbook.

## Contributing

Bug reports and pull requests are welcome. Please include tests for behavioral changes and note any accessibility impacts.

## License

The gem is available as open source under the terms of the MIT License.
