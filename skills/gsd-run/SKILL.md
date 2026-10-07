---
name: gsd-run
description: "Run eligible GSD work autonomously"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - SlashCommand
  - AskUserQuestion
---


<arguments>$ARGUMENTS</arguments>

Treat `run` only as an intent hint. Do not inspect state, select a workflow, skill, agent, or command here. The canonical router enforces explicit authorization for unattended execution and existing safety gates. Pass the original request and this hint to `/gsd-root run: $ARGUMENTS`, then stop.
