---
ddx:
  id: US-171
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

# US-171: Finish for me

**Feature**: FEAT-018
**Feature Requirements**: GDL-85
**PRD Requirements**: FR-89
**Priority**: P0
**Status**: Draft

## Story

**As a** person designing an app with the guide (PRD primary persona)
**I want** to stop being guided at any step and have the agent produce everything the remaining steps would
**So that** I get a complete, consistent design from what I have said, and know exactly what was guessed

## Context

ADR-043: at each step end the person can continue, revise or finish. On
finish the agent drafts the rest itself, and the tools write every
downstream ux-builder and HELIX artifact, HELIX applied directly and marked
assumed.

## Walkthrough

1. At step 2 the person says "finish it for me".
2. The agent drafts tasks, rules, journeys and screens from what it knows,
   then runs `ux-builder-design finish --answer "finish it for me"`.
3. The tool writes the brief, the users and jobs, wireframes, a final step
   prototype, a test kit and the HELIX documents, and a summary of what was
   confirmed and assumed. The agent shows the prototype and the summary.

## Acceptance Criteria

- [ ] **US-171-AC1** — Given a blueprint with errors, or a job no task serves, when `finish` runs, then it exits 2 naming each, and nothing is written.
- [ ] **US-171-AC2** — Given a complete draft, when `finish` runs, then it writes the brief, wireframes, a step prototype and a test kit, and applies every pending HELIX proposal directly, each applied document marked assumed in its frontmatter (`ux-builder.assumed: true`) with a line under its title saying it was generated, not confirmed.
- [ ] **US-171-AC3** — Given a finish, then `docs/ux-builder/finish-summary.md` lists what the person confirmed (approved items, answered checkpoints), what was assumed (assumptions and unapproved items), what to check first (direction-changing assumptions and business rules) and what was not done (testing with people).
- [ ] **US-171-AC4** — Given a finish, then every core checkpoint not yet answered is recorded as skipped with the reason "finished by the agent at the person's request", never as passed; the state records the finish with the person's words; and `status` says the design was finished with assumptions.

## Edge Cases

- **Finish at step 8**: Nothing downstream; the summary still lists assumptions
- **No HELIX proposals pending**: Nothing applied; the summary says so

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-171-AC1 | job with no task | finish | exit 2, nothing written |
| AC2 | US-171-AC2 | complete draft, a pending proposal | finish | documents written, HELIX marked assumed |
| AC3 | US-171-AC3 | approvals and assumptions | finish | summary sections |
| AC4 | US-171-AC4 | at step 2 | finish | core checkpoints skipped |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-85
- **PRD Requirements**: FR-89
- **External**: CONTRACT-008, ADR-043

## Out of Scope

- Testing with people (it needs people)
- Building the app in place (the person asks for it separately)
