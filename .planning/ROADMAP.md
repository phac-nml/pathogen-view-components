# Roadmap: pathogen-view-components

## Overview

This roadmap tracks the Pathogen component library's migration from baseline accessible interaction contracts toward a fully self-owned component system. The current sequence reflects the work already present in the planning tree: first establish keyboard-safe DataGrid behavior, then land the virtual architecture track, then remove Tailwind coupling and move the library onto a Lightning CSS-driven, component-owned stylesheet system.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Keyboard Navigation Baseline** - Establish the accessible keyboard and ARIA baseline for DataGrid and related interaction contracts.
- [ ] **Phase 2: Virtual Architecture** - Migrate DataGrid virtual mode to the div-based architecture while preserving focus, sticky columns, and parity behavior.
- [ ] **Phase 3: CSS Migration** - Remove Tailwind coupling from Pathogen and adopt component-owned CSS compiled with Lightning CSS.
- [x] **Phase 3.5: Remove Pathogen Icon Components** (INSERTED) - Remove the Pathogen::Icon family from the gem and update the demo app to use rails_icons directly.
- [ ] **Phase 4: Validation and Rollout Hardening** - Verify the rewritten surfaces, close regressions, and prepare the library for stable rollout.

## Phase Details

### Phase 1: Keyboard Navigation Baseline
**Goal:** DataGrid exposes an accessible keyboard navigation baseline with stable ARIA semantics, initial focus behavior, and component-level coverage.
**Depends on:** Nothing (first phase)
**Requirements**: GRID-01, GRID-02, GRID-03
**Success Criteria** (what must be TRUE):
  1. DataGrid renders with the ARIA structure and focus entry behavior needed for keyboard navigation.
  2. Keyboard interaction contracts are covered by component and controller tests.
  3. The phase 1 documents remain archived history rather than the active planning source of truth.
**Plans**: 3 completed plans

Plans:
- [x] 01-01: Establish ARIA grid and initial roving tabindex contract
- [x] 01-02: Implement keyboard navigation behavior and controller flow
- [x] 01-03: Add supporting docs, previews, and verification coverage

### Phase 2: Virtual Architecture
**Goal:** Virtual mode moves to a div-based grid architecture while preserving existing consumer behavior that matters: keyboard movement, focus restoration, sticky pinned columns, and fallback parity.
**Depends on:** Phase 1
**Requirements**: VIRT-01, VIRT-02, VIRT-03, VIRT-04, VIRT-05
**Success Criteria** (what must be TRUE):
  1. Virtual mode uses the div-based rendering path without removing the non-virtual fallback path.
  2. Focus and keyboard navigation remain stable across virtual rerenders and scroll-window changes.
  3. Sticky pinned columns remain aligned with the center lane during horizontal movement.
  4. The phase has concrete implementation plans and research artifacts ready for execution.
**Plans**: 4 plans

Plans:
- [ ] 02-01: Introduce the div-based virtual DOM structure and styling surface
- [ ] 02-02: Preserve keyboard, focus, and active-cell behavior across virtualization boundaries
- [ ] 02-03: Restore sticky-column and header/body alignment parity
- [ ] 02-04: Close fallback parity gaps and regression coverage holes

### Phase 3: CSS Migration
**Goal:** Remove all Tailwind references from the Pathogen component library and its support surfaces, introduce component-owned source CSS compiled with Lightning CSS, and keep `pathogen_view_components.css` as the single published artifact.
**Depends on:** Phase 2
**Requirements**: CSS-01, CSS-02, CSS-03, CSS-04, CSS-05, CSS-06
**Success Criteria** (what must be TRUE):
  1. Pathogen runtime components and Stimulus controllers no longer depend on Tailwind class strings or Tailwind-specific state toggling.
  2. Source CSS is organized around shared tokens/minimal utilities plus one stylesheet per public component.
  3. The repo still publishes a single `pathogen_view_components.css` artifact built from the new source architecture.
  4. Previews, tests, docs, and the demo app no longer require a Tailwind pipeline to present or verify Pathogen components.
**Plans**: 14 plans

Plans:
- [x] 03-01-PLAN.md — Add Lightning CSS build, check, and watch tooling.
- [x] 03-02-PLAN.md — Create the Pathogen CSS source tree and preserve the bundled stylesheet boundary.
- [x] 03-03-PLAN.md — Migrate tabs to Pathogen-owned CSS and semantic JS state.
- [ ] 03-04-PLAN.md — Migrate tooltip to Pathogen-owned CSS and semantic JS state.
- [ ] 03-05-PLAN.md — Migrate button, icon, and link runtime classes to Pathogen component CSS.
- [ ] 03-06-PLAN.md — Migrate shared form/radio styling to Pathogen component CSS.
- [ ] 03-07-PLAN.md — Convert typography runtime classes to Pathogen token classes and CSS.
- [ ] 03-08-PLAN.md — Minimize shared utilities and consolidate DataGrid styling ownership.
- [ ] 03-09-PLAN.md — Remove Tailwind from demo/docs wiring and add the repo scan gate.
- [ ] 03-10-PLAN.md — Rewrite tabs and tooltip preview templates to the semantic Pathogen contract.
- [ ] 03-11-PLAN.md — Rewrite typography preview templates to the Pathogen contract.
- [ ] 03-12-PLAN.md — Rewrite primitive, form, and DataGrid preview templates to the Pathogen contract.
- [ ] 03-13-PLAN.md — Migrate heading hierarchy typography components to shared Pathogen tokens.
- [ ] 03-14-PLAN.md — Migrate body/content typography components to shared Pathogen tokens.

### Phase 3.5: Remove Pathogen Icon Components (INSERTED)
**Goal:** Remove the Pathogen::Icon component family and its rails_icons dependency from the gem. Update the demo app to use rails_icons directly so it becomes an example of how consuming apps should integrate icons themselves.
**Depends on:** Phase 3 (partial — plans 01-03 complete)
**Requirements**: ICON-01, ICON-02, ICON-03
**Success Criteria** (what must be TRUE):
  1. The Pathogen gem no longer ships icon components (`icon.rb`, `icon_renderer.rb`, `icon_validator.rb`, `icon_error_handler.rb`) or the `rails_icons` dependency.
  2. The demo app uses `rails_icons` directly with the latest version for its own Lookbook previews.
  3. The button component's icon slot is updated to not depend on `Pathogen::Icon`.
  4. No orphaned references to `Pathogen::Icon` or `IconRenderer` remain in the codebase.
**Plans**: 3 plans

Plans:
- [x] 03.5-01-PLAN.md — Delete icon components/previews and remove gem-level icon dependencies/references.
- [x] 03.5-03-PLAN.md — Rewire button icon slot to helpers.icon and close orphan reference scans.
- [x] 03.5-02-PLAN.md — Add rails_icons to demo app with lockfile version gate and verify Lookbook icon rendering.

### Phase 4: Validation and Rollout Hardening
**Goal:** Validate the migrated virtual architecture and CSS system, close remaining regressions, and prepare the library for stable consumer rollout.
**Depends on:** Phase 3
**Requirements**: REL-01, REL-02, REL-03
**Success Criteria** (what must be TRUE):
  1. High-risk interaction and styling regressions are covered by automated and manual validation.
  2. Consumer-facing docs reflect the shipped runtime, build, and stylesheet contract.
  3. The library is ready for stable rollout without hidden Tailwind or legacy styling dependencies.
**Plans**: TBD

Plans:
- [ ] TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Keyboard Navigation Baseline | 3/3 | Complete | 2026-03-22 |
| 2. Virtual Architecture | 0/4 | In progress | - |
| 3. CSS Migration | 3/14 | In progress | - |
| 3.5. Remove Pathogen Icon Components | 3/3 | Complete | 2026-03-27 |
| 4. Validation and Rollout Hardening | 0/TBD | Not started | - |
