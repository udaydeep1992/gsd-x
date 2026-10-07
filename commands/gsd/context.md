---
name: gsd:context
description: Understand, map, or document the codebase
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

Treat `context` only as an intent hint. Do not inspect state, select a workflow, skill, agent, or command here. Pass the original request and this hint to the canonical router by invoking `/gsd:root context: $ARGUMENTS`, then stop.
