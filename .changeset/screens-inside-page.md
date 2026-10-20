---
"@ux-builder/ui": patch
---

The agent guidance (`AGENTS.md`, the `ux-builder-ui` skill, `catalogue.json` rules) now says to put each screen inside a `Page` within `AppShell`. Neither `AppShell`'s content area nor the screen patterns have a page gutter of their own, so an agent that placed a `Dashboard` straight into `AppShell` got a screen flush against the navigation and the window edge.
