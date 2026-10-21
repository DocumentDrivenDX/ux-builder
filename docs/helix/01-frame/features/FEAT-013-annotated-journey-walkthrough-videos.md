---
ddx:
  id: FEAT-013
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: FEAT-012
    - kind: informed_by
      to: ADR-026
    - kind: informed_by
      to: ADR-030
    - kind: informed_by
      to: ADR-031
---

# Feature Specification: FEAT-013 — Annotated journey walkthrough videos

**Feature ID**: FEAT-013
**Status**: Draft (2026-10-21, with ADR-031; awaiting review)
**Priority**: P2
**Owner**: Operator
**Covered PRD Subsystem(s)**: UX assessment
**Covered PRD Requirements**: FR-57, FR-58, FR-59 (drafted with this feature)
**Cross-Subsystem Rationale**: Builds on FEAT-009's run package (its walkthrough, checkpoints and merged findings) and walks FEAT-012's blueprint journeys.

## Overview

A UX assessment (FEAT-009) ends in `report.html`: findings, evidence
screenshots and proposals. That suits the developer who fixes them. The
product or technical leader who owns the app wants to *see* the app being
used, with each problem shown where a user meets it.

This feature adds `ux-builder-audit assess video`. After an assessment run,
it replays every journey the agent walked, at a steady human pace, in a
browser of its own. When the replay reaches a checkpoint that has findings,
it pauses. It highlights the elements involved and shows each finding in
plain English: the problem and what to do about it. There are two outputs,
both chaptered by the journey's main path and alternates, beside the report:
- **an MP4 per journey** to share, with the annotations in the picture;
- **an interactive HTML player**, where the annotations are HTML pop-ups
  over the video. A viewer can open one for its details and link to the
  finding in the report, or jump through the findings.

Both come from one replay. The replay records a clean video and an
annotation timeline: when each finding shows, and the box of each element
it involves. The MP4 composites the timeline into the picture; the player
draws it live.

```
assessment run (FEAT-009)                    assess video
─────────────────────────                    ────────────
agent walks journeys ─► walkthrough.json ──► replay each journey's steps
inspect checkpoints  ─► checkpoints/      ──► pause at each checkpoint,
merge findings       ─► backlog.json      ──► show its findings in plain English
                                              record ─► clean video + annotations.json
                                                         ├─► video/J-review.mp4 (composited)
                                                         └─► video/index.html  (live pop-ups)
```

The video shows what the assessment found. It does not find anything new.
Every annotation is a finding in the run's backlog, with its F- ID, so the
video, the report and the backlog never disagree.

## Ideal Future State

A technical leader runs an assessment of their HELIX app against staging,
signed in as the test reviewer. Ten minutes later they open
`ux-assessment/R-…/video/`. They find `J-review.mp4`, `J-settings.mp4` and
an `index.html` listing each video's chapters and findings.

`J-review.mp4` opens on a title card (journey, story, role, run date). The
queue loads and the cursor moves to an entry and opens it. The video stops
on the entry screen. A box outlines the Approve and Reject buttons, and a
caption reads:

> **Checked · P1** Both actions look equally important, so it is easy to
> reject by mistake. **Recommendation:** make Approve the one main action,
> and ask for confirmation before Reject.

The leader shares the MP4 in the team channel. In the review meeting they
open `index.html` instead. The same pause shows a pop-up anchored to the
buttons. It has a *More* toggle (the evidence, the confidence, and other
journeys with the same problem) and an *Open in report* link. A side list
of all five findings jumps the video to each. The developer follows the
link to F-3a91 for the specifics: the rule, the component to use and the
proposed change to US-012.

## Problem Statement

- **Current situation**: findings are rows and screenshots in a report
  written for the developer. A leader has to infer how a problem feels to a
  user from a still image and a rule ID.
- **Pain points**:
  1. Leaders don't read assessment reports, so usability problems are
     prioritised by whoever fixes them.
  2. A screenshot shows a state, not the path to it. Problems in a flow
     (too many steps, lost context, a dead end) are hard to see in one.
  3. Recording a walkthrough by hand is slow, out of date after the next
     change, and easily shows real data.
- **Desired outcome**: each assessment can produce, unattended, a short
  video per journey that a leader can watch and share. It shows the
  findings in plain English, labels what was checked apart from what is
  judgment, and masks what the manifest says to mask.

## Functional Areas

| Area | User question or job | Feature responsibility |
|------|----------------------|------------------------|
| Replay | "Show me the app being used" | Replay each walked journey and alternate at a human pace, signed in as its role |
| Annotation | "Where are the problems?" | Pause at checkpoints; highlight elements; plain-English problem and recommendation |
| Output | "Can I share it, or explore it?" | One MP4 per journey with chapters, captions and title and end cards; an interactive HTML player with pop-up annotations |
| Privacy | "Will it leak anything?" | Masking from the first frame; no sign-in on camera; nothing leaves the run package |

## Requirements

### Functional Requirements by Area

#### Replay

REP-01. While walking, the agent records each browser action as a
replayable step on its walkthrough step (`walkthrough.json`
`steps[].do`: `{ goto } | { click } | { fill, value } | { press } |
{ waitFor }`, the format `inspect --replay` already takes). A value typed
into a field the manifest marks secret, or a password field, is recorded as
a reference, never as the literal (CONTRACT-006 amendment).

REP-02. `assess video --run <R-id>` replays every journey in
`walkthrough.json` whose steps are `done`. It replays the main path, then
each walked alternate, in a browser of its own. It applies the run's
origins, excluded integrations and restrictions, as `inspect --replay` does.

REP-03. Each chapter signs in as the journey's role before recording
starts. A role with `auth: none` (guest) starts signed out. A journey whose
role cannot sign in is not recorded and is listed with its reason.

REP-04. The replay runs at a human pace. It shows a cursor moving to each
target and marks each click, types text character by character, and holds
each new screen briefly. These aids are drawn only in the video replay,
never during an inspection.

REP-05. At each checkpoint the replay checks the state the checkpoint
recorded, as `inspect --replay` does. If the state differs, that chapter
stops with a card saying so, its findings are not shown, and the `video`
stage is `partial`. The video never shows a finding on a state it did not
reach.

REP-06. The viewport is desktop (1440 × 900) unless the manifest's
`video.viewports` says otherwise. Each extra viewport adds one MP4 per
journey.

#### Annotation

ANN-01. Each finding in the merged backlog that cites a checkpoint of the
journey is shown when the replay reaches that checkpoint. The replay holds
the page for a reading time set by the caption's length, and records in
the annotation timeline (`annotations.json`) the finding's time range and
the box, in viewport pixels, of each element its evidence locates. The page
is still while it holds, so the boxes hold for the whole range. Each
annotation is drawn (composited in the MP4, a pop-up in the player) as an
outline of each box and a caption with:
- the finding's priority and F- ID;
- its plain-English problem;
- its plain-English recommendation.

A finding with no located element is shown as a caption only.

ANN-02. Captions label what kind of finding they show. A deterministic or
observed finding is **Checked**. A heuristic finding is **Judgment**, and
says so in the caption. Low-confidence findings say "worth checking with
users". A heuristic is never presented as a failed rule (COV-02).

ANN-03. Every finding has `plain: { problem, recommendation }`. Each is
one or two short sentences in the user's terms, with no rule ID, token or
component name. The specifics (rule, component mapping, proposed HELIX
change) stay in the report and the backlog. `validate-report` rejects a run
with a video whose findings lack `plain`.

ANN-04. Each journey's video opens on a title card (app, journey, story,
role, viewport, run ID and date). It ends on a card listing the findings
shown by priority, any chapter that stopped early, and the report's path.

#### Output

OUT-01. The run package gains `video/`:
- `<journey-id>[@<viewport>].mp4` (H.264, no audio), annotations
  composited;
- `<journey-id>[@<viewport>].clean.webm`, the recording with no annotations,
  which the player plays;
- `<journey-id>[@<viewport>].annotations.json`, the annotation timeline;
- a WebVTT caption track and a chapters track per video;
- `video.json`: each video's chapters and, for each finding, its time
  range;
- `index.html`, the player (OUT-04).

OUT-04. `index.html` is an interactive player. It needs no server and no
network, and opens from the file system. For each video it:
- plays the clean recording and draws each annotation as an HTML pop-up
  anchored to its outlined elements, scaled with the video. The pop-up has
  the same caption as the MP4 (ANN-01, ANN-02);
- pauses at each pop-up, by default, and resumes when the viewer dismisses
  it or presses Play. Auto-pause can be turned off;
- shows *More* on a pop-up: the evidence (screenshot of the checkpoint),
  confidence and reason, and the other journeys with the same finding;
- links each pop-up to the finding in `report.html`;
- lists chapters and findings beside the video, filterable by priority and
  by Checked or Judgment, each jumping to its time;
- can be driven by keyboard: next and previous finding, play and pause,
  dismiss. Pop-ups are readable by a screen reader, and the page itself
  passes the audit's checks.

The player is the SDK's own page, styled with the `ux-builder` theme, not
the assessed app's.

OUT-02. `report.html` links each finding to the moment it appears in its
video. `evidence.json` lists the videos as evidence.

OUT-03. Encoding to MP4 and compositing need `ffmpeg` on the PATH. The SDK
does not ship it (ADR-031 decision 4). Without it, no MP4 is written, the
`video` stage is `partial` and says why, and the player still works: it
needs only the clean WebM and the timeline.

#### Privacy

PRV-01. The manifest's `evidence.redact` selectors and text patterns are
masked from the first frame of every chapter, including content that
appears later, and inside the app's modal dialogs. If the masking is not
on any page, the journey's recording is discarded.

PRV-02. Signing in happens before recording starts. No credential or
secret value appears on screen: a secret field's typed value is masked as
it is typed.

PRV-03. Videos are written only under the run package, which is the
assessment's output path (`restrictions.writes: report-only`). Nothing is
uploaded. `run.environment` stays `local` or `staging`.

### Non-Functional Requirements

- **Duration**: a journey's video is no longer than its replay plus its
  reading pauses. Waits for the network are trimmed to at most 1 s on
  screen.
- **Time to produce**: under 2 minutes per journey of 20 steps on a
  developer laptop, excluding the app's own response times.
- **Determinism**: two `video` runs over the same run package show the same
  findings, in the same order, at the same steps.
- **Agreement**: the MP4 and the player show the same annotations at the
  same times, because both read the same timeline.
- **Size**: under 20 MB per minute at 1440 × 900.

## User Stories

- [US-091 — Watch a journey with its usability problems](../user-stories/US-091-watch-a-journey-with-its-usability-problems.md)
- [US-092 — The agent records replayable steps and plain-English findings](../user-stories/US-092-the-agent-records-replayable-steps-and-plain-findings.md)
- [US-093 — Record signed in, with sensitive data masked](../user-stories/US-093-record-signed-in-with-sensitive-data-masked.md)
- [US-094 — Go from a video to the report and back](../user-stories/US-094-go-from-a-video-to-the-report-and-back.md)
- [US-095 — Explore the findings in an interactive player](../user-stories/US-095-explore-the-findings-in-an-interactive-player.md)

Build tracked as DDx beads: epic `ux-builder-c4bdb16c`, steps 1–7 (contract
and schemas; skill; replay recorder; MP4 renderer; HTML player; report links;
end to end). The ffmpeg dependency was decided in `ux-builder-87cc5d3b` (on the PATH, not shipped).

## Edge Cases and Error Handling

- **A step that no longer replays** (the app changed since the run): the
  chapter stops with a card naming the step, and the stage is `partial`.
- **A journey walked only partly** (`blocked` steps): the video covers the
  steps that were `done` and ends on a card giving the blocked step's
  reason.
- **A finding on a modal that closes on its own** (a toast): the replay
  holds at the checkpoint before the next step. If the element is gone, the
  finding is shown as a caption only.
- **A risky AI step** (FEAT-011): the replay stops at the approval and
  chooses Deny, as the walkthrough did. It never approves.
- **A journey from the blueprint** (FEAT-012, `journeys[].blueprint`): its
  title card names the blueprint journey and the story.
- **No findings on a journey**: it is still recorded. Its end card says
  that nothing was found, and what was not assessed.

## Success Metrics

- On the fixture app, every seeded finding appears in its journey's video
  at the step whose checkpoint found it, and none appears elsewhere.
- A technical leader shown one video can state each P0 and P1 problem and
  its recommendation without opening the report (checked with three people
  before the feature leaves draft).

## Constraints and Assumptions

- The app is HELIX-governed and assessed with FEAT-009. Other apps are
  later work.
- Journeys come from the blueprint (FEAT-012) by way of the manifest, or
  from the manifest itself. The video records what the agent walked. A
  journey the agent did not walk is listed as not recorded, never invented.
- The app's test data can be reset between chapters with the manifest's
  fixtures, so a replay that creates or deletes test data can run again.

## Dependencies

- **Features**: FEAT-009 (run package, replay, findings), FEAT-012
  (journeys and alternates in the blueprint), FEAT-011 (risky steps).
- **ADRs**: ADR-031, ADR-026, ADR-030.
- **Contracts**: CONTRACT-006 (`video` manifest field, `walkthrough.json`
  `steps[].do`, findings' `plain`, `assess video`, `video/`).
- **External**: Playwright's video recording; `ffmpeg` on the PATH for MP4.
  The player uses the browser's own `<video>` element, with no library.

## Out of Scope

- Spoken narration. Captions only, for now.
- Discovering flows the agent was not asked to walk.
- Apps not governed by HELIX.
- Hosting or uploading videos or the player anywhere.
- Editing the video by hand inside ux-builder.
