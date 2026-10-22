---
ddx:
  id: US-091
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

# US-091: Watch a journey with its usability problems

**Feature**: FEAT-013 — Annotated journey walkthrough videos
**Feature Requirements**: REP-02, REP-04, REP-05, REP-06, ANN-01, ANN-02, ANN-04, OUT-01, OUT-03
**PRD Requirements**: FR-57, FR-58
**Priority**: P2
**Status**: Draft

## Story

**As** a product or technical leader who owns a HELIX app
**I want** a video of each journey, showing where users meet each problem the assessment found and what to do about it
**So that** I can judge and prioritise usability problems without reading the assessment report

## Context

An assessment run (FEAT-009) holds the walked journeys, checkpoints and merged findings. `assess video` replays each walked journey at a human pace and pauses at checkpoints with findings (ADR-031).

## Walkthrough

1. The leader runs `ux-builder-audit assess video --run R-…` after an assessment.
2. It writes `video/J-review.mp4` and `video/J-settings.mp4`, and `video/index.html`.
3. `J-review.mp4` opens on a title card, replays the queue, and pauses on the entry screen with Approve and Reject outlined and a **Checked · P1** caption.
4. The alternate (reject with a reason) follows as a second chapter; the end card lists two findings and the report's path.

## Acceptance Criteria

Field names and commands are proposals in CONTRACT-006 *Walkthrough videos*
and FEAT-013; the criteria name them so tests can cite them.

- [ ] **US-091-AC1** — Given a run whose walkthrough has two journeys with `done` steps, when `assess video` runs, then one MP4 per journey is written under `video/`, each opening on a title card naming the app, journey, story, role, viewport and run ID.
- [ ] **US-091-AC2** — Given a merged finding citing a journey's checkpoint, when its video is recorded, then the replay pauses at that checkpoint, outlines each element the evidence locates, and shows the priority, F- ID, plain-English problem and recommendation.
- [ ] **US-091-AC3** — Given a heuristic finding and a deterministic finding, when they are shown, then the heuristic's caption says **Judgment** and the deterministic one's **Checked**; a low-confidence finding says it is worth checking with users.
- [ ] **US-091-AC4** — Given a checkpoint whose replayed state differs from the recorded one, when the chapter reaches it, then the chapter stops with a card naming the step, none of its findings are shown, and the `video` stage is `partial`.
- [ ] **US-091-AC5** — Given a journey with walked alternates, when its video is recorded, then the main path and each alternate are chapters of one MP4, each started after the fixture's reset with the role's signed-in state put back.
- [ ] **US-091-AC6** — Given no `ffmpeg` on the PATH, when `assess video` runs, then no MP4 is written, the player still works, and the `video` stage is `partial` with that reason.
- [ ] **US-091-AC7** — Given no `video.viewports` in the manifest, when `assess video` runs, then videos are 1440 × 900; with two viewports listed, each journey has one MP4 per viewport.

## Edge Cases

- **A journey with no findings**: still recorded; the end card says nothing was found and lists what was not assessed.
- **A risky AI step**: the replay stops at the approval and chooses Deny, as the walkthrough did.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-091-AC1 | a run whose walkthrough has two journeys with `done` steps | `assess video` runs | one MP4 per journey is written under `video/`, each opening on a title card naming the app, journey, story, role, viewport and run ID |
| AC2 | US-091-AC2 | a merged finding citing a journey's checkpoint | its video is recorded | the replay pauses at that checkpoint, outlines each element the evidence locates, and shows the priority, F- ID, plain-English problem and recommendation |
| AC3 | US-091-AC3 | a heuristic finding and a deterministic finding | they are shown | the heuristic's caption says **Judgment** and the deterministic one's **Checked**; a low-confidence finding says it is worth checking with users |
| AC4 | US-091-AC4 | a checkpoint whose replayed state differs from the recorded one | the chapter reaches it | the chapter stops with a card naming the step, none of its findings are shown, and the `video` stage is `partial` |
| AC5 | US-091-AC5 | a journey with walked alternates | its video is recorded | the main path and each alternate are chapters of one MP4, each started after the fixture's reset with the role's signed-in state put back |
| AC6 | US-091-AC6 | no `ffmpeg` on the PATH | `assess video` runs | no MP4 is written, the player still works, and the `video` stage is `partial` with that reason |
| AC7 | US-091-AC7 | no `video.viewports` in the manifest | `assess video` runs | videos are 1440 × 900; with two viewports listed, each journey has one MP4 per viewport |

## Dependencies

- **Stories**: US-088 (the assessment walks the blueprint's journeys)
- **Feature Spec**: FEAT-013
- **Feature Requirements**: REP-02, REP-04, REP-05, REP-06, ANN-01, ANN-02, ANN-04, OUT-01, OUT-03
- **PRD Requirements**: FR-57, FR-58
- **External**: CONTRACT-006 *Walkthrough videos*

## Out of Scope

- Spoken narration (deferred, ADR-031).
