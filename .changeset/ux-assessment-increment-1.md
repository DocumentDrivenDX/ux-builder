---
"@ux-builder/audit": minor
"@ux-builder/mcp": minor
---

A HELIX-aware UX assessment (FEAT-009).

- `@ux-builder/audit`: `inspect(page)` runs the audit's checks on a page as it is, without reloading or resetting it, and `audit()` is now built on it with unchanged findings. New `ux-builder-audit assess` subcommands: `init` and `validate` (a `ux-assessment.yml` manifest that binds the app's HELIX marker, flow and catalogue), `collect` (every HELIX document, story and criterion, traced to the tests that cite them), `baseline` (the app's tests and the audit, recorded before any change), `browser` and `inspect` (inspect the page an agent's browser is on, over CDP, or a verified replay), and `validate-report`. Ships the `ux-builder-assess` skill and the JSON Schemas. New dependencies: `yaml`, `ajv`.
- `@ux-builder/mcp`: run from an app's directory, the server reads that app's installed `@ux-builder/ui` catalogue and guidance first, so it describes the version the app has.
- `@ux-builder/audit`, increments 2 and 3: `assess plan` (journey plans and a coverage matrix with every pair), `browser --manifest` and `inspect --manifest` (allowed origins only, redaction), `reset`, `merge` (stable finding IDs), `propose`, `check-writes` and `apply-check` (patches aimed at HELIX artifacts, never applied), `report`, `compare` and `gate`; a CI workflow example; tested with Playwright MCP as the agent's driver.
- `@ux-builder/mcp`: when the app has `@ux-builder/audit`, the tools `get_assessment_skill`, `validate_assessment_manifest` and `validate_assessment_report`.
