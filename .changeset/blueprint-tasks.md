---
"@ux-builder/ui": minor
"@ux-builder/mcp": minor
---

Blueprints may hold a task model, `tasks[]` (goal, jobs, trigger, inputs, system and user actions, success criteria, exceptions, subtasks, interaction kinds), and journeys name the task they realize. New checks: `journey.task-exists` (error) and `task.realized` (warning). `ux-builder-blueprint simplify` (and MCP `simplify_blueprint`) proposes inputs to infer, decisions to default, steps to combine and hops to remove, changing nothing.
