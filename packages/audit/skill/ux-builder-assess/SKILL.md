---
name: ux-builder-assess
description: Assess a HELIX-governed app's UX with @ux-builder/audit — trace its journeys to its HELIX stories and tests, record a baseline, walk the journeys and inspect each screen state in place, and propose evidence-backed changes without editing code or governing documents. Use when asked to assess, review or audit an app's UX, usability or journeys, or to plan moving a prototype toward version one.
---

# Assessing an app's UX with ux-builder

You do the reasoning; `ux-builder-audit assess` does the deterministic work.
Keep the two apart in everything you write (FEAT-009, ADR-026, CONTRACT-006).

When the person asks for an "audit" or a "UX check" without saying which,
ask first whether they want the **UI audit** (`npm run audit`: the running
app in every theme and appearance against the interaction and AI rules,
contrast and anything off-theme; quick), the **usability assessment** (this
skill: journeys walked against the HELIX stories, each screen state
inspected, heuristics, task measures and proposals; longer), or **both**,
explaining each in a sentence. Run only what they choose.

## Rules

1. **Report only.** Never change the app's code or anything under its HELIX
   root. Write only under the manifest's output path. Proposals are patches
   for a person to accept, applied later through HELIX.
2. **HELIX is the intent.** Journeys come from the stories the manifest names.
   Read documents through `collect`'s output, which found them the way HELIX
   does (marker, flow, catalogue, `ddx:` frontmatter). Never invent a story,
   criterion or HELIX ID; your own IDs start `R-`, `J-`, `S-`, `C-`, `F-`, `P-`.
   A document read by its location (`untyped`) or with a type corrected
   (`type-corrected`, such as `user-story` read as `user-stories`) was read:
   nothing is missing, and no HELIX edit is needed to go on. Never give the
   person a command to edit their HELIX documents or guess a HELIX field;
   propose a change as a patch, or point them to the `helix` skill.
3. **No false passes.** A stage you could not run is `blocked` or `partial`
   with its reason. A state you did not reach is `not assessed`. A clean audit
   is not proof of usability or of full accessibility compliance, and passing
   tests do not show usability criteria are met.
4. **Label every conclusion.** `deterministic` (a command's check), `observed`
   (what you saw in the browser), `heuristic` (a UX principle, not a story),
   `sdk-adoption` (only means "not yet on the SDK"), `real-user` (evidence from
   people). Confusion, trust and time saved need representative users: list
   them, never claim them.
5. **Stay safe.** Local or staging only; stay within `run.origins`; never call
   an integration in `restrictions.excludeIntegrations`; never take a denied
   action (payments, outbound messages, production approvals, deleting real
   data; no manifest can allow one); take a data-changing action only if
   `restrictions.allow` lists it; reset fixtures between scenarios; never
   write a secret, and mask what the manifest says to mask. A step you do not
   take for these reasons is `blocked` with the reason `restricted: …`.
6. **Stay within the limits.** The manifest's `limits` (defaults: 60
   `runMinutes` for the run from `run.json`'s `startedAt`, 200 `steps` —
   checkpoints you inspect plus actions a replay takes — and 15
   `journeyMinutes` per journey from its first checkpoint) bound the whole
   assessment. `inspect` refuses a step past a limit (`blocked: limit`) and
   `browser --run` stops when the run's time is spent; both record the
   `walkthrough` stage `partial`. Do not work around them: record what is
   left as `not-assessed` with the limit as its reason, and report.
7. **Never approve.** An AI's request for approval (`data-piq-ai="approval"`)
   is answered with Deny (`data-piq-ai-control="deny"`), never with its
   approve control (`data-piq-ai-control="approve"`), in every scenario, as
   a denied action is never taken: no manifest can allow it. `inspect`
   refuses a replay step that would activate an approve control
   (`blocked: restricted`). If the risky step is reached with no approval on
   screen, do not take it.

## AI journeys

A manifest journey with `ai: true` is an AI journey (FEAT-011). It declares
three scenarios, and `validate` reports each one missing:

    scenarios:
      normal:     { description: "the task as intended", inputs: "…" }
      errorProne: { description: "an ambiguous or failing request", inputs: "…" }
      risky:      { description: "a step with a high-impact action", step: 4 }

`plan` gives the journey an `ai` rubric (the catalogue's AI rules for its
roles: the blueprint screens' `ai.roles` when the journey comes from the
blueprint, else every AI role; `review` heuristics included) and three
`walkthroughs`, one per scenario. Walk each one, resetting the fixture
between them, and inspect each with `--scenario`:

- **normal**: walk and inspect as for any journey.
- **errorProne**: at the error, `inspect --scenario errorProne` records
  whether the error is shown in place and whether the user can recover
  without restarting (`agent.recover`, `ai.improve-request`). If there is no
  safe way to make the agent err (no fixture or mock), record the scenario
  `blocked` with the reason; never skip it silently.
- **risky**: walk up to `risky.step`, the high-impact step. At the approval,
  record it, choose Deny, and stop: take nothing more. With a replay,
  `inspect --replay steps.json --scenario risky` does this for you (mark the
  high-impact step `"highImpact": true`, or give `--high-impact-step n`; the
  journey's numeric `risky.step` is the default with `--journey`). With no
  approval before that step, it stops before the step and records a P1
  `agent.approve-high-impact`; walking in place, do the same yourself.

Every finding of an AI journey names the AI rule or heuristic it is about
(`rule`, one of the plan's `ai.heuristics`); `validate-report` refuses one
that does not.

## Blueprint journeys

A manifest journey may name a journey of the app's blueprint
(`docs/ux-builder/blueprint/app.blueprint.json` beside the manifest, or `app.blueprint.json` in an app on the old
layout, or the manifest's `blueprint`
path) instead of restating it: `{ blueprint: J-review, role: reviewer, priority: critical }`.
Its story, criteria, entry screen and steps come from the blueprint; giving
`story`, `criteria` or `entry` as well is refused. `plan` lists its steps,
and each alternate as a walkthrough of one journey-and-state pair (`pair`,
with its `state`): walk the alternates too. Its `entry` is a screen
(`entryKind: screen`); reach it through the app's navigation from
`run.baseUrl`.

## Replayable steps and plain English

A run can be replayed as a video for the app's product or technical leader
(`assess video`, FEAT-013). For that, record two things as you go:

- **`do` on every walkthrough step**: the browser action you took, in the
  `--replay` format. Map your driver's actions (Playwright MCP shown):

  | You did | Record |
  |---|---|
  | `browser_navigate` | `{ "goto": "/queue" }` (a path within `run.origins`) |
  | `browser_click` | `{ "click": "role=button[name='Approve']" }` |
  | `browser_type`, `browser_fill_form` | `{ "fill": "role=textbox[name='Note']", "value": "Looks fine" }` |
  | `browser_press_key` | `{ "press": "Escape" }` |
  | `browser_wait_for` | `{ "waitFor": "text=Approved" }` |

  Prefer role-and-name selectors, then labels, then stable IDs; never an
  index into a list that changes. Give a step that changes data its
  `action` class (`create-test-data`, …). A password or any value the
  manifest treats as secret is `{ "value": { "secret": "ENV_NAME" } }`,
  never the literal. Steps of a blueprint alternate carry `alternate: <n>`
  (`plan.json`'s `alternates[].n`) and start with their own `goto`.
- **`plain` on every finding**: `{ "problem": "…", "recommendation": "…" }`,
  one or two short sentences each, in the words a product leader would use
  about their users. No rule ID, token or component name there: "Approve and
  Reject look equally important, so it is easy to reject by mistake" and
  "Make Approve the one main action, and confirm before Reject". Keep the
  specifics (the rule, `component_mapping`, the proposal) in their own
  fields, where the report shows them. Add `elements`, the selectors of what
  the finding is about, so the video can outline them.

## Stages

Run them in this order. Each command writes under `<out>/<run>/` (default
`docs/ux-builder/assessments/R-<time>/`); pass the same `--run` to every command of one
assessment.

1. **Context.** `npx ux-builder-audit doctor` first: if it says the installed
   `@ux-builder` packages are incoherent (exit 1), install versions that agree
   before assessing. Then `npx ux-builder-audit assess validate`. If there is no
   manifest, `npx ux-builder-audit assess init` proposes one; ask the owner to
   fill its placeholders. Stop on any problem.
2. **Traceability.** `npx ux-builder-audit assess collect --run <R-id>`, then
   read `requirements.json` and `traceability.json`. Add `inferred` links only
   with a reason. Run HELIX's alignment review on the flow (the `helix` skill,
   `align`) and record its result in `alignment.json`:
   `{ "schema": "alignment", "version": 1, "source": "<report or command>", "conflicts": [{ "ids": ["US-…"], "detail": "…" }] }`.
   Conclusions that depend on a conflicting ID are qualified, not dropped.
3. **Baseline.** `npx ux-builder-audit assess baseline --run <R-id>` runs the
   declared tests and the audit before any change. Read `baseline.json`; keep
   its failures visible in everything after.
4. **Plan.** `npx ux-builder-audit assess plan --run <R-id> --agent <you> --model <id>`
   writes `plan.json` (each journey's goal, criteria, expected outcomes and the
   E2E tests to reuse) and a `coverage.json` with every journey × state pair:
   not-assessed or not-applicable until you record it.
5. **Walk and inspect.** `npx ux-builder-audit assess browser --manifest docs/ux-builder/ux-assessment.yml --run <R-id>`
   prints a CDP endpoint, refuses every host outside `run.origins` and every
   excluded integration, and stops when `limits.runMinutes` are spent; connect your browser driver to it (Playwright MCP:
   `--cdp-endpoint <url>`). Walk the journey from its entry route. At each
   significant step, inspect the state you reached without reloading it:

       npx ux-builder-audit assess inspect --cdp <url> --page <url-part> \
         --checkpoint C-<journey>-<n> --journey J-<id> --step <n> --role <id> \
         --state <class> --run <R-id> --manifest docs/ux-builder/ux-assessment.yml

   Run `assess reset --fixture <id>` before each scenario. Record every step in
   `walkthrough.json` (action, URL, checkpoint, observation with its basis;
   your judgment apart; and `do`, the replay step: see *Replayable steps and
   plain English*). Look at the screenshot and accessibility tree yourself; do not judge visual
   quality from DOM text. Induce failures only with the manifest's fixtures or
   mocks. If your driver cannot share its browser, use `--replay <steps.json>`;
   give a step that changes data its `action` (such as `create-test-data`),
   and `inspect` refuses the replay if any step is denied, not allowed, or
   leaves the origins. A replay that does not reach the expected state is
   not evidence. `inspect` writes the screenshot, the tree or both, as
   `evidence.capture` says; a `visual` observation needs a screenshot.
6. **Findings and coverage.** Update `coverage.json` for every pair you walked
   (status, reason, outcome, evidence). Write `backlog.json`: one finding per
   user problem (give it a `key`), ranked P0–P3 with confidence and effort
   apart, components named from the app's installed `@ux-builder/ui`
   catalogue, heuristics as "Proposed criterion: …", `plain` (the problem and
   recommendation in plain English) and `elements`, and `user_validation` for
   claims only people can confirm. Every finding names what it breaks: `rule`,
   a catalogue rule ID (`modal.dismiss`; the report spells out its statement
   and sources), or `heuristic`, `{ "name": "Visibility of system status",
   "source": "Nielsen Norman Group: 10 Usability Heuristics" }`;
   `validate-report` fails one that names neither. Give `step` when its
   evidence cites no step's checkpoint, and `severity` (Nielsen's 0 to 4) when
   it differs from what its priority implies (P0 4, P1 3, P2 2, P3 1). Then
   `assess merge --run <R-id>` gives each a stable ID and merges duplicates.
   Give each step its `screen` and `at` (when you took it), and mark
   `failed: true`, `notFound: "<what you looked for>"` or `error: "<what the
   screen said>"` where they happened: the task metrics come from them. A
   finding you did not find yourself carries `source` (`human`, or
   `design-team` for notes from people trying a prototype, never user
   evidence).
   **Heuristic pass.** `assess heuristics <out>/<run>` lists every walked
   screen × heuristic (Nielsen's ten, error prevention and recovery,
   information hierarchy, navigation complexity). Check each, and record it:
   `--screen <id> --heuristic <id> --finding <F-id>` or `--no-finding`.
   `assess hierarchy --page <file>` checks a screen's content order against
   its `screens[].content`. The same pass runs on an exploratory prototype
   (`docs/ux-builder/prototypes/<name>/`): serve it and inspect its pages like the app's; each
   names its screen with `data-piq-screen`.
   **Task metrics.** `assess metrics <out>/<run>` writes `metrics.json`. Every
   number is agent-measured; never present it as how people will do.
7. **Proposals.** For each finding worth a HELIX change:
   `assess propose --run <R-id> --finding <F-id> --target <US-…>` (or
   `--new user-stories --title …`) `--kind unmet-criterion|new-requirement|scope
   --criterion "Given …" --test "…"`. It writes a patch in `proposals/`, and
   rewrites `proposals/improvement-backlog.patch`, the backlog proposed as an
   entry in the app's HELIX `improvement-backlog`; nothing is applied.
   `assess check-writes --run <R-id>` must report no change.
8. **Report and check.** `assess report <out>/<run>`, then
   `assess validate-report <out>/<run>`; fix what it reports. The report reads
   by journey, then state, then step, each finding with its rule (or
   heuristic), evidence, severity and fix; a finding at no step is under its
   state's *General*. `report.md` is a HELIX usability-evaluation-report
   (`ddx:` frontmatter); propose it to the flow rather than copying it there. To compare with
   an earlier run: `assess compare <earlier> <later>`; `comparison.json`
   keeps the earlier baseline's failures, so name them in what you hand over. In CI:
   `assess gate <run> --fail-on P1` (see `examples/ux-assessment.workflow.yml`).
9. **Video.** `assess video --run <R-id> --manifest docs/ux-builder/ux-assessment.yml`
   replays each walked journey and writes `video/`: an MP4 per journey (with
   `ffmpeg` on the PATH) and `video/index.html`, a player whose findings pop
   up. A step holds 2 s and a finding's caption (its problem, rule and fix) as
   long as it takes to read; `--pace slow` (× 1.5) or `--pace fast` (× 0.6)
   for an audience that needs it. Then `assess report` again, so the report
   links each finding to its moment, and `assess validate-report`. A chapter that stopped means a step
   no longer replays: say which, rather than walking it again silently.

When the run is reported, point the person at one page:
`docs/ux-builder/reports.html` (`npx ux-builder-audit reports --open`). It
links this run's report, every earlier run and the latest UI audit, and says
which is which.

## Ranking (FND-04)

- **P0** blocks a critical task, loses data, or allows a consequential action without its control.
- **P1** major friction or failed recovery in an important journey, or a serious access barrier with a limited workaround.
- **P2** a material clarity, efficiency or consistency problem with a workaround.
- **P3** polish.

Within a band: journey importance and breadth, then effort and dependencies.
A low-confidence P0 or P1 concern is validation work: neither downgrade it
nor state it as proven harm. Unknown usage stays `unknown`.

## Without the MCP server

Everything above works without `@ux-builder/mcp`. The SDK guidance is
`node_modules/@ux-builder/ui/AGENTS.md` and the catalogue
`node_modules/@ux-builder/ui/catalogue.json` in the app; quote the version
`run.json` records (`versions.ui`), which is the app's installed one.
