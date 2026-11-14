---
ddx:
  id: FEAT-015
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-008
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: FEAT-012
    - kind: informed_by
      to: FEAT-013
    - kind: informed_by
      to: FEAT-014
    - kind: informed_by
      to: ADR-033
---

# Feature Specification: FEAT-015 — Findings by journey, with every rule spelled out

**Feature ID**: FEAT-015
**Status**: Draft (2026-10-21, with ADR-033)
**Priority**: P1
**Owner**: Operator
**Covered PRD Subsystem(s)**: UX assessment
**Covered PRD Requirements**: FR-64, FR-65, FR-66 (drafted with this feature)
**Cross-Subsystem Rationale**: Changes how the audit (FEAT-004, FEAT-008, FEAT-011), the assessment (FEAT-009) and the walkthrough videos (FEAT-013) report. Uses the blueprint's journeys (FEAT-012) and the modalities (FEAT-014).

## Overview

The operator audited a new app and watched its walkthrough video. Three
problems came out of that:
- Neither the HTML report nor the video said which usability guideline or
  theme rule each problem broke.
- Neither organised the problems by the user's journey.
- The video moved too fast to follow.

This feature makes every finding name its rule in full, with the source and
the fix, and organises findings by journey and step. It slows the video to a
human pace. It also makes the usability report a HELIX artifact, and adds
HELIX drafts of the UX artifacts a team needs: journey maps, screen flows,
wireframes and interaction-state diagrams.

## Requirements

### Rules on every finding

RPT-01. Every finding from the audit and the assessment carries:
- its rule ID;
- the rule's full statement, in the SDK's words;
- its sources, as links;
- the recommended fix.

None is reported as a bare check name.

RPT-02. The theme and design-system checks become catalogue rules (`theme.*`),
with a statement, a rationale and sources, like every other rule. They cover:
- theme applied;
- token colours, fonts and radii;
- token and widget overrides;
- SDK widgets only;
- foreign components and outside-theme elements;
- brand and fonts;
- contrast;
- reflow;
- target size;
- focus obscured.

Each audit check names its rule (CONTRACT-004).

### Organised by journey

RPT-03. The audit's `report.html` groups findings by **journey**, then by
**step**, when it is given a blueprint with journeys (`--blueprint`). A page
maps to its screen by `data-piq-screen` (CONTRACT-005), or by the
blueprint's screen `path`. Each step shows:
- its screen and screenshot, with numbered boxes on the elements;
- each finding there: severity, the rule ID and its full text, the
  evidence, and the fix.

Findings on screens that no journey visits come next, under *Other screens*.
Without journeys, the report groups by screen.

RPT-04. The report opens with the two verdicts (FEAT-014 MOD-09, MOD-10):
- the **theme**;
- the **modality fit**.

Then comes a table of rules broken, each linking to its findings.

RPT-05. The assessment's report (`assess report`) uses the same order: journey,
then step, then finding with the rule, evidence, severity (0 to 4) and fix. It
covers the states each journey was walked in.

### The walkthrough video

RPT-06. The video (FEAT-013) plays at a human pace by default:
- about 2 seconds per step;
- at each finding, a pause long enough to read its text at 200 words a
  minute, and never less than 5 seconds at the normal pace;
- `--pace slow|normal|fast` scales this (slow ×1.5, fast ×0.6), never below
  1 second a step or 3 seconds a finding (US-103).

RPT-07. Each finding in the video shows the rule ID and its full statement, as
well as the problem in plain English and the fix. The chapter titles are the
journey and step.

### HELIX artifacts

RPT-08. The assessment's report is a ux-builder usability assessment report,
not a HELIX artifact (ADR-042: reports are run output). It is written in the
run package with `ux-builder:` frontmatter (`type:
usability-assessment-report`) naming its journeys and stories, and listed on
reports.html. A finding's fix is proposed to the HELIX artifact it changes
with `assess propose`.

RPT-09. `ux-builder-blueprint propose` and `draw` also draft:
- an **interaction-state diagram** per screen, covering every state it
  declares (ideal, empty, loading, partial, error), as Mermaid
  `stateDiagram-v2` with a state table: what the user sees, the action
  available and the announcement;
- a **wireframe per screen per declared state**, not only the ideal one.

When the installed HELIX defines user-journey-map, screen-flow, wireframe and
interaction-state-diagram types, `propose` fills them from their templates
(ADR-033). The proposed templates are in `docs/proposals/helix-ux-artifact-types/`.

## User Stories

- [US-100 — Read the audit by journey, with each rule spelled out](../user-stories/US-100-read-the-audit-by-journey.md)
- [US-101 — Theme findings name their rules](../user-stories/US-101-theme-findings-name-their-rules.md)
- [US-102 — Read the assessment report by journey](../user-stories/US-102-read-the-assessment-report-by-journey.md)
- [US-103 — Watch the walkthrough at a human pace with each rule spelled out](../user-stories/US-103-watch-at-a-human-pace.md)
- [US-104 — Draft HELIX UX artifacts covering every state](../user-stories/US-104-draft-helix-ux-artifacts.md)

## Edge Cases

- **A finding with no rule** (a heuristic the agent judged): it names its
  heuristic (FEAT-009, FEAT-011 AIX-03) in the same place, as "heuristic"
  with its source.
- **A page that maps to no screen**: listed under *Other screens*, by URL.
- **A very long rule statement in the video**: it is shown in full, and the
  pause grows with it.

## Success Metrics

- 100% of findings in the audit report, the assessment report and the video
  name a rule or heuristic, with its statement and fix.
- On the fixture app, findings appear under the right journey and step.

## Out of Scope

- Writing the HELIX artifact types themselves: they are proposed for the
  HELIX repository, for people to finalise.
