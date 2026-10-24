---
"@ux-builder/design": minor
"@ux-builder/ui": patch
---

Business rules in the task model (FEAT-018 GDL-78): rules stay defined once in HELIX as `**BR-<n>** — <rule>`; blueprint tasks and journey steps cite them (`rules`), and the blueprint's `businessRules` says how the user meets each (trigger, before, blocked, recover), in the blueprint schema. `ux-builder-design validate` fails a cited rule HELIX does not define or whose experience is not designed; `test-kit` adds a task per rule in its trigger situation; `report` shows how people fared with each rule and lists untested ones; `trace` and `impact` follow rules to their tasks, journeys and screens.
