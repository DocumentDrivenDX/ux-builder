---
ddx:
  id: US-110
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-016
    - kind: informed_by
      to: ADR-035
---

# US-110: Learn from episodes across apps

**Feature**: FEAT-016 — Learning from builds
**Feature Requirements**: TRC-08, TRC-09, TRC-10
**PRD Requirements**: FR-72
**Priority**: P1
**Status**: Draft

## Story

**As a** ux-builder maintainer (operator)
**I want** a learning report over every app's exported episodes that shows where ux-builder's guidance, rules, components, checks and starter fall short, and beads for the strongest signals
**So that** ux-builder improves from evidence across all its apps

## Context

Bundles from any app go to a private learning store, never this repository. `ux-builder-learn` reads it and writes a report and, with `--beads`, beads carrying only aggregated, paraphrased lessons.

## Walkthrough

1. The maintainer runs `node tools/learn.mjs --store ~/ux-learning --out learn/`.
2. The report shows `nav.compact-destinations` broken on first try in 7 of 9 episodes that fetched it.
3. With `--beads`, it files a bead to clarify that rule's statement.

## Acceptance Criteria

- [ ] **US-110-AC1** — Given a store of bundles, when `ux-builder-learn` runs, then its report lists each signal of FEAT-016 TRC-09 with its counts and the episodes behind it, by modality and pattern.
- [ ] **US-110-AC2** — Given a fixture store seeded with one case of each signal, when the report is written, then every seeded signal is found and no other.
- [ ] **US-110-AC3** — Given `--beads`, when signals exceed the threshold (default: 3 episodes in 2 apps), then one bead is created per signal with its counts and a paraphrased lesson, and no client text, file path or app name appears in it.
- [ ] **US-110-AC4** — Given the store path is inside this repository, when `ux-builder-learn` runs, then it exits 1: bundles are never kept here.

## Edge Cases

- **A client asks for removal**: deleting its bundles from the store removes them from the next report.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-110-AC1 | a store of bundles | `ux-builder-learn` runs | its report lists each signal of FEAT-016 TRC-09 with its counts and the episodes behind it, by modality and pattern |
| AC2 | US-110-AC2 | a fixture store seeded with one case of each signal | the report is written | every seeded signal is found and no other |
| AC3 | US-110-AC3 | `--beads` | signals exceed the threshold (default: 3 episodes in 2 apps) | one bead is created per signal with its counts and a paraphrased lesson, and no client text, file path or app name appears in it |
| AC4 | US-110-AC4 | the store path is inside this repository | `ux-builder-learn` runs | it exits 1: bundles are never kept here |

## Dependencies

- **Feature Spec**: FEAT-016
- **Feature Requirements**: TRC-08, TRC-09, TRC-10
- **PRD Requirements**: FR-72
- **External**: ADR-035

## Out of Scope

- Hosting the store.
