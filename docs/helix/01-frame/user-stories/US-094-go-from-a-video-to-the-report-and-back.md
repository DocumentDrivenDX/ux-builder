---
ddx:
  id: US-094
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

# US-094: Go from a video to the report and back

**Feature**: FEAT-013 — Annotated journey walkthrough videos
**Feature Requirements**: ANN-01, OUT-01, OUT-02
**PRD Requirements**: FR-58
**Priority**: P2
**Status**: Draft

## Story

**As** a developer who is asked to fix a problem a leader saw in a video
**I want** to go from a caption's F- ID to the finding's specifics in the report, and from the report to the moment in the video
**So that** the leader and I discuss the same problem with its evidence

## Context

Captions carry the F- ID (ANN-01). `video.json` records each finding's time range, and the report links to it (OUT-02).

## Walkthrough

1. The leader shares `J-review.mp4` and a timestamp; the caption shows F-3a91.
2. The developer opens `report.html` at F-3a91: rule, component mapping and proposal.
3. Its *Seen in video* link opens `video/index.html` at 0:42.

## Acceptance Criteria

Field names and commands are proposals in CONTRACT-006 *Walkthrough videos*
and FEAT-013; the criteria name them so tests can cite them.

- [ ] **US-094-AC1** — Given a run with videos, when `assess report` runs, then each finding shown in a video links from `report.html` to `video/index.html` at its start time.
- [ ] **US-094-AC2** — Given a run with videos, when `video.json` is read, then it lists each video's chapters (start, end, title) and each finding's time ranges, and validates against `video.schema.json`.
- [ ] **US-094-AC3** — Given a run with videos, when `evidence.json` is written, then it lists each MP4 (or WebM), caption track and `video.json` as evidence, referenced by the findings they show.
- [ ] **US-094-AC4** — Given two `video` runs over the same run package, when their `video.json` files are compared, then the same findings appear in the same order at the same steps.

## Edge Cases

- **A finding shown in two journeys**: one link per journey.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-094-AC1 | a run with videos | `assess report` runs | each finding shown in a video links from `report.html` to `video/index.html` at its start time |
| AC2 | US-094-AC2 | a run with videos | `video.json` is read | it lists each video's chapters (start, end, title) and each finding's time ranges, and validates against `video.schema.json` |
| AC3 | US-094-AC3 | a run with videos | `evidence.json` is written | it lists each MP4 (or WebM), caption track and `video.json` as evidence, referenced by the findings they show |
| AC4 | US-094-AC4 | two `video` runs over the same run package | their `video.json` files are compared | the same findings appear in the same order at the same steps |

## Dependencies

- **Stories**: US-088 (the assessment walks the blueprint's journeys)
- **Feature Spec**: FEAT-013
- **Feature Requirements**: ANN-01, OUT-01, OUT-02
- **PRD Requirements**: FR-58
- **External**: CONTRACT-006 *Walkthrough videos*

## Out of Scope

- Hosting the videos.
