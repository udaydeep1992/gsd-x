---
name: gsd-idea
description: "Explore, sketch, spike, or capture an idea"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - SlashCommand
  - AskUserQuestion
---


<arguments>$ARGUMENTS</arguments>

Treat `idea` only as an intent hint. Do not inspect state, select a workflow, skill, agent, or command here. Pass the original request and this hint to the canonical router by invoking `/gsd-root idea: $ARGUMENTS`, then stop.
