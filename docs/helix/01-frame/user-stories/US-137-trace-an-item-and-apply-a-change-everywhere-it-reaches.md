---
ddx:
  id: US-137
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-036
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-006
---

# US-137: Trace an item and apply a change everywhere it reaches

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-47 to GDL-49
**PRD Requirements**: FR-85
**Priority**: P1
**Status**: Draft

## Story

**As a** product owner working with the guide
**I want** to say a change in plain words and have every affected artifact found and updated together
**So that** I review one summary instead of coordinating changes across many documents

## Context

Artifacts link by ID: job → task → journey → screen → prototype page → test task → finding (CONTRACT-008). `ux-builder-design trace` follows the links; `impact` lists and, on approval, applies a change.

## Walkthrough

1. The owner says, "Don't make me pick an activity first."
2. The agent maps the change to the blueprint edit and runs `ux-builder-design impact "remove activity selection before exploring"`.
3. It shows the affected tasks, journeys, screens, prototype pages, test-kit tasks, findings and HELIX documents, with the complexity delta.
4. The owner agrees; `impact --apply` updates the blueprint, regenerates prototypes and the kit, writes HELIX proposals and records the decision.

## Acceptance Criteria

- [ ] **US-137-AC1** — Given a fixture app whose job, task, journey, screen, prototype page, test task and finding are linked by ID, when `ux-builder-design trace <id> --json` runs on any of them, then it lists every linked item upstream and downstream, each with its file.
- [ ] **US-137-AC2** — Given a fixture with seeded dependents of one screen, when `ux-builder-design impact "<change>" --json` runs, then it lists every seeded dependent task, journey, screen, pattern, prototype page, test-kit task, finding and HELIX document, and changes no file.
- [ ] **US-137-AC3** — Given an impact list the person accepts, when `impact --apply` runs, then it updates the blueprint, regenerates the prototypes and the test kit, writes HELIX changes only as `propose` patches, and records a decision.
- [ ] **US-137-AC4** — Given an applied change, when its summary is printed, then it is one summary of what changed, with the complexity delta per journey.
- [ ] **US-137-AC5** — Given an applied change that breaks a journey, when `impact --apply` runs, then the check fails, nothing is regenerated, and the blueprint edit is left for the person to fix.

## Edge Cases

- **An ID nothing links to**: `trace` says so and exits 0.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-137-AC1 | a fixture app whose job, task, journey, screen, prototype page, test task and finding are linked by ID | `ux-builder-design trace <id> --json` runs on any of them | it lists every linked item upstream and downstream, each with its file |
| AC2 | US-137-AC2 | a fixture with seeded dependents of one screen | `ux-builder-design impact "<change>" --json` runs | it lists every seeded dependent task, journey, screen, pattern, prototype page, test-kit task, finding and HELIX document, and changes no file |
| AC3 | US-137-AC3 | an impact list the person accepts | `impact --apply` runs | it updates the blueprint, regenerates the prototypes and the test kit, writes HELIX changes only as `propose` patches, and records a decision |
| AC4 | US-137-AC4 | an applied change | its summary is printed | it is one summary of what changed, with the complexity delta per journey |
| AC5 | US-137-AC5 | an applied change that breaks a journey | `impact --apply` runs | the check fails, nothing is regenerated, and the blueprint edit is left for the person to fix |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-47 to GDL-49
- **PRD Requirements**: FR-85
- **External**: ADR-036, CONTRACT-008, SD-006

## Out of Scope

- Understanding the plain-words change: the agent maps it to the blueprint edit.
