---
name: gsd:manage
description: Manage GSD settings, workspace, and runtime
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

Treat `manage` only as an intent hint. Do not inspect state, select a workflow, skill, agent, or command here. Pass the original request and this hint to the canonical router by invoking `/gsd:root manage: $ARGUMENTS`, then stop.
