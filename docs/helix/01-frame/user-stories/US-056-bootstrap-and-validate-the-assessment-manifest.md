---
ddx:
  id: US-056
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: ADR-026
---

# US-056: Bootstrap and validate the assessment manifest

**Feature**: FEAT-009 — HELIX-aware UX assessment
**Brief**: UA-S01
**Feature Requirements**: CTX-01, CTX-02, CTX-03, CTX-04, HLX-01, HLX-02, HLX-03, ENV-01, ENV-02, ENV-03
**PRD Requirements**: FR-37
**Priority**: P1
**Status**: Draft

## Story

**As a** app owner
**I want** the assessment to propose a manifest from my repository and check it
**So that** an agent can assess the app repeatedly from a committed file that points at my HELIX documents and holds no secrets

## Context

ADR-026 decisions 1 and 2; CONTRACT-006 (manifest). The manifest binds the app's HELIX marker, flow and catalogue rather than listing document paths.

## Walkthrough

1. `npx ux-builder-audit assess init` writes `ux-assessment.yml` with the marker, flow and catalogue it found, the test commands from `package.json` and the Playwright configuration, and the stories in the flow as candidate journeys, by ID.
2. The owner fills the placeholders the command could not determine (the readiness URL, roles, fixtures).
3. `npx ux-builder-audit assess validate` checks it and lists every problem with its path.

## Acceptance Criteria

- [ ] **US-056-AC1** — Given a repository with a `.helix.yml`, a `package.json` and HELIX stories, when `assess init` runs, then it writes a manifest naming the marker, the flow and the catalogue source, the test commands, and each story by ID as a candidate journey; it contains no requirement text, and every value it could not determine is an explicit placeholder.
- [ ] **US-056-AC2** — Given a manifest, when `assess validate` runs, then it checks the schema, that paths exist, that the flow resolves to exactly one HELIX flow, that the commands exist, and that each journey names stories and criteria that exist in the flow; each problem is printed with its path, and it exits 1 if there is any.
- [ ] **US-056-AC3** — Given a manifest whose credentials are an environment-variable name or a storage-state file path, when it is validated, then it passes; given one holding a value that looks like a secret, then validation fails naming the field, without printing the value.
- [ ] **US-056-AC4** — Given a marker HELIX would refuse (unparseable, a root outside the repository, a duplicate flow, an unknown `defaults.flow`, a missing root) or two flows and no choice, when the manifest is validated, then it stops with HELIX's reason, or lists the candidate flows; given a valid marker, the result records the flow, its root and the catalogue source and version that bound.
- [ ] **US-056-AC5** — Given a manifest whose environment is `production`, a journey entry outside `run.origins`, an `allow` naming a consequential action, or a `writes` other than `report-only`, when it is validated, then each is an error with its path; a valid manifest's `restrictions.deny` always includes payments, outbound messages, production approvals and deleting real data.

## Edge Cases

- `include` globs that reach outside the flow's root are rejected.
- A second run of `assess init` refuses to overwrite an existing manifest.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Init | US-056-AC1 | Repository fixture with marker, package.json, stories | assess init | Manifest with marker, flow, catalogue, commands, story IDs; no requirement text; placeholders |
| Validate | US-056-AC2 | Manifest naming a missing story and command | assess validate | Each problem with its path; exit 1 |
| Secrets | US-056-AC3 | Manifest with an env reference; one with a token | validate | First passes; second fails without echoing |
| Restrictions | US-056-AC5 | Production environment; entry off-origin; allow payment | validate | Three errors; deny defaults present |
| Marker | US-056-AC4 | Malformed and two-flow markers; a valid one | validate | HELIX reasons; candidates; recorded binding |

## Dependencies

- **Feature Spec**: FEAT-009
- **Feature Requirements**: CTX-01, CTX-02, CTX-03, CTX-04, HLX-01, HLX-02, HLX-03, ENV-01, ENV-02, ENV-03, ENV-01, ENV-02, ENV-03
- **PRD Requirements**: FR-37
- **External**: CONTRACT-006; CONTRACT-004 revision

## Out of Scope

- See FEAT-009 "Out of Scope".
