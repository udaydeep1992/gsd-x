---
name: gsd-project
description: "Manage project progress and lifecycle"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - SlashCommand
  - AskUserQuestion
---


<arguments>$ARGUMENTS</arguments>

Treat `project` only as an intent hint. Do not inspect state, select a workflow, skill, agent, or command here. Pass the original request and this hint to the canonical router by invoking `/gsd-root project: $ARGUMENTS`, then stop.
