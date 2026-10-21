---
ddx:
  id: US-068
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-010
    - kind: informed_by
      to: ADR-027
---

# US-068: Create an app offline or on a pinned HELIX

**Feature**: FEAT-010 — A new app starts on HELIX
**Feature Requirements**: HLF-04, HLS-02
**PRD Requirements**: FR-43
**Priority**: P1
**Status**: Draft

## Story

**As a** developer on a train, or on a team that pins its tools
**I want** to create an app without the network, or on a named HELIX version, or without HELIX
**So that** creation never depends on GitHub unless I ask it to

## Context

ADR-027 decision 4: create-app ships the HELIX release that was latest when it was published.

## Walkthrough

1. `npm create @ux-builder/app my-app -- --helix-offline` uses the bundled HELIX and says so.
2. `-- --helix-version v0.17.0` installs that release or stops.

## Acceptance Criteria

- [ ] **US-068-AC1** — Given no network, when the starter runs, then the app is created with the bundled HELIX, and the output and `HELIX-VERSION.json` say which version and why.
- [ ] **US-068-AC2** — Given `--helix-offline`, when the starter runs, then it makes no network request and uses the bundled HELIX.
- [ ] **US-068-AC3** — Given `--helix-version <tag>`, when that release can be fetched and verified, then it is installed; when it cannot, then the starter exits 1, names the reason and creates no directory.
- [ ] **US-068-AC4** — Given `--no-helix`, when the starter runs, then it writes no marker, HELIX documents or skill, and the app is otherwise as before.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Offline | US-068-AC1 | Release server down | create | Bundled; reason recorded |
| Forced | US-068-AC2 | --helix-offline; server counting requests | create | 0 requests |
| Pinned | US-068-AC3 | --helix-version v1 present / v2 missing | create | Installed / exit 1, no dir |
| None | US-068-AC4 | --no-helix | create | No marker, docs or skill |

## Dependencies

- **Feature Spec**: FEAT-010
- **Feature Requirements**: HLF-04, HLS-02
- **PRD Requirements**: FR-43

## Out of Scope

- See FEAT-010 "Out of Scope".
