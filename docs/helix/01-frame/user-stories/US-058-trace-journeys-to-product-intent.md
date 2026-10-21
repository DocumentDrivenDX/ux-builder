---
ddx:
  id: US-058
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: ADR-026
---

# US-058: Trace each assessed journey to product intent

**Feature**: FEAT-009 — HELIX-aware UX assessment
**Brief**: UA-S03
**Feature Requirements**: TRC-01, TRC-02, TRC-03, TRC-04, HLX-04, HLX-05
**PRD Requirements**: FR-39
**Priority**: P1
**Status**: Draft

## Story

**As a** reviewer
**I want** each journey traced to the goals, stories, criteria and tests it comes from
**So that** I can judge a recommendation against what the product is meant to do

## Context

ADR-026 decision 3. Documents are found and classified the way HELIX finds them: instances under the flow's root, typed by `ddx.type` or by the catalogue's output location.

## Walkthrough

1. `npx ux-builder-audit assess collect` writes `requirements.json`: every document's ID, type, path, hash and revision, and its goals, stories and criteria.
2. It links each journey's criteria to tests that cite them with `@covers`, and lists criteria with no test.
3. The agent adds inferred links with reasons and records the alignment review.

## Acceptance Criteria

- [ ] **US-058-AC1** — Given a HELIX flow, when `assess collect` runs, then every instance under its root is listed with its `ddx.id`, artifact type (from `ddx.type`, else the catalogue's location and naming), path, content hash and git revision, and its goals, roles, stories and acceptance criteria are extracted with their original IDs.
- [ ] **US-058-AC2** — Given the selected journeys, when they are linked, then each criterion is `explicit` (a test cites it with `@covers`, or the manifest maps it, with the test file named), `inferred` (with the agent's reason), or `uncovered`.
- [ ] **US-058-AC3** — Given HELIX's alignment review result, when it reports a conflict between governing requirements, then the conclusions that depend on them are marked blocked or qualified, and the rest of the assessment continues.
- [ ] **US-058-AC4** — Given a missing document type the assessment reads, a story without a stable ID, or a criterion without one, when collected, then each is reported; and every identifier the assessment creates has its own prefix (`J-`, `S-`, `F-`) and never matches a HELIX ID pattern.

## Edge Cases

- A document with no `ddx:` frontmatter in a catalogue location is classified by location and flagged.
- A criterion cited by a test that does not exist is `uncovered`, with the dangling citation reported.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Collect | US-058-AC1 | Fixture flow: vision, PRD, FEAT, two US, one untyped file | collect | Every instance typed, hashed; criteria extracted |
| Links | US-058-AC2 | Tests citing one criterion; manifest mapping another | collect | explicit, explicit (manifest), uncovered |
| Alignment | US-058-AC3 | Recorded conflict | Report | Dependent conclusions qualified |
| IDs | US-058-AC4 | Story without ID | collect | Reported; assessment IDs prefixed |

## Dependencies

- **Feature Spec**: FEAT-009
- **Feature Requirements**: TRC-01, TRC-02, TRC-03, TRC-04, HLX-04, HLX-05
- **PRD Requirements**: FR-39
- **External**: CONTRACT-006; CONTRACT-004 revision

## Out of Scope

- See FEAT-009 "Out of Scope".
