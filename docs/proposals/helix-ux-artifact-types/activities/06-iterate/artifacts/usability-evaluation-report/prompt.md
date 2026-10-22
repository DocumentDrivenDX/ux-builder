# Usability Evaluation Report Generation Prompt

Report one usability evaluation so another team could judge what was checked,
trust what was found, and act on it.

## Purpose

Usability Evaluation Report is the **iteration evidence artifact for user
experience**. Its unique job is to record one evaluation run: product, goals,
method, participants or evaluators, tasks, measures and findings, with each
finding tied to a journey, a rule, evidence, a severity, a fix, an owner and
the acceptance criteria it affects.

It is not the improvement backlog. The report states what was observed; the
backlog ranks what to do next across all sources. It is not a test plan: test
plans state the verification intent before build; the report records what an
evaluation of the built product or prototype showed.

## Reference Anchors

- `docs/resources/iso-25062-cif.md` grounds the Common Industry Format (CIF)
  structure from ISO/IEC 25062, the international standard for reporting
  usability evaluations: product, goals, participants and method, tasks,
  measures and results. NISTIR 7742 gives a customised CIF template.
- `docs/resources/nng-severity-ratings.md` grounds the 0-4 severity scale and
  its factors: frequency, impact, persistence and market impact.

## Focus

- Create `docs/helix/06-iterate/usability-evaluations/UER-XXX-[name].md`, one
  per run. Put evidence under `assets/UER-XXX/`.
- Name the approach (moderated, unmoderated, expert/heuristic review,
  automated assessment or mixed) and its limits. Report only measures the
  approach produces: an expert review has no task success rate.
- Describe participants by persona match and expertise only; never include
  names or personal data.
- Map every task to a journey and its `US-<n>-AC<m>` IDs.
- Group findings by journey, then by step or screen. Put global findings
  under "Cross-journey". One finding per user problem; merge duplicates and
  keep every evidence reference.
- For every finding, cite the rule broken: its ID, its statement quoted in
  full or paraphrased, and its source (WCAG success criterion, heuristic,
  DESIGN.md rule, SDK rule). Do not cite a rule you have not read.
- Rate severity 0-4 and show the frequency, impact and persistence behind it.
  Give findings rated 2 or higher a fix and one owner.
- Fill the state coverage matrix honestly: an unassessed journey x state pair
  is `not-assessed`, never a pass.
- Report design-system conformance (tokens, components, interaction-state
  conventions from DESIGN.md) and modality fit (whether the UI and AI
  components and the guideline sets suit how the app is used).
- Route each recommendation to the improvement backlog or the governing
  artifact it would change (by `ddx.id`).
- When re-evaluating, name the previous UER and mark each finding new,
  persistent, resolved or regressed. An unassessed state never resolves a
  finding.
- When generated from ux-builder: a `ux-builder-audit assess` run supplies
  the method, journeys and tasks (plan), coverage matrix, merged findings with
  stable F- IDs and evidence, proposals and the comparison with an earlier
  run. Map its priorities to the 0-4 scale and state the mapping.

## Boundary Test

| If you are writing... | Put it in... |
|---|---|
| What one evaluation observed, rated and recommended | Usability Evaluation Report |
| Ranking of follow-up work across all learnings | Improvement Backlog |
| Verification intent per AC before build | Story Test Plan |
| Product metrics over time | Metrics Dashboard |
| A changed requirement or design | The governing artifact (US, SF, WF, ISD, DESIGN.md) |

## Completion Criteria

- CIF core sections present; approach and limits named.
- Findings grouped by journey; each has rule, evidence, severity, fix, owner and ACs.
- State coverage marks every pair assessed, not-assessed or n/a.
- Design-system conformance and modality fit reported.
- Recommendations routed.
