---
ddx:
  id: US-071
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-010
    - kind: informed_by
      to: ADR-027
---

# US-071: An agent in the new app finds HELIX

**Feature**: FEAT-010 — A new app starts on HELIX
**Feature Requirements**: HLW-03
**PRD Requirements**: FR-45
**Priority**: P1
**Status**: Draft

## Story

**As a** coding agent working in the new app
**I want** to be told HELIX is installed and where its documents are
**So that** I frame and evolve requirements in HELIX before I build

## Context

Guidance files the starter writes (FEAT-004 SDK-09).

## Walkthrough

1. The agent reads CLAUDE.md, invokes the `helix` skill and finds the marker.

## Acceptance Criteria

- [ ] **US-071-AC1** — Given a created app, when `AGENTS.md` and `CLAUDE.md` are read, then they say the `helix` skill is installed in `.claude/skills/helix/`, name the marker and `docs/helix/`, and give the order of work: HELIX first (frame or evolve), then the blueprint, the patterns, lint, the audit and the assessment; and they point other agent hosts to HELIX's install guide.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Guidance | US-071-AC1 | Created app | read | HELIX named; order of work |

## Dependencies

- **Feature Spec**: FEAT-010
- **Feature Requirements**: HLW-03
- **PRD Requirements**: FR-45

## Out of Scope

- See FEAT-010 "Out of Scope".
