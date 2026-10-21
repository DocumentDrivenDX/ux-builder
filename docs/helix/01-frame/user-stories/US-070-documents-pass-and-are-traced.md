---
ddx:
  id: US-070
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-010
    - kind: informed_by
      to: ADR-027
---

# US-070: The new app's documents pass HELIX's reading and are traced

**Feature**: FEAT-010 — A new app starts on HELIX
**Feature Requirements**: HLA-04, HLW-01, HLW-02
**PRD Requirements**: FR-45
**Priority**: P1
**Status**: Draft

## Story

**As a** delivery lead
**I want** the new app's documents to pass HELIX's checks and be traced to a test from the start
**So that** the UX assessment runs on day one with nothing to fix first

## Context

FEAT-009's manifest and collect read the app; the starter test cites US-001.

## Walkthrough

1. `npx ux-builder-audit assess validate` accepts the starter's manifest.
2. `assess collect` traces US-001's criteria to `e2e/starter.spec.js`.

## Acceptance Criteria

- [ ] **US-070-AC1** — Given a created app, when `assess collect` runs, then every HELIX document is typed by frontmatter, every ID matches its type's format, every link resolves, and no warning is recorded.
- [ ] **US-070-AC2** — Given a created app, when `assess validate` runs, then its `ux-assessment.yml` is valid: bound to the marker, a journey for US-001, the preview server, and the lint, audit and e2e commands.
- [ ] **US-070-AC3** — Given a created app, when its e2e test is read and run, then `e2e/starter.spec.js` cites each US-001 criterion with `@covers`, passes, and `assess collect` links each criterion as explicit.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Clean | US-070-AC1 | Created app | assess collect | 0 warnings |
| Manifest | US-070-AC2 | Created app | assess validate | valid |
| Traced | US-070-AC3 | Installed app | npm run test:e2e; collect | Passes; explicit links |

## Dependencies

- **Feature Spec**: FEAT-010
- **Feature Requirements**: HLA-04, HLW-01, HLW-02
- **PRD Requirements**: FR-45

## Out of Scope

- See FEAT-010 "Out of Scope".
