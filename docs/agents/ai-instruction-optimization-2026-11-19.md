# AI instruction optimization research (2026-11-19)

## Executive summary

- Keep always-on instructions short and non-conflicting.
- Move deep procedural workflows into skills.
- Use path-scoped instruction files to reduce irrelevant prompt load.
- Rewrite the design-contract skill as a strict execution checklist, not philosophy.

## Source-grounded findings

1. Custom instructions are repeatedly included and should be concise, broadly applicable, and conflict-free.
   Source: `github/docs:data/reusables/copilot/custom-instructions-effective.md`, `github/docs:data/reusables/copilot/custom-instructions-conflict.md`
2. Path-specific instruction files (`.instructions.md` with `applyTo`) are the intended way to scope guidance.
   Source: `github/docs:data/reusables/copilot/custom-instructions-path.md`
3. AGENTS behavior uses closest-file precedence in tree traversal contexts.
   Source: `github/docs:data/reusables/copilot/custom-instructions-agents.md`
4. Skills are on-demand context and are better for specialized procedures than global instruction files.
   Source: `github/docs:data/reusables/copilot/skills-using.md`, `github/docs:data/reusables/copilot/skills-compared.md`
5. Skill contracts require `SKILL.md` plus frontmatter (`name`, `description`), with optional constrained tool allow-lists.
   Source: `github/docs:data/reusables/copilot/creating-adding-skills.md`
6. Large instruction files reduce quality; keep files bounded and high signal.
   Source: `github/docs:content/copilot/tutorials/customize-code-review.md`

## Recommended repository taxonomy

- `[AGENTS.md](/home/CSCScience.ca/jadam/gsd-workspaces/phac/pathogen-view-components/AGENTS.md)`
  Repository map, commands, and stable defaults only.
- `[.github/copilot-instructions.md](/home/CSCScience.ca/jadam/gsd-workspaces/phac/pathogen-view-components/.github/copilot-instructions.md)`
  10–20 compact cross-cutting rules.
- `[.github/instructions/ui.instructions.md](/home/CSCScience.ca/jadam/gsd-workspaces/phac/pathogen-view-components/.github/instructions/ui.instructions.md)`
  UI-only rules via `applyTo`.
- `[.github/instructions/tests.instructions.md](/home/CSCScience.ca/jadam/gsd-workspaces/phac/pathogen-view-components/.github/instructions/tests.instructions.md)`
  Test-only rules.
- `[.github/instructions/docs.instructions.md](/home/CSCScience.ca/jadam/gsd-workspaces/phac/pathogen-view-components/.github/instructions/docs.instructions.md)`
  Docs-only rules.
- `[.github/skills/design-contract/SKILL.md](/home/CSCScience.ca/jadam/gsd-workspaces/phac/pathogen-view-components/.github/skills/design-contract/SKILL.md)`
  Mandatory UI execution workflow and must-pass checks.

## What to add

- Path-scoped instruction files for UI/tests/docs.
- Explicit output contract in skills (report files touched, checks passed, exceptions).

## What to remove

- Duplicated policy text across AGENTS, copilot instructions, and skills.
- Local precedence ladders that can conflict with surface-specific loading behavior.
- Philosophy-heavy text inside skills when canonical docs already hold it.

## Design-contract rewrite target state

- Trigger conditions only.
- Required-read list only.
- Must-pass checklist only.
- Output contract only.

## Migration checklist

- [x] Rewrite design-contract skill into concise enforceable workflow.
- [x] Trim always-on instructions to cross-cutting defaults.
- [x] Add path-scoped instruction files for UI/tests/docs.
- [ ] Run workflow smoke checks in representative UI and non-UI tasks.
