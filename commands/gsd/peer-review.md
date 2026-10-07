---
name: gsd:peer-review
description: Run explicit cross-AI review of a GSD phase plan
argument-hint: "--phase N [--claude] [--codex] [--opencode] [--qwen] [--cursor] [--agy] [--all]"
effort: low
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - SlashCommand
  - AskUserQuestion
requires: [config, phase, plan-phase]
---

<arguments>$ARGUMENTS</arguments>

<objective>
Execute the existing cross-AI phase-plan review contract when selected by the canonical `/gsd:root` router for an explicit peer-review request. Produce `REVIEWS.md` as defined by the existing workflow.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/review.md
</execution_context>

<context>
Arguments: see `<arguments>` above. A phase number is required.

Flags:
- `--claude`, `--codex`, `--opencode`, `--qwen`, `--cursor`, `--agy` / `--antigravity`: include selected CLI reviewers.
- `--all`: include every detected reviewer.
- With no reviewer flags, honor `review.default_reviewers` or use all available CLIs.
</context>

<process>
Run the existing cross-AI phase-plan review workflow end-to-end with the supplied phase and reviewer flags. This command is a specialist destination, not an intent router.
</process>
