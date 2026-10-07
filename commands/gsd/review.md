---
name: gsd:review
description: Review or audit code, security, UI, tests, or release readiness
argument-hint: "[natural-language review intent or --phase N]"
effort: low
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - SlashCommand
  - AskUserQuestion
---

<arguments>$ARGUMENTS</arguments>

Treat `review` only as an intent hint. Do not inspect state, select a workflow, skill, agent, or command here. Pass the original request and this hint to the canonical router by invoking `/gsd:root review: $ARGUMENTS`, then stop.
