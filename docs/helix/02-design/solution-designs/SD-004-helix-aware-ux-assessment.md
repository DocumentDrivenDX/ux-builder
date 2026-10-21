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
three-checkpoint proof. Increments 2 and 3 (walkthrough synthesis, coverage,
backlog, proposals, comparison) are outlined so the formats hold, and built
later.

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
| Browser | `packages/audit/assess/browser.mjs` | Start Chromium with a CDP endpoint |
| Report check | `packages/audit/assess/validate-report.mjs`, `schema/*.schema.json` | Validate a run package |
| Command | `packages/audit/cli.mjs` | Dispatch `assess <subcommand>` |
| Skill | `packages/audit/skill/ux-builder-assess/SKILL.md` | Stages, commands, labelling, safety |
| MCP version fix | `packages/mcp/server.mjs` | Read the cwd app's `@ux-builder/ui` catalogue first (FEAT-009 AGW-04) |
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
(increment 2) owns its own browser, replays recorded steps, and asserts the
expected state (a selector and text, or an accessibility-tree fragment)
before calling `inspect()`.

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
| Catalogue | `helix.catalog` path; or `auto`: the marker's `graph:`/`catalog:`, then `<repo>/workflows/graph.yml`, then `$CLAUDE_PLUGIN_ROOT/workflows`, then `~/.ddx/plugins/helix/workflows`, then `~/.claude/plugins/**/helix/workflows`; without a catalogue, classification falls back to `ddx.type` only and the run records `catalog: none` |
| Types | Each `activities/*/artifacts/*/meta.yml`: `artifact.id`, `output.location`, `output.naming`, `id_format.pattern`; the location's `docs/helix/` read as the flow's root |
| Instances | Markdown under the root, after `include`/`exclude`; frontmatter parsed with `yaml`; `typedBy` recorded |
| Criteria | `US-<n>-AC<m>` at a list item's start; text to the end of the item |
| Citations | `@covers US-<n>-AC<m>` in test files under `run.cwd` (and the repository when the app is in a workspace), skipping `node_modules` and build output |
| Revisions | `git log -1 --format=%H -- <path>` and a SHA-256 of the content |

## Baseline

Each `tests[]` command runs with the manifest's `run.cwd`, the journey
limits as a timeout, and an environment with no extra secrets. Counts come
from the declared report (`junit`, Playwright JSON, node TAP); otherwise
`unknown`. Logs are written masked: values of every `auth.env` variable and
the secret patterns. The audit runs through `audit()` with the manifest's
`audit` options, serving with `run.start` via `serve.mjs`. Findings whose
only cause is the absence of the SDK (`theme-applied` with no theme CSS,
`sdk-widgets`, `foreign-components`, `brand`) are counted as `sdk-adoption`.

## Testing

| Layer | Covers | Where |
|---|---|---|
| Contract | US-056-AC1–AC4 | `packages/audit/test/assess-manifest.test.mjs`, `assess-helix.test.mjs` with repository fixtures |
| Integration | US-058-AC1–AC4 | `packages/audit/test/assess-collect.test.mjs` over fixture HELIX trees |
| Command | US-059-AC1–AC4 | `packages/audit/test/assess-baseline.test.mjs` |
| Browser (Chromium) | US-062-AC1–AC6 | `packages/audit/test/inspect.test.mjs`, `inspect-cdp.test.mjs` |
| Regression | INS-02 | the existing `audit.test.mjs`, `patterns.test.mjs`, `interaction.test.mjs`, unchanged |
| Skill and MCP | US-057-AC1–AC4 | `packages/audit/test/assess-skill.test.mjs`; `packages/mcp/test/server.test.mjs` |
| Pilot | the P1-7 sketch | `apps/theme-builder/test/assessment.test.mjs`: validate and collect the pilot manifest against this repository |

## Sequence

1. `inspect()` and `audit()` on it; the existing suite green (INS-01, INS-02).
2. `attach()`, `assess browser`, `assess inspect`; the fixture app and the three-checkpoint proof (INS-03 to INS-06).
3. Manifest schema, `validate`, `init`, HELIX binding (CTX, HLX).
4. `collect` (TRC) and the pilot manifest.
5. `baseline` (BAS).
6. The skill, the MCP version fix (AGW), README, changeset.

Inspection comes first because it is the brief's central risk (§5) and it
refactors code every later step shares.
