---
ddx:
  id: US-093
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-013
    - kind: informed_by
      to: ADR-031
    - kind: informed_by
      to: CONTRACT-006
---

# US-093: Record signed in, with sensitive data masked

**Feature**: FEAT-013 — Annotated journey walkthrough videos
**Feature Requirements**: REP-03, PRV-01, PRV-02, PRV-03
**PRD Requirements**: FR-59
**Priority**: P2
**Status**: Draft

## Story

**As** an app owner whose app needs a login and shows customer data on staging
**I want** the video recorded as the journey's role, with the manifest's sensitive fields masked from the first frame
**So that** I can share the video without exposing credentials or customer data

## Context

Roles already declare `auth` (`env`, `storageState` or `none` for guest access) and the manifest declares `evidence.redact`. ADR-031 decision 6 applies both to the video.

## Walkthrough

1. The manifest's reviewer role signs in by `storageState`; `evidence.redact.selectors` lists `.customer-email`.
2. `assess video` signs in before recording, so the first frame is the queue, signed in.
3. Every customer email in the queue and on the entry screen is a solid box, including rows that load later.

## Acceptance Criteria

Field names and commands are proposals in CONTRACT-006 *Walkthrough videos*
and FEAT-013; the criteria name them so tests can cite them.

- [ ] **US-093-AC1** — Given a role with `auth: { storageState }` or `auth: { env }`, when its journey is recorded, then sign-in completes before recording starts and no frame shows the sign-in screen or a credential.
- [ ] **US-093-AC2** — Given a role with `auth: none`, when its journey is recorded, then it starts signed out (guest access).
- [ ] **US-093-AC3** — Given `evidence.redact` selectors and text patterns, when a chapter is recorded, then every matching element and text is masked in every frame, including content added after load.
- [ ] **US-093-AC4** — Given a masking script that fails to install, when a chapter would be recorded, then that chapter is not recorded, the reason is listed, and the `video` stage is `partial`.
- [ ] **US-093-AC5** — Given a role whose sign-in fails or whose `auth.env` is not set, when its journey would be recorded, then no video is written for it and `video.json` lists it with the reason.
- [ ] **US-093-AC6** — Given any `video` run, when it finishes, then it wrote only under the run package; `check-writes` reports nothing.

## Edge Cases

- **A secret typed during the journey** (not at sign-in): masked as it is typed (PRV-02).

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-093-AC1 | a role with `auth: { storageState }` or `auth: { env }` | its journey is recorded | sign-in completes before recording starts and no frame shows the sign-in screen or a credential |
| AC2 | US-093-AC2 | a role with `auth: none` | its journey is recorded | it starts signed out (guest access) |
| AC3 | US-093-AC3 | `evidence.redact` selectors and text patterns | a chapter is recorded | every matching element and text is masked in every frame, including content added after load |
| AC4 | US-093-AC4 | a masking script that fails to install | a chapter would be recorded | that chapter is not recorded, the reason is listed, and the `video` stage is `partial` |
| AC5 | US-093-AC5 | a role whose sign-in fails or whose `auth.env` is not set | its journey would be recorded | no video is written for it and `video.json` lists it with the reason |
| AC6 | US-093-AC6 | any `video` run | it finishes | it wrote only under the run package; `check-writes` reports nothing |

## Dependencies

- **Stories**: US-088 (the assessment walks the blueprint's journeys)
- **Feature Spec**: FEAT-013
- **Feature Requirements**: REP-03, PRV-01, PRV-02, PRV-03
- **PRD Requirements**: FR-59
- **External**: CONTRACT-006 *Walkthrough videos*

## Out of Scope

- Blurring faces or images in uploaded content.
