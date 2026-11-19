# Pathogen View Components Copilot Instructions

Pathogen View Components is a shared UI library and Rails engine used by host applications such as IRIDA Next. Keep guidance in this repository self-contained and focused on reusable, host-agnostic component behavior.

## Always-on rules

- Keep shared UI behavior in Pathogen components rather than host-local forks.
- Prefer semantic tokens and documented component APIs over ad hoc utility-only interfaces.
- Preserve accessibility behavior for keyboard, focus, and assistive technology.
- Keep host-specific logic out of library internals.
- Keep instructions non-conflicting and concise; move deep procedures into skills.
- Prefer enforceable guardrails over prose-only reminders: when a recurring mistake is found, encode prevention in deterministic checks (lint, types, tests, CI) before adding more instruction text.
- When adding or updating a guardrail, make the failure message actionable and root-cause oriented so agents can apply the intended fix.

## Instruction layout

- `AGENTS.md`: repository map, commands, and contributor-facing operating rules.
- `.github/copilot-instructions.md` (this file): short cross-cutting defaults.
- `.github/instructions/*.instructions.md`: path-scoped guidance.
- `.github/skills/*/SKILL.md`: deep, task-specific workflows.

## Required Design-System Context

Before UI or API changes, review:

- `docs/lookbook/design_system/00-overview.md.erb`
- `docs/lookbook/design_system/01-design-contract.md.erb`
- `docs/lookbook/design_system/06-host-library-boundary.md.erb` when host integration boundaries are involved
