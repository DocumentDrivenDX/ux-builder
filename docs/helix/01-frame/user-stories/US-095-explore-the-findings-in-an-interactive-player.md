---
ddx:
  id: US-095
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

# US-095: Explore the findings in an interactive player

**Feature**: FEAT-013 — Annotated journey walkthrough videos
**Feature Requirements**: ANN-01, ANN-02, OUT-01, OUT-03, OUT-04
**PRD Requirements**: FR-58
**Priority**: P2
**Status**: Draft

## Story

**As a** product or technical leader reviewing an assessment with my team
**I want** to watch each journey with its findings as pop-ups I can open, filter and jump between
**So that** we can discuss each problem at the moment a user meets it, and reach its details without leaving the video

## Context

The MP4 is for sharing. In a review, people want to stop, ask "why?", and
move between problems. `video/index.html` plays the clean recording and
draws the annotation timeline (`annotations.json`) as HTML pop-ups, the
same timeline the MP4 composites (ADR-031 decisions 3 and 7).

## Walkthrough

1. The leader opens `ux-assessment/R-…/video/index.html` from the file system.
2. They pick `J-review`. The video plays and pauses at 0:42, where a pop-up anchored to the Approve and Reject buttons reads **Checked · P1** with the problem and recommendation.
3. They open *More*: the checkpoint's screenshot, high confidence and its reason, and "also in J-bulk-review".
4. They filter the side list to Judgment findings and jump to the third one.
5. They follow *Open in report* to F-3a91 in `report.html`.

## Acceptance Criteria

Field names and files are proposals in CONTRACT-006 *Walkthrough videos*
and FEAT-013; the criteria name them so tests can cite them.

- [ ] **US-095-AC1** — Given a run with videos, when `video/index.html` is opened from the file system with the network off, then each journey's clean recording plays and its chapters and findings are listed beside it.
- [ ] **US-095-AC2** — Given an annotation in the timeline, when playback reaches its start, then a pop-up shows the same caption as the MP4 at that time, with an outline over each of its boxes, positioned correctly at three player sizes (480, 960 and 1440 px wide).
- [ ] **US-095-AC3** — Given auto-pause on (the default), when a pop-up appears, then playback pauses until the viewer dismisses it or presses Play; with auto-pause off, it shows for its time range and playback continues.
- [ ] **US-095-AC4** — Given a pop-up, when *More* is opened, then it shows the checkpoint's screenshot, the confidence and its reason, and the other journeys with the same F- ID; *Open in report* opens `report.html` at that finding.
- [ ] **US-095-AC5** — Given the findings list, when it is filtered by priority or by Checked or Judgment and an entry is chosen, then the video seeks to that finding's start and shows its pop-up.
- [ ] **US-095-AC6** — Given the player, when it is used by keyboard only, then next and previous finding, play and pause, *More* and dismiss all work; pop-ups are announced to a screen reader; and `ux-builder-audit` reports no errors on the page.
- [ ] **US-095-AC7** — Given no `ffmpeg` on the PATH, when `assess video` runs, then no MP4 is written and the player still works from the clean WebM and the timeline.
- [ ] **US-095-AC8** — Given the same run package, when the MP4 and the player are compared, then each annotation appears in both at the same start and end times (within one frame).

## Edge Cases

- **A finding with no located element**: the pop-up is anchored to the bottom of the video with no outline.
- **Two findings at one checkpoint**: shown one after the other, each with its own pop-up and pause.
- **A chapter that stopped early** (REP-05): the list shows it as stopped, with the reason, and lists its findings as not shown.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-095-AC1 | a run with videos, network off | open `index.html` from the file system | recordings play; chapters and findings listed |
| AC2 | US-095-AC2 | an annotation in the timeline | playback reaches its start | same caption as the MP4; outlines correct at 480, 960, 1440 px |
| AC3 | US-095-AC3 | auto-pause on, then off | a pop-up appears | pauses until dismissed or Play; off: continues |
| AC4 | US-095-AC4 | a pop-up | open *More*, then *Open in report* | screenshot, confidence, other journeys; report at the finding |
| AC5 | US-095-AC5 | the findings list | filter, choose an entry | seeks to its start and shows its pop-up |
| AC6 | US-095-AC6 | the player | keyboard only; screen reader; audit | all controls work; pop-ups announced; no audit errors |
| AC7 | US-095-AC7 | no `ffmpeg` | `assess video` runs | no MP4; player works |
| AC8 | US-095-AC8 | one run package | compare MP4 and player | same annotations, same times within one frame |

## Dependencies

- **Stories**: US-091, US-094
- **Feature Spec**: FEAT-013
- **Feature Requirements**: ANN-01, ANN-02, OUT-01, OUT-03, OUT-04
- **PRD Requirements**: FR-58
- **External**: CONTRACT-006 *Walkthrough videos*

## Out of Scope

- Comments or notes added in the player.
- Hosting the player.
