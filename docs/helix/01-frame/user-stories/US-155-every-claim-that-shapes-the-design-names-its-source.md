---
ddx:
  id: US-155
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: ADR-042
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-008
---

# US-155: Every claim that shapes the design names its source

**Feature**: FEAT-018
**Feature Requirements**: GDL-83
**PRD Requirements**: FR-81
**Priority**: P1
**Status**: Draft

## Story

**As a** person designing an app with the guide
**I want** each claim the agent draws from research or an existing product to say where it comes from, how sure it is, and whether the agent checked it
**So that** I correct the agent's analysis once at most, and a wrong claim never becomes a foundation

## Context

In the first guided session the agent relayed a subagent's summary of an existing product's surfaces, ranking and notifications without checking it; the person corrected it three times over twelve minutes.

## Walkthrough

1. The agent records a claim in the study's Findings > Claims: its source, observed or inferred, the confidence, that it changes direction.
2. `validate` warns it was not checked; the agent reads the code, records `claim verify`, and the warning goes.

## Acceptance Criteria

- [ ] **US-155-AC1** — Given a study, when `evidence claim add --study <study>` runs with a source, a basis (starting observed or inferred) and a confidence, then it proposes a row of the study's *Findings* > *Claims* in HELIX's columns, with its direction, what contradicts it and what is unknown; without a source, a basis or a confidence it is refused.
- [ ] **US-155-AC2** — Given a direction-changing claim neither checked against its source nor marked low confidence, when `validate` runs, then it warns naming the claim, until `evidence claim verify` records the check or the claim is low confidence; a claims row with no source fails `validate`; and the skill tells the agent never to relay a subagent's summary as fact.

## Edge Cases

- **A claim with a pipe in it**: is written with a slash so the table holds

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-155-AC1 | a record | `claim add` | a Claims row; refused without a source |
| AC2 | US-155-AC2 | an unverified direction claim | `validate`, `claim verify` | warned, then clean |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-83
- **PRD Requirements**: FR-81
- **External**: CONTRACT-008

## Out of Scope

- Checking the claim against its source automatically: the agent does it and records it.
