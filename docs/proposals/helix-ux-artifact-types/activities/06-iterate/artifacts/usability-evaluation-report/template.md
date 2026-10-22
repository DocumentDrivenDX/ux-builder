---
ddx:
  id: UER-XXX
  type: usability-evaluation-report
  authoring:
    home: repo
  depends_on:
    - FEAT-XXX
    - UJM-XXX
    - SF-XXX
---

# UER-XXX: [Scope] Usability Evaluation

**Approach**: [moderated | unmoderated | expert-review | automated-assessment | mixed] | **Run**: [run ID] | **Date**: [YYYY-MM-DD] | **Previous**: [[UER-XXX]] or none

## Executive Summary

- **Evaluated**: [Product, version, journeys]
- **Top findings**: [F-IDs with severity, one line each]
- **Decision needed**: [What the team must decide or fix first]

## Product and Goals

- **Product**: [Name, version or build, environment (local, staging)]
- **Scope**: [Features and journeys in scope; what is out of scope]
- **Users represented**: [PRD personas]
- **Goals**: [What this evaluation sets out to learn or check]

## Method

- **Approach**: [Which, and why it suits the goals]
- **Participants or evaluators**: [Number, persona match, expertise; no personal data]
- **Environment**: [Device, size class, input, browser, assistive technology, network]
- **Procedure**: [How sessions or inspections ran; rules or heuristics sets applied]
- **Limits**: [What this method cannot show]

## Tasks and Journeys

| Task | Journey | Stories / ACs | Success criterion |
|---|---|---|---|
| [What the participant or evaluator was asked to do] | [UJM phase or journey ID] | [US-XXX-ACn] | [How completion was judged] |

## Measures

<!-- User testing: effectiveness (completion, errors), efficiency (time, steps),
satisfaction (questionnaire). Inspection: rules checked, findings per rule.
Report only measures the method produces. -->

| Measure | Definition | Result |
|---|---|---|
| [Measure] | [How computed] | [Value, with n] |

## Findings by Journey

<!-- Severity 0-4 (0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe),
from frequency, impact, persistence, and market impact where judged.
Status: new | persistent | resolved | regressed (against Previous). -->

### Journey: [Journey ID — name]

#### Step [n]: [Screen or step]

##### F-XX: [Problem, in the user's terms]

- **Rule**: [Rule ID] — [statement, quoted in full or paraphrased] — [source]
- **Evidence**: [screenshot path, video timestamp, accessibility-tree excerpt, session note]
- **Severity**: [0-4] — frequency [low/med/high], impact [low/med/high], persistence [one-time/repeated], market impact [low/med/high or not judged]
- **Recommended fix**: [What to change]
- **Owner**: [Role or team]
- **Stories / ACs**: [US-XXX-ACn, or "no AC covers this"]
- **Proposed change**: [HELIX artifact ID to update, or new artifact type]
- **Status**: [new | persistent | resolved | regressed]

### Cross-journey

<!-- Findings that do not belong to one journey (navigation, theme, global). -->

## State Coverage

<!-- One row per journey; one column per state the journeys pass through.
Cells: assessed | not-assessed | n/a. Nothing passes by omission. -->

| Journey | ideal | empty | loading | partial | error | offline | slow | permission-denied | success |
|---|---|---|---|---|---|---|---|---|---|
| [Journey] | | | | | | | | | |

## Design System Conformance

| Check | Source | Result | Findings |
|---|---|---|---|
| [Tokens only, no raw values] | [DESIGN.md section or rule ID] | [pass / fail / not-assessed] | [F-IDs] |

## Modality Fit

- **Modality**: [e.g. desktop-first web app with an AI assistant; touch kiosk; voice]
- **Components**: [Whether the UI and AI components used suit the modality]
- **Guidelines applied**: [Which guideline sets apply to this modality and whether they were met]
- **Gaps**: [F-IDs]

## Recommendations

| Rank | Finding | Fix | Owner | Route |
|---|---|---|---|---|
| 1 | [F-XX] | [Fix] | [Owner] | [improvement-backlog item, or artifact ID] |

## Appendix: Evidence Index

- [Evidence ID → path or timestamp]
