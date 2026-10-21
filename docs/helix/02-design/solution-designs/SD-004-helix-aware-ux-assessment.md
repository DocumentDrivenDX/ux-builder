---
ddx:
  id: SD-004
  type: solution-design
  status: draft
  links:
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: ADR-026
    - kind: informed_by
      to: CONTRACT-006
    - kind: informed_by
      to: CONTRACT-004
---

# SD-004: HELIX-aware UX assessment

## Scope

FEAT-009 increment 1 in detail: the manifest, HELIX binding, traceability,
baseline, the skill's first stages, and same-state inspection with its
three-checkpoint proof, including the replay adapter (all built
2026-10-20). Increments 2 and 3 (journey plans, walkthrough records,
coverage, backlog, proposals, report, comparison, the CI gate and the MCP
wrappers) were built 2026-10-21 (implementation plan B-007 to B-012, and
B-017 for the alignment fixes); "Increments 2 and 3" below records how.

## Components

| Component | Files | Role |
|---|---|---|
| Inspection core | `packages/audit/inspect.mjs` | `inspect(page, options)`: the per-state checks moved out of `audit()`; `attach({ cdp, page })` |
| URL audit | `packages/audit/audit.mjs` | Unchanged API; per URL × width × theme × appearance it switches state, then calls `inspect()` with state-affecting checks on |
| Serve helper | `packages/audit/serve.mjs` | The `--serve` logic from `cli.mjs`, shared with `assess baseline` |
| Manifest | `packages/audit/assess/manifest.mjs`, `schema/assessment-manifest.schema.json` | Load YAML, validate (schema, secrets, repository) |
| HELIX binding | `packages/audit/assess/helix.mjs` | Marker discovery and refusal, flow resolution, catalogue binding, instance classification |
| Collect | `packages/audit/assess/collect.mjs` | `requirements.json`, `traceability.json`, `run.json` |
| Baseline | `packages/audit/assess/baseline.mjs` | Run tests and the audit; parse runner reports; mask logs |
| Init | `packages/audit/assess/init.mjs` | Propose a manifest |
| Browser and checkpoints | `packages/audit/assess/checkpoint.mjs` | Start Chromium with a CDP endpoint (`browser`); attach, replay, and inspect a checkpoint (`inspect`), with the manifest's restrictions, capture and limits |
| Plan and merge | `packages/audit/assess/plan.mjs` | `plan.json`, the starting `coverage.json`, stable finding IDs, `merge` |
| Proposals | `packages/audit/assess/proposals.mjs` | `propose` (patches and the `improvement-backlog` proposal), `check-writes`, `apply-check` |
| Report | `packages/audit/assess/report.mjs` | `report` (Markdown, HTML, `evidence.json`), `compare`, `gate` |
| Report check | `packages/audit/assess/validate-report.mjs`, `schema/*.schema.json` | Validate a run package |
| Command | `packages/audit/cli.mjs` | Dispatch `assess <subcommand>` |
| Skill | `packages/audit/skill/ux-builder-assess/SKILL.md` | Stages, commands, labelling, safety |
| MCP version fix and wrappers | `packages/mcp/server.mjs` | Read the cwd app's `@ux-builder/ui` catalogue first (FEAT-009 AGW-04); with the app's `@ux-builder/audit`, the tools `get_assessment_skill`, `validate_assessment_manifest`, `validate_assessment_report` (CONTRACT-004 "UX assessment") |
| Pilot manifest | `apps/theme-builder/ux-assessment.yml` | The theme builder's manifest |

New runtime dependencies of `@ux-builder/audit`: `yaml` (ISC) and `ajv`
(MIT), both covered by the licence check.

## Inspection

`inspect(page, o)`:

1. Snapshot the state: URL, scroll position, the focused element's path,
   viewport, and the `data-theme`/`data-appearance` attributes.
2. Run the non-mutating checks in the page: `collect.js` (tokens, fonts,
   radii, overrides, widgets, foreign UI, outside theme, brand), the layout
   checks `reflow` and `target-size` (when `o.layout`, which `audit()` sets
   with `widths`), the interaction checks of FEAT-008 except the Escape
   test, and axe's contrast.
3. If `o.stateAffecting`: `focus-obscured` (moves focus) and the Escape
   test (closes dialogs), then restore URL (only if it changed, by
   `history` where possible), scroll, focus and theme, and compare with the
   snapshot. A dialog the Escape test closed cannot be reopened, so the
   inspection reports `restored: false` and names it.
4. Screenshot (viewport, no scrolling) and accessibility tree
   (`locator("body").ariaSnapshot()`), masked per `o.redact` before writing.
5. Return `{ findings, skipped, stateAffecting, screenshot, tree, marked }`.

`audit()` keeps its loop: open page, wait, per width resize, per theme and
appearance `switchTo`, then `inspect(page, { layout: !!widths, stateAffecting: true })`.
Its merging, numbering, overlay screenshots, baseline and report stay
where they are. The existing audit suite is the regression gate: it must
pass unchanged.

### Sharing the agent's browser

```text
assess browser ──launch──▶ Chromium (--remote-debugging-port)
                              ▲                     ▲
agent's driver ──CDP──────────┘                     │
(Playwright MCP --cdp-endpoint)                     │
assess inspect --cdp ──connectOverCDP──▶ page whose URL matches --page
```

The `assess browser` process owns the browser and closes it on exit.
`attach()` connects, finds exactly one page, and `detach()` disconnects
without closing pages or contexts it did not create. The replay adapter
(`inspect --replay`, built with increment 1) owns its own browser, replays
recorded steps, and asserts the expected state (a selector and text) before
calling `inspect()`.

### The state proof (INS-06)

A fixture app in `packages/audit/test/fixtures/assess-app/` (a few static
pages and a tiny server): a sign-in that sets a session cookie, a page that
opens a modal dialog, and a form whose server-side validation returns the
form with valid values kept and an error tied to the invalid field. The
test drives it from a second Playwright client over CDP, as an agent's
driver would, inspects each checkpoint with `assess inspect --cdp`, and
then completes the task from the same state.

## HELIX binding

| Step | Implementation |
|---|---|
| Marker | Walk up from the manifest's directory to the git root; parse with `yaml`; apply HELIX's refusals (parse error, root outside repo, duplicate flow, unknown `defaults.flow`, missing root) |
| Flow | `helix.flow` → `defaults.flow` → the only flow → stop listing them |
| Catalogue | `helix.catalog` path; or `auto`: the marker's `graph:`/`catalog:`, then `<repo>/workflows/graph.yml`, then a project-installed HELIX skill (`.claude/skills/helix/references/`, next to the marker, then at the repository root; recorded `project-skill`), then `$CLAUDE_PLUGIN_ROOT/workflows`, then `~/.ddx/plugins/helix/workflows`, then `~/.claude/plugins/**/helix/workflows`; without a catalogue, classification falls back to `ddx.type` only and the run records `catalog: none` |
| Types | Each `activities/*/artifacts/*/meta.yml`: `artifact.id`, `output.location`, `output.naming`, `id_format.pattern`; the location's `docs/helix/` read as the flow's root |
| Instances | Markdown under the root, after `include`/`exclude`; frontmatter parsed with `yaml`; `typedBy` recorded |
| Criteria | `US-<n>-AC<m>` at a list item's start; text to the end of the item |
| Citations | `@covers US-<n>-AC<m>` in test files under `run.cwd` (and the repository when the app is in a workspace), skipping `node_modules` and build output |
| Revisions | `git log -1 --format=%H -- <path>` and a SHA-256 of the content |

## Baseline

Each `tests[]` command runs with the manifest's `run.cwd`, its
`timeoutMinutes` (else `limits.journeyMinutes`, else 15) as a timeout, and an environment with no extra secrets. Counts come
from the declared report (`junit`, Playwright JSON, node TAP); otherwise
`unknown`. Logs are written masked: values of every `auth.env` variable and
the secret patterns. The audit runs through `audit()` with the manifest's
`audit` options, serving with `run.start` via `serve.mjs`. Findings whose
only cause is the absence of the SDK (`theme-applied` with no theme CSS,
`sdk-widgets`, `foreign-components`, `brand`) are counted as `sdk-adoption`.

## Increments 2 and 3 *[Added 2026-10-21]*

- **Plan and coverage.** `plan` writes each journey's plan and a
  `coverage.json` holding every journey × state pair. A role whose
  `auth.env` is unset is an authentication barrier: its journeys' pairs
  start `blocked`, and the `plan` stage is `partial`.
- **Restrictions at the browser.** `browser --manifest` maps every host to
  `~NOTFOUND` except the `run.origins` hosts that
  `restrictions.excludeIntegrations` does not name. `inspect` refuses a page
  outside the origins or on an excluded integration. A replay checks every
  recorded step before taking any (a denied or unpermitted `action`, a
  `goto` off the origins or to an excluded integration: nothing is taken)
  and aborts requests to such hosts while it runs. Each refusal is
  `blocked: restricted`.
- **Limits.** With the manifest, `inspect` checks `limits` before it takes a
  step: minutes since `run.json`'s `startedAt` (`runMinutes`), steps
  recorded so far in the run's inspections (`steps`), and minutes since the
  journey's first checkpoint (`journeyMinutes`). A step past a limit is not
  taken; it is recorded `blocked: limit` and the `walkthrough` stage
  `partial`. `browser --run` stops the browser when `runMinutes` are spent.
  An `inspect --cdp` that finds no browser records the `walkthrough` stage
  `blocked`.
- **Capture.** `evidence.capture` decides whether `inspect` writes the
  screenshot, the tree or both.
- **Proposals.** `propose` writes a patch per proposal and rewrites
  `proposals/improvement-backlog.patch`: the backlog's findings as rows of
  the app's `improvement-backlog` (an existing instance, or one drafted from
  the type's template at its `output.location`).
- **Report and runs.** `report` writes the readable report and
  `evidence.json` (`schema/evidence.schema.json`); `compare` classifies
  findings and carries the earlier baseline's failures into
  `comparison.json`; `gate` fails on an `open` or `accepted` finding at the
  level, or a blocked stage.

## Testing

| Layer | Covers | Where |
|---|---|---|
| Contract | US-056-AC1–AC4 | `packages/audit/test/assess-manifest.test.mjs`, `assess-helix.test.mjs` with repository fixtures |
| Integration | US-058-AC1–AC4 | `packages/audit/test/assess-collect.test.mjs` over fixture HELIX trees |
| Command | US-059-AC1–AC4 | `packages/audit/test/assess-baseline.test.mjs` |
| Browser (Chromium) | US-062-AC1–AC6 | `packages/audit/test/inspect.test.mjs`, `inspect-cdp.test.mjs` |
| Regression | INS-02 | the existing `audit.test.mjs`, `patterns.test.mjs`, `interaction.test.mjs`, unchanged |
| Skill and MCP | US-057-AC1–AC4 | `packages/audit/test/assess-skill.test.mjs`; `packages/mcp/test/server.test.mjs` |
| Walkthroughs and restrictions (Chromium) | US-060-AC1–AC5 | `packages/audit/test/assess-walkthrough.test.mjs` |
| Coverage | US-061-AC1–AC4 | `packages/audit/test/assess-coverage.test.mjs` |
| Backlog | US-063 | `packages/audit/test/assess-backlog.test.mjs` |
| Proposals | US-064-AC1–AC4 | `packages/audit/test/assess-proposals.test.mjs` |
| Runs | US-065-AC1–AC4 | `packages/audit/test/assess-runs.test.mjs` |
| Pilot | the P1-7 sketch | `apps/theme-builder/test/assessment.test.mjs`: validate and collect the pilot manifest against this repository |

## Sequence

1. `inspect()` and `audit()` on it; the existing suite green (INS-01, INS-02).
2. `attach()`, `assess browser`, `assess inspect`; the fixture app and the three-checkpoint proof (INS-03 to INS-06).
3. Manifest schema, `validate`, `init`, HELIX binding (CTX, HLX).
4. `collect` (TRC) and the pilot manifest.
5. `baseline` (BAS).
6. The skill, the MCP version fix (AGW), README, changeset.
7. Increments 2 and 3: plan and coverage, walkthrough records and the
   browser's restrictions, backlog and merge, proposals, report, comparison
   and gate, the MCP wrappers (B-007 to B-012).
8. The alignment fixes of AR-2026-10-21 (B-017).

Inspection comes first because it is the brief's central risk (§5) and it
refactors code every later step shares.
