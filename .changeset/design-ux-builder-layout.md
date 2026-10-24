---
"@ux-builder/design": minor
"@ux-builder/ui": minor
"@ux-builder/create-app": minor
"@ux-builder/audit": patch
"@ux-builder/mcp": patch
---

The design work lives under `docs/ux-builder/` (FEAT-018 GDL-80): the design documents, the blueprint and its alternatives (`blueprint/`), exploratory prototypes (`prototypes/`), HELIX proposals (`helix-proposals/`), comparisons, drawings and wireframes. New apps from create-app put the blueprint at `docs/ux-builder/blueprint/app.blueprint.json`, and the blueprint CLI, the audit and the MCP server look there by default. An app on the old layout keeps working where it is, each command says so, and `ux-builder-design migrate [--dry-run]` moves it with `git mv` and rewrites the app's references. `ux-builder-design modality` records the person's answer on modality and screen sizes; in a guided app `ux-builder-blueprint wireframes` and `prototype --explore` wait for it, and ask again when the blueprint's supports change.
