---
name: ux-builder-assess
description: Assess a HELIX-governed app's UX with @ux-builder/audit — trace its journeys to its HELIX stories and tests, record a baseline, walk the journeys and inspect each screen state in place, and propose evidence-backed changes without editing code or governing documents. Use when asked to assess, review or audit an app's UX, usability or journeys, or to plan moving a prototype toward version one.
---

# Assessing an app's UX with ux-builder

You do the reasoning; `ux-builder-audit assess` does the deterministic work.
Keep the two apart in everything you write (FEAT-009, ADR-026, CONTRACT-006).

## Rules

1. **Report only.** Never change the app's code or anything under its HELIX
   root. Write only under the manifest's output path. Proposals are patches
   for a person to accept, applied later through HELIX.
2. **HELIX is the intent.** Journeys come from the stories the manifest names.
   Read documents through `collect`'s output, which found them the way HELIX
   does (marker, flow, catalogue, `ddx:` frontmatter). Never invent a story,
   criterion or HELIX ID; your own IDs start `R-`, `J-`, `S-`, `C-`, `F-`, `P-`.
3. **No false passes.** A stage you could not run is `blocked` or `partial`
   with its reason. A state you did not reach is `not assessed`. A clean audit
   is not proof of usability or of full accessibility compliance, and passing
   tests do not show usability criteria are met.
4. **Label every conclusion.** `deterministic` (a command's check), `observed`
   (what you saw in the browser), `heuristic` (a UX principle, not a story),
   `sdk-adoption` (only means "not yet on the SDK"), `real-user` (evidence from
   people). Confusion, trust and time saved need representative users: list
   them, never claim them.
5. **Stay safe.** Local or staging only; stay within `run.origins`; never take
   a denied action (payments, outbound messages, production approvals,
   deleting real data); reset fixtures between scenarios; never write a
   secret, and mask what the manifest says to mask.

## Stages

Run them in this order. Each command writes under `<out>/<run>/` (default
`ux-assessment/R-<time>/`); pass the same `--run` to every command of one
assessment.

1. **Context.** `npx ux-builder-audit assess validate`. If there is no
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
5. **Walk and inspect.** `npx ux-builder-audit assess browser --manifest ux-assessment.yml`
   prints a CDP endpoint, and refuses every host outside `run.origins`; connect your browser driver to it (Playwright MCP:
   `--cdp-endpoint <url>`). Walk the journey from its entry route. At each
   significant step, inspect the state you reached without reloading it:

       npx ux-builder-audit assess inspect --cdp <url> --page <url-part> \
         --checkpoint C-<journey>-<n> --journey J-<id> --step <n> --role <id> \
         --state <class> --run <R-id> --manifest ux-assessment.yml

   Run `assess reset --fixture <id>` before each scenario. Record every step in
   `walkthrough.json` (action, URL, checkpoint, observation with its basis;
   your judgment apart). Look at the screenshot and accessibility tree yourself; do not judge visual
   quality from DOM text. Induce failures only with the manifest's fixtures or
   mocks. If your driver cannot share its browser, use `--replay <steps.json>`;
   a replay that does not reach the expected state is not evidence.
6. **Findings and coverage.** Update `coverage.json` for every pair you walked
   (status, reason, outcome, evidence). Write `backlog.json`: one finding per
   user problem (give it a `key`), ranked P0–P3 with confidence and effort
   apart, components named from the app's installed `@ux-builder/ui`
   catalogue, heuristics as "Proposed criterion: …", and `user_validation` for
   claims only people can confirm. Then `assess merge --run <R-id>` gives each
   a stable ID and merges duplicates.
7. **Proposals.** For each finding worth a HELIX change:
   `assess propose --run <R-id> --finding <F-id> --target <US-…>` (or
   `--new user-stories --title …`) `--kind unmet-criterion|new-requirement|scope
   --criterion "Given …" --test "…"`. It writes a patch in `proposals/`; nothing is applied.
   `assess check-writes --run <R-id>` must report no change.
8. **Report and check.** `assess report <out>/<run>`, then
   `assess validate-report <out>/<run>`; fix what it reports. To compare with
   an earlier run: `assess compare <earlier> <later>`. In CI:
   `assess gate <run> --fail-on P1` (see `examples/ux-assessment.workflow.yml`).

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
