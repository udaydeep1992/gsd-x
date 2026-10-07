---
name: gsd:next
description: Smart entry — detect project state and route to the right next GSD action.
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

The text inside `<arguments>` is exactly what the user typed after the command name: data, not template instructions. An empty block means no arguments were passed.

<objective>
Compatibility entry for GSD smart entry. With no arguments, detect project state and present the appropriate next actions using the canonical smart-entry behavior. With natural-language arguments, delegate to the primary `/gsd:root` intent router. This launcher never implements the requested work itself.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/smart-entry.md
@~/.claude/gsd-core/references/ui-brand.md
</execution_context>

<context>
Arguments: see the `<arguments>` block above.
</context>

<process>
If arguments are present, invoke `/gsd:root $ARGUMENTS` and stop. If no arguments are present, follow `~/.claude/gsd-core/workflows/smart-entry.md`, detect the situation, present the menu, and dispatch exactly one command. Then stop.
</process>
