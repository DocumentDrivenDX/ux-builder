---
ddx:
  id: US-145
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-037
    - kind: informed_by
      to: ADR-038
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-006
---

# US-145: Run an experiment through its checkpoints

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-64 to GDL-68
**PRD Requirements**: FR-88
**Priority**: P2
**Status**: Draft

## Story

**As a** product owner of a released app
**I want** the guide to turn a production problem into a tested change, with my approval before users see it and before it is adopted
**So that** improvements are evidence-based and never reach users without my decision

## Context

The guide runs observe → diagnose → hypothesize → design → test → measure → refine. Experiments need the `experiment` checkpoint before users see them and the `release` checkpoint before adoption (GDL-06). Metric definitions and dashboards are HELIX's, drafted through `propose`.

## Walkthrough

1. An insight shows abandonment after filtering.
2. The guide writes a diagnosis with alternative explanations, a hypothesis and a new alternative, `simple-filter`.
3. It asks the experiment checkpoint; the owner approves.
4. `ux-builder-design experiment start` opens it as a DDx bead; the agent builds the variant behind the app's feature flag.
5. `experiment end --result` compares task success and guardrails, and the guide asks the release checkpoint.

## Acceptance Criteria

- [ ] **US-145-AC1** — Given an insight and a new blueprint alternative, when the guide records the diagnosis, then the design state holds the observation, at least two explanations, the hypothesis and the alternative, linked to the insight.
- [ ] **US-145-AC2** — Given no answered `experiment` checkpoint for the decision, when `experiment start` runs, then it refuses and names the checkpoint.
- [ ] **US-145-AC3** — Given an answered checkpoint, when `experiment start --decision ADR-<nnn> --variant <alt> --metric <m> --guardrail <m> --duration <days>` runs, then it creates a DDx bead with the hypothesis, the variant, the metrics, the duration and the stopping rule (ADR-042 decision 1), and lists the experiment as running in the design state; without DDx it says to install it.
- [ ] **US-145-AC4** — Given a fixture result file, when `experiment end --result <file>` runs, then it compares task success and each guardrail, closes the bead with the result against the hypothesis, proposes the decision's ADR *Validation* (refuted when the variant won, tested when the decision held), and asks the `release` checkpoint.
- [ ] **US-145-AC5** — Given an experiment whose metrics are new, when it starts, then metric definitions are written only as `propose` patches to HELIX's metric-definition documents.

## Edge Cases

- **A guardrail that worsens**: the result says so first, and the guide recommends not adopting.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-145-AC1 | an insight and a new blueprint alternative | the guide records the diagnosis | the design state holds the observation, at least two explanations, the hypothesis and the alternative, linked to the insight |
| AC2 | US-145-AC2 | no answered `experiment` checkpoint for the decision | `experiment start` runs | it refuses and names the checkpoint |
| AC3 | US-145-AC3 | an answered checkpoint | `experiment start --decision ADR-<nnn> --variant <alt> --metric <m> --guardrail <m> --duration <days>` runs | it creates a DDx bead with the hypothesis, variant, metrics, duration and stopping rule, running in the design state |
| AC4 | US-145-AC4 | a fixture result file | `experiment end --result <file>` runs | it compares task success and each guardrail, closes the bead with the result, proposes the decision's *Validation*, and asks `release` |
| AC5 | US-145-AC5 | an experiment whose metrics are new | it starts | metric definitions are written only as `propose` patches to HELIX's metric-definition documents |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-64 to GDL-68
- **PRD Requirements**: FR-88
- **External**: ADR-037, ADR-038, CONTRACT-008, SD-006

## Out of Scope

- Running the feature flag service: the app's own flag decides who sees the variant.
