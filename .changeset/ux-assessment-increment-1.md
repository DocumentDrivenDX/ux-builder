---
"@ux-builder/audit": minor
"@ux-builder/mcp": patch
---

A HELIX-aware UX assessment, increment 1 (FEAT-009).

- `@ux-builder/audit`: `inspect(page)` runs the audit's checks on a page as it is, without reloading or resetting it, and `audit()` is now built on it with unchanged findings. New `ux-builder-audit assess` subcommands: `init` and `validate` (a `ux-assessment.yml` manifest that binds the app's HELIX marker, flow and catalogue), `collect` (every HELIX document, story and criterion, traced to the tests that cite them), `baseline` (the app's tests and the audit, recorded before any change), `browser` and `inspect` (inspect the page an agent's browser is on, over CDP, or a verified replay), and `validate-report`. Ships the `ux-builder-assess` skill and the JSON Schemas. New dependencies: `yaml`, `ajv`.
- `@ux-builder/mcp`: run from an app's directory, the server reads that app's installed `@ux-builder/ui` catalogue and guidance first, so it describes the version the app has.
