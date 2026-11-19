---
name: design-contract
description: Use for any change touching UI semantics, component APIs, styling, previews, locales, or accessibility.
---

# Design contract execution

Use this skill whenever a change touches UI behavior or representation.

## Invoke when

- Editing files under `app/components`, `app/helpers`, `app/assets`, `config/locales`, or `docs/lookbook`
- Changing component APIs, visual states, focus behavior, labels/copy, previews, or accessibility behavior

## Required reads

1. `docs/lookbook/design_system/00-overview.md.erb`
2. `docs/lookbook/design_system/01-design-contract.md.erb`
3. `docs/lookbook/design_system/06-host-library-boundary.md.erb` (when host integration or boundaries are affected)

## Must-pass checks

1. Reuse existing `Pathogen::*` primitives/components before adding new patterns.
2. Use semantic design tokens; do not hard-code host-specific brand colors in shared components.
3. Preserve keyboard access, visible focus, ARIA/labels, and screen-reader behavior.
4. Keep host-specific logic out of shared library internals.
5. Update tests/previews at the same layer as the change.
6. Run CSS artifact validation (`pnpm run build:css:check`, or `pnpm run build:css` when expected to change) when classes/tokens/styles are touched.

## Output contract

Before finishing, report:

- Files changed
- Which required docs were read
- Must-pass checklist status (pass/fail per item)
- Any intentional exception and its rationale
