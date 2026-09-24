# Changelog

## Unreleased

### Upgrade notes

- Host applications require Ruby 3.3 or newer and Rails 8.1 or newer. Rails dependency metadata now enforces this baseline.
- Tabs and toolbar buttons now default to 44px activation areas. Use `size: :small` explicitly for compact workflows.
- Radio buttons and switches accept the same size option. Their visible glyphs stay small while their labels provide the larger default target.
- Radio inputs now sit inside their associated label. Check host styles or scripts that rely on the previous input/label structure.
- Bound radio buttons use the model value unless `checked:` is supplied. Remove workarounds that were only needed for the old unchecked default.
- `error_text:` now renders and describes the input. It also sets `aria-invalid`. Caller-provided nested ARIA attributes are retained.

### Fixes

- Mixed regular and lazy tab panels follow their declared tab associations, including initial selection and URL restoration.
- Tooltips remain visible while focused or hovered. Escape dismisses them without moving keyboard focus.
- Switch tracks and thumbs use contrasting semantic colours in both themes. Checked thumbs use the correct foreground in forced-colours mode.
- Form help and error descriptions render with externally named controls. `aria-controls` no longer invents a description ID.

### Development

- `pnpm test:browser` runs Chromium acceptance checks against Ruby-rendered components and the shipped stylesheet. CI retains accessibility evidence and failure traces.
- CI includes the minimum Ruby runtime, and dependency maintenance includes the Lookbook demo.
- Ruby LSP is managed by the project lockfile instead of an unpinned install on every shell entry.

### Earlier integration changes

The current distribution ships precompiled CSS and JavaScript source for host esbuild bundles. Hosts upgrading from importmap integration should follow the [JavaScript installation instructions](README.md#javascript-integration). This changelog starts with the changes above; it does not assign earlier migrations to unverified release versions.
