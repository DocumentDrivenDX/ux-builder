---
ddx:
  id: US-170
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: ADR-043
---

# US-170: A prototype ends every step

**Feature**: FEAT-018
**Feature Requirements**: GDL-84
**PRD Requirements**: FR-89
**Priority**: P0
**Status**: Draft

## Story

**As a** person designing an app with the guide (PRD primary persona)
**I want** to click a prototype of what we have so far at the end of every step, checked before I see it
**So that** I react to screens rather than documents, and decide at each step whether to go on

## Context

In VIP List session 1 the first prototype came after about 148 active
minutes and 12 approvals. One story was reopened once the person saw its
screen. ADR-043 makes every step end with a checked prototype and a
three-way decision.

## Walkthrough

1. At the end of step 1 the agent drafts screens from the brief, runs
   `prototype --step`, then `--check`. It fixes two contrast errors and an
   out-of-order screen, and checks again.
2. It shows the prototype with what it found, fixed and left, and asks:
   continue, revise, or shall I finish the rest?
3. The person says continue; the step moves to 2.

## Acceptance Criteria

- [ ] **US-170-AC1** — Given a design with no modality recorded, when `ux-builder-design prototype --step` runs, then it writes `docs/ux-builder/prototypes/step-<n>/` with an `index.html`, using responsive web, the compact, medium, expanded and large size classes and the frame recommended from the destinations, records each as an assumption, and records the step prototype in the state; with a modality recorded, it uses that.
- [ ] **US-170-AC2** — Given no theme chosen, then the step prototype uses `plain`, in the appearance the state records (light by default, dark when the agent set it), and records the appearance as an assumption with its reason.
- [ ] **US-170-AC3** — Given a step prototype, when `prototype --step --check` runs, then every page of it is audited and checked against the deterministic heuristics, the result is written to `check-<round>.json` with the pages audited, the round is recorded, and from step 5 the journey walk is requested. *[Amended 2026-10-31 — session 2]* A round audits each screen's ideal state at every size and its other states at one size, only pages changed since their last audit; each finding has a stable ID; drawn again within a step, the prototype keeps its rounds.
- [ ] **US-170-AC4** — Given the current step, when `step decide` runs without a step prototype whose first check is followed by a second check or `--nothing-to-fix`, then it exits 2 naming what is missing. *[Amended 2026-10-31 — session 2]* In place of a second round: every finding of the latest check fixed (gone) or accepted with a reason (`--accept <id> --reason`); `--nothing-to-fix` only with nothing open.
- [ ] **US-170-AC5** — Given a checked step prototype, when the person decides continue, then the step moves to the next one (a core checkpoint closing the step is answered by the same decision, and step 4 leads to step 5); revise keeps the step and marks its prototype stale; finish names the `finish` command.
- [ ] **US-170-AC6** — Given the overview, the skill and the glossary, then each says every step ends with a prototype and the three choices, the skill tells the agent to report status in four lines (ready, blocked by, who is handling it, what I need from you) without engineering terms, never to end with the person owning a dependency, and `explain "step prototype"` says what it is.
- [ ] **US-170-AC7** — Given a step decision, then it is recorded as a decision turn in the metrics, and the first decision on a shown step prototype marks the prototype milestone.

## Edge Cases

- **The blueprint has errors**: `prototype --step` refuses, naming them; nothing is written
- **A chat-only app**: No frame is assumed
- **The audit cannot run (no browser)**: The check records the audit as not run and why; the heuristics still run

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-170-AC1 | no modality | prototype --step | step-1/ written, assumptions recorded |
| AC2 | US-170-AC2 | appearance dark | prototype --step | dark pages, assumption recorded |
| AC3 | US-170-AC3 | step prototype | --check (audit stubbed) | check-1.json, every page |
| AC4 | US-170-AC4 | no check | step decide | exit 2 |
| AC5 | US-170-AC5 | checked, step 4 | decide continue | step 5 |
| AC6 | US-170-AC6 | SKILL.md, glossary, overview | read | three choices, status lines |
| AC7 | US-170-AC7 | a decision | metrics | decision turn, milestone |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-84
- **PRD Requirements**: FR-89
- **External**: CONTRACT-008, ADR-043

## Out of Scope

- What finish generates (US-171)
- Exploratory prototypes of alternatives and the validated prototype (unchanged)
