---
applyTo: "app/components/**,app/helpers/**,app/assets/**,config/locales/**,docs/lookbook/**"
---

# UI instruction scope

- Use existing `Pathogen::*` primitives and semantic tokens before inventing new patterns.
- Preserve keyboard navigation, focus visibility, and ARIA semantics.
- Keep host-specific logic, branding overrides, and one-off app behavior out of shared component internals.
- When changing styles/classes/tokens, run CSS artifact validation (`pnpm run build:css:check`; rebuild with `pnpm run build:css` when expected).
- Update tests or previews at the same layer as the UI change.
