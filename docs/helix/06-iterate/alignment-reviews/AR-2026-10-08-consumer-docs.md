---
ddx:
  id: AR-2026-10-08-consumer-docs
  type: alignment-review
  activity: iterate
  status: complete
  updated: 2026-10-08
---

# Alignment Review: what a consuming app needs to know

**Review Date**: 2026-10-08
**Scope**: consumer-facing documentation — the repository README, the package READMEs and the HELIX artifacts a client team relies on (PRD Technical Context, FEAT-004, US-012, US-022, CONTRACT-001/003) — against the packages as of PRs #35 (loading widgets) and #37 (audit): `@ux-builder/tokens` 1.4.0, `@ux-builder/ui` 0.6.0, `@ux-builder/create-app` 0.4.0, `@ux-builder/audit` 0.1.0, `@ux-builder/mcp` 0.3.1
**Status**: complete
**Requested by**: operator, "update all related helix docs and the project's readme to include everything a client consuming the packages needs to know"
**Primary Governing Artifact**: `docs/helix/01-frame/features/FEAT-004-app-sdk.md`

## Findings and Resolution

| Finding | Type | Evidence | Resolution |
|---|---|---|---|
| No contract for what an app imports and calls: entry points, set-up order, `ThemeProvider` props, the `piq:set-theme` event, lint rule names and options, `ux-builder-audit` options, exit codes and `report.json`, MCP tools, the 0.x compatibility promise. CONTRACT-003 puts the provider out of scope | UNDERSPECIFIED | `CONTRACT-003` Scope; `packages/ui/src/ThemeProvider.jsx:64`, `packages/audit/cli.mjs`, `packages/ui/lint/eslint.mjs` | New `CONTRACT-004-app-integration.md`, accepted by the operator 2026-10-08 |
| `npm create @ux-builder/app` fails with 404 unless the `@ux-builder` registry is in the user's npm config; the README showed the command without it | INCOMPLETE | `README.md` "Starting a new app" (before); `packages/create-app/template/npmrc` only covers the generated app | README step 1, create-app README, US-012 walkthrough step 0, CONTRACT-004 errors (since moot: the packages are public on npm and need no registry line, FEAT-005) |
| The README was written for maintainers; a client's path (access → start or adopt → choose a theme → build → check → agents → upgrade → troubleshoot) was spread across sections or only in package READMEs, and adopting the SDK in an existing app was not described | INCOMPLETE | `README.md` before: Status, Themes, Commands, "What a consumer gets" | README restructured: *Using the SDK in an app* first, *Working on this repository* after |
| `@ux-builder/tokens` README listed seven themes (missing `databricks` and `praxis-v2-databricks`) and said apps load Roboto, IBM Plex and Synaptiq's faces themselves; fonts are bundled since 1.0.0 | STALE_PLAN | `packages/tokens/README.md` (before) | Theme list, `fonts/` imports and bundled faces corrected |
| README theme table missing `praxis-v2-databricks` | STALE_PLAN | `tokens/themes/praxis-v2-databricks.theme.json` | Added, with appearances |
| `@ux-builder/ui` README missing ProgressBar, Spinner, Skeleton, Button `busy`, `onChange` persistence, the `piq:set-theme` event, `no-foreign-ui` and `no-inline-svg`; Storybook theme list and "only foundations stories" stale | STALE_PLAN | `packages/ui/README.md` (before); `packages/ui/src/index.js` | Added and corrected |
| `@ux-builder/create-app` and `@ux-builder/mcp` published with no README | INCOMPLETE | `packages/create-app/`, `packages/mcp/` | READMEs added |
| FEAT-004 overview cited 0.2.0 versions; functional areas lacked loading and audit; constraints listed widgets without SDK-17's | STALE_PLAN | `FEAT-004` Overview, Functional Areas, Constraints | Updated; Dependencies name CONTRACT-001/003/004 and FEAT-005 |
| PRD Technical Context cited tokens 1.0.0 and ui, create-app and mcp 0.2.0, without the audit | STALE_PLAN | `prd.md` Technical Context | Current versions; points at CONTRACT-004 |
| US-012 omitted the audit and CI the starter now generates | INCOMPLETE | `packages/create-app/template/github/workflows/ci.yml` | Walkthrough step 4; links US-022 and CONTRACT-004 |

The versions cited were released together on 2026-10-08 (PR #39): tokens 1.4.0, ui 0.6.0, create-app 0.4.0, audit 0.1.0, mcp 0.3.1.

## Open

- The plain theme's "Limited" status pill measures 4.2:1 in the audit (an SDK warning); not a docs gap, listed for the harness team.
