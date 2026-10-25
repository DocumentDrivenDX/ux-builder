---
"@ux-builder/design": patch
"@ux-builder/audit": patch
"@ux-builder/mcp": patch
"@ux-builder/ui": patch
---

Alignment fixes for the guided design (FEAT-018). `ux-builder-design step` no longer moves past a step that `core-1`, `core-2` or `core-3` closes until that checkpoint has passed or been skipped (exit 2), as CONTRACT-008 says. In an app on the `docs/ux-builder/` layout, `ux-builder-audit assess heuristics` and `assess hierarchy` now find the blueprint there instead of silently running without one. The package exports `./artifacts/*`; its output schema covers every command; messages and the MCP `design_status` description no longer name `docs/ux/`. The SDK's agent guidance names the blueprint's current path, and the skill's activity table uses the eight steps' names.
