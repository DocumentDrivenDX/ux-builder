---
ddx:
  id: US-136
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-037
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-006
---

# US-136: Build a validated prototype and pass the readiness check

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-44 to GDL-46
**PRD Requirements**: FR-85
**Priority**: P1
**Status**: Draft

## Story

**As a** product owner working with the guide
**I want** the chosen design built in the app's theme with realistic data, and a check before it becomes production code
**So that** users test something close to the real app, and prototype shortcuts never ship unnoticed

## Context

The validated prototype is ordinary app code that the agent builds from the SDK's patterns on a branch (ADR-037). The SDK generates no screen code for it. `ux-builder-design ready` runs the production-readiness pass (CONTRACT-008).

## Walkthrough

1. The owner chooses `map-first` at checkpoint 2.
2. The agent builds the screens in the app on a branch, from the patterns, in the app's theme, with sample data, and records each faked piece in the design state.
3. Lint, `check:blueprint` and the audit pass, and the guide offers the prototype for testing.
4. Later, `ux-builder-design ready` lists what is still faked and asks checkpoint core-3.

## Acceptance Criteria

- [ ] **US-136-AC1** — Given a design state whose chosen alternative has a validated-prototype branch, when `ux-builder-design status --json` runs, then it reports the branch as `prototype: validated` until checkpoint core-3 is answered.
- [ ] **US-136-AC2** — Given a validated prototype on which lint, `check:blueprint` or the audit reports an error, when the guide asks to show it to test users (`ux-builder-design ready --for testing`), then it refuses and names each failing check.
- [ ] **US-136-AC3** — Given a design state listing faked data and error handling for the prototype, when `ux-builder-design ready` runs, then it lists each faked item and each acceptance criterion the prototype covers that no test cites with `@covers`, and exits 1 while any remain.
- [ ] **US-136-AC4** — Given every covered criterion cited, the audit with no errors and nothing faked, when `ux-builder-design ready` runs, then it passes and asks checkpoint core-3; the answer is recorded with `state checkpoint core-3`.
- [ ] **US-136-AC5** — Given the package's source, when it is searched, then no command in `@ux-builder/design` or `@ux-builder/ui` writes screen code into the app's `src/` (ADR-037).

## Edge Cases

- **The person skips core-3**: the skip and its reason are recorded, and `status` still shows the branch as a prototype.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-136-AC1 | a design state whose chosen alternative has a validated-prototype branch | `ux-builder-design status --json` runs | it reports the branch as `prototype: validated` until checkpoint core-3 is answered |
| AC2 | US-136-AC2 | a validated prototype on which lint, `check:blueprint` or the audit reports an error | the guide asks to show it to test users (`ux-builder-design ready --for testing`) | it refuses and names each failing check |
| AC3 | US-136-AC3 | a design state listing faked data and error handling for the prototype | `ux-builder-design ready` runs | it lists each faked item and each acceptance criterion the prototype covers that no test cites with `@covers`, and exits 1 while any remain |
| AC4 | US-136-AC4 | every covered criterion cited, the audit with no errors and nothing faked | `ux-builder-design ready` runs | it passes and asks checkpoint core-3; the answer is recorded with `state checkpoint core-3` |
| AC5 | US-136-AC5 | the package's source | it is searched | no command in `@ux-builder/design` or `@ux-builder/ui` writes screen code into the app's `src/` (ADR-037) |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-44 to GDL-46
- **PRD Requirements**: FR-85
- **External**: ADR-037, CONTRACT-008, SD-006

## Out of Scope

- Deploying the app.
- Generating screen code from the blueprint.
