# Requirements: pathogen-view-components

**Defined:** 2026-03-23
**Core Value:** Developers can use Pathogen components with stable accessibility, behavior, and styling contracts without relying on host-app Tailwind coupling.

## v1 Requirements

### DataGrid Foundation

- [ ] **GRID-01**: DataGrid exposes accessible grid semantics and a stable keyboard entry point.
- [ ] **GRID-02**: DataGrid keyboard behavior is covered by component and JavaScript regression tests.
- [ ] **GRID-03**: DataGrid preserves a usable non-empty and empty-state render contract for consumers.

### Virtual Architecture

- [ ] **VIRT-01**: Virtual mode uses a div-based grid architecture without removing the non-virtual fallback path.
- [ ] **VIRT-02**: Focus is restored correctly when virtual rows or columns rerender.
- [ ] **VIRT-03**: Keyboard navigation works across virtual row and column boundaries.
- [ ] **VIRT-04**: Sticky pinned columns stay visually aligned with headers and center-lane content.
- [ ] **VIRT-05**: Virtual and fallback modes preserve equivalent consumer-facing behavior where differences are not explicitly authorized.

### CSS Migration

- [ ] **CSS-01**: Pathogen runtime components do not embed Tailwind utility classes in shipped markup contracts.
- [ ] **CSS-02**: Stimulus controllers use semantic state attributes or native attributes instead of Tailwind class toggling for visual state.
- [x] **CSS-03**: Pathogen source CSS is organized into shared tokens, minimal shared utilities, and one stylesheet per public component.
- [x] **CSS-04**: The library continues to publish one bundled stylesheet at `app/assets/stylesheets/pathogen_view_components.css`.
- [ ] **CSS-05**: Previews, tests, documentation, and the demo app no longer require Tailwind to render or validate Pathogen components.
- [ ] **CSS-06**: The migration preserves recognizable component behavior while improving styling consistency where the current system is uneven.

### Icon Removal

- [x] **ICON-01**: The Pathogen gem no longer ships `Pathogen::Icon` or its supporting components, and `rails_icons` is removed as a gemspec dependency.
- [ ] **ICON-02**: The demo app uses `rails_icons` directly (latest version) for its own icon previews, independent of the Pathogen gem.
- [ ] **ICON-03**: No orphaned references to `Pathogen::Icon`, `IconRenderer`, `IconValidator`, or `IconErrorHandler` remain in shipped gem code, tests, or previews.

### Rollout Readiness

- [ ] **REL-01**: Consumer-facing integration docs match the actual asset, JavaScript, and stylesheet contract.
- [ ] **REL-02**: High-risk interaction and styling regressions are covered by verification artifacts before rollout.
- [ ] **REL-03**: No hidden Tailwind dependency remains in shipped code, demo workflows, or documented setup paths.

## v2 Requirements

### Future Expansion

- **FUT-01**: Introduce additional component families beyond the current Pathogen surface.
- **FUT-02**: Support broader theming and brand override APIs beyond the current token contract.

## Out of Scope

| Feature | Reason |
|---------|--------|
| App-wide host redesign outside Pathogen | This roadmap only covers the component library and its demo/support surfaces |
| New component capabilities unrelated to styling or existing virtualization work | Those should land as separate phases with their own context and requirements |
| Multiple published CSS artifacts for consumers | The current contract remains a single published stylesheet |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| GRID-01 | Phase 1 | Complete |
| GRID-02 | Phase 1 | Complete |
| GRID-03 | Phase 1 | Complete |
| VIRT-01 | Phase 2 | In Progress |
| VIRT-02 | Phase 2 | In Progress |
| VIRT-03 | Phase 2 | In Progress |
| VIRT-04 | Phase 2 | In Progress |
| VIRT-05 | Phase 2 | In Progress |
| CSS-01 | Phase 3 | Pending |
| CSS-02 | Phase 3 | Pending |
| CSS-03 | Phase 3 | Complete |
| CSS-04 | Phase 3 | Complete |
| CSS-05 | Phase 3 | Pending |
| CSS-06 | Phase 3 | Pending |
| REL-01 | Phase 4 | Pending |
| REL-02 | Phase 4 | Pending |
| REL-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-27 after PR #14 merged Phase 03 plans 01-02*
