---
ddx:
  id: US-122
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: ADR-042
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-006
---

# US-122: See the experience brief with confirmed, assumed and hypothesis points

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-13, GDL-14, GDL-15, GDL-16
**PRD Requirements**: FR-79
**Priority**: P1
**Status**: Draft

## Story

**As a** product owner
**I want** a one-page brief of what we are building, with each point marked as confirmed, assumed or a hypothesis
**So that** I can see what is settled and what still needs evidence

## Context

Define runs through HELIX's grill and frame activities. `ux-builder-design brief` writes `docs/ux-builder/brief.md` and a page from the PRD, principles.md's *Experience Principles*, the stories and the design state. An experience principle is HELIX's (ADR-042): `ux-builder-design principle add` proposes it for principles.md, and a principle the blueprint check can express keeps its rule in `.ux-builder/principles.json` and becomes a project rule, named by its words.

## Walkthrough

1. After the interview, the guide runs `ux-builder-design brief`.
2. The owner opens the page: product, users, outcome, jobs, principles, constraints and open questions, each point marked.
3. "No mandatory account creation" becomes a project rule the check applies.

## Acceptance Criteria

- [ ] **US-122-AC1** — Given a HELIX PRD, stories and a design state with one confirmed point, one assumption and one hypothesis, when `brief` runs, then `docs/ux-builder/brief.md` has the seven sections CONTRACT-008 names, and each point carries its status.
- [ ] **US-122-AC2** — Given a brief with a hypothesis, when it is read, then the hypothesis lists what would confirm it.
- [ ] **US-122-AC3** — Given an app with no HELIX marker, when `brief` runs, then it builds the brief from the design state alone and says HELIX was not found.
- [ ] **US-122-AC4** — Given a brief principle "no mandatory account creation" and a blueprint whose J-find starts at a sign-in screen, when `ux-builder-blueprint check` runs, then it reports a finding from the project rule naming the principle by its words.
- [ ] **US-122-AC5** — Given the installed skill, when its text is read, then it says to run Define through HELIX's `frame` (the PRD and principles.md) and `grill`, to carry an undecided interaction model to Explore as an open question, and to regenerate the brief when its sources change.
- [ ] **US-122-AC6** — Given `principle add --text <principle> [--rule <json>]`, when it runs, then it proposes the principle under principles.md's *Experience Principles* (creating principles.md when HELIX has none), keeps a rule a check can express in `.ux-builder/principles.json` keyed by its words, and `state set principles[+]` is refused naming `principle add`.
- [ ] **US-122-AC7** — Given HELIX documents, when `brief` runs, then the brief is compiled from them (ADR-042 decision 3): each section names its source, the PRD's *User Needs* lead its primary jobs, a change in HELIX shows once it is regenerated, and `validate` warns while the brief no longer says what its sources say.

## Edge Cases

- **A principle no check can express**: it stays in the brief and becomes a rubric note.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-122-AC1 | a HELIX PRD, stories and a design state with one confirmed point, one assumption and one hypothesis | `brief` runs | `docs/ux-builder/brief.md` has the seven sections CONTRACT-008 names, and each point carries its status |
| AC2 | US-122-AC2 | a brief with a hypothesis | it is read | the hypothesis lists what would confirm it |
| AC3 | US-122-AC3 | an app with no HELIX marker | `brief` runs | it builds the brief from the design state alone and says HELIX was not found |
| AC4 | US-122-AC4 | a brief principle "no mandatory account creation" and a blueprint whose J-find starts at a sign-in screen | `ux-builder-blueprint check` runs | it reports a finding from the project rule naming the principle |
| AC5 | US-122-AC5 | the installed skill | its text is read | it says to run Define through HELIX's grill, to carry an undecided interaction model to Explore as an open question, and to regenerate the brief when its sources change |
| AC6 | US-122-AC6 | `principle add --text <principle> [--rule <json>]` | it runs | it proposes the principle under principles.md's *Experience Principles*, keeps its rule in `.ux-builder/principles.json`, and the state refuses `principles[+]` |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-13, GDL-14, GDL-15, GDL-16
- **PRD Requirements**: FR-79
- **External**: CONTRACT-008, SD-006

## Out of Scope

- Writing the PRD itself (HELIX).
