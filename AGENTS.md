# Pathogen View Components Agent Guide

## Project Summary

Pathogen View Components is a Rails engine and ViewComponent library for accessible, internationalized UI shared by Pathogen and IRIDA Next applications. It provides Pathogen-namespaced components, helpers, Stimulus controllers, design tokens, Lookbook documentation, and a precompiled Tailwind CSS artifact.

Use this file as the repository operating map. Keep personal preferences in `~/.codex/AGENTS.md`.

## Folder Map

- `app/components`: Pathogen ViewComponents and previews.
- `app/assets/javascripts`: bundled JavaScript entrypoints and Stimulus controllers.
- `app/assets/stylesheets`: Tailwind source and generated component CSS.
- `app/helpers`: helper APIs exposed by the engine.
- `config`: engine config, importmap pins, routes, and locales.
- `docs/lookbook`: design-system and Lookbook documentation.
- `demo`: Lookbook demo Rails app.
- `lib`: gem and engine code.
- `scripts`: CSS build and watch scripts.
- `test/components`, `test/helpers`, `test/javascript`, `test/lib`: Ruby and JavaScript test suites.

## Required Context

Before UI or design-system work, read:

- `docs/lookbook/design_system/00-overview.md.erb`
- `docs/lookbook/design_system/01-design-contract.md.erb`
- `docs/lookbook/design_system/06-host-library-boundary.md.erb` when the change touches host integration, promotion, or host-local UI debt
- Task-specific docs in `docs/lookbook/design_system/` as needed.
- `.github/skills/design-contract/SKILL.md` for UI task execution requirements.

## Development Commands

- `bin/setup`: install dependencies, prepare the demo app, and install hooks.
- `bin/setup --skip-demo`: install library dependencies and hooks without preparing the demo app.
- `bin/test`: run Ruby component and library tests.
- `pnpm test`: run JavaScript tests.
- `pnpm run build:css`: rebuild the generated Pathogen CSS artifact.
- `pnpm run build:css:check`: verify the generated CSS artifact is current.
- `pnpm run build:css:watch`: watch and rebuild Pathogen CSS during development.
- `pnpm run lint`: run Prettier, ESLint, and Herb linting.

## Style And Tooling

- Ruby support starts at `3.3`.
- Rails support starts at `8.1`.
- Components use ViewComponent `>= 4.0, < 5.0`.
- JavaScript is ESM and Stimulus-based.
- Tailwind CSS v4 generates `pathogen_view_components.css`.
- Prefer roles, ARIA, and stable `data-*` hooks over styling classes in tests.

## Change Rules

Keep changes surgical.

- Touch only files directly related to the task.
- Do not refactor adjacent code unless the task requires it.
- Update tests at the same layer as the change.
- Rebuild or check generated CSS when changing component classes, Tailwind sources, or helper-emitted classes.
- For host-app compatibility, consider IRIDA Next usage before changing public component APIs.

Instruction structure:

- `AGENTS.md`: repository map and stable defaults.
- `.github/copilot-instructions.md`: compact always-on cross-cutting rules.
- `.github/instructions/*.instructions.md`: path-scoped instructions.
- `.github/skills/*/SKILL.md`: deep task workflows.

## Commit And PR Notes

Use scoped conventional commit subjects, matching recent history.

Examples:

- `fix(button): prevent disabled hover styles`
- `refactor(typography): simplify baseline classes`
- `build(css): refresh generated artifact`

PRs should follow `.github/pull_request_template.md`, explain what changed and why, and include exact validation commands with outcomes. Include screenshots or recordings for visible UI changes.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for `phac-nml/pathogen-view-components`; external PRs are not a triage request surface. Use the `gh` CLI for issue and PR operations. See `docs/agents/issue-tracker.md`. Never create issues for `.planning/` — that directory is local-only.

### Domain docs

This repo uses a single-context domain-doc layout, with `.planning/CONTEXT.md` as the current project context and `docs/adr/` reserved for future ADRs. See `docs/agents/domain.md`.
