# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout

This repo uses a **single-context** domain-doc layout.

Current project context:

- `.planning/CONTEXT.md`

ADR location:

- `docs/adr/`

Feature specs:

- `.planning/specs/<nnn>-<feature>/`

`.planning/` is local-only and is the single home for planning material. Update glossary and planning context in those files directly; never create GitHub issues for `.planning/` work (see `docs/agents/issue-tracker.md`). Do not add a repo-root `specs/` directory — feature specs belong under `.planning/specs/` so planning docs stay in one place.

`docs/adr/` may not exist yet. If it is missing, proceed silently. The domain-modeling flow can create ADRs lazily when a decision is actually resolved.

## Before exploring, read these

- `.planning/CONTEXT.md` when the task depends on project terminology, architecture, or prior planning context.
- `docs/adr/` for ADRs that touch the area you're about to work in, if the directory exists.

## Use the glossary's vocabulary

When your output names a domain concept in an issue title, refactor proposal, hypothesis, or test name, use the term as defined in `.planning/CONTEXT.md`. Do not drift to synonyms the glossary explicitly avoids.

If the concept you need is not in the glossary yet, either reconsider whether the term belongs here or note the gap for `/domain-modeling`. Update `.planning/CONTEXT.md` locally — do not open a GitHub issue for glossary or other `.planning/` work.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly instead of silently overriding it.
