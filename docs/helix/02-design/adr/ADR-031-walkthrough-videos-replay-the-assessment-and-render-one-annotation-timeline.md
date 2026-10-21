---
ddx:
  id: ADR-031
  type: adr
  status: proposed
  links:
    - kind: informed_by
      to: ADR-026
    - kind: informed_by
      to: ADR-030
    - kind: informs
      to: FEAT-013
    - kind: informs
      to: CONTRACT-006
---

# ADR-031: Walkthrough videos replay the assessment's journeys and render one annotation timeline as an MP4 and an interactive player

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-21 | **Proposed** (operator 2026-10-21: "a full walkthrough of an application (all flows) using playwright and generate a video with annotation on usability problems it found and recommendations") | Operator | ADR-026, ADR-030, FEAT-009, FEAT-012, FEAT-013, CONTRACT-006 | Medium |

## Context

The UX assessment (ADR-026) has an agent walk an app's journeys in a
browser, inspect checkpoints in place, and merge findings into a backlog
with a report. The operator wants the same run to produce a video per
journey that shows the problems found and what to do about them.

The operator answered these questions on 2026-10-21:
- The audience is the product or technical leader who built the app.
- Flows come from the blueprint's journeys (FEAT-012).
- The apps are HELIX-governed, to start.
- Annotations cover both checked and judged problems.
- Recommendations are in plain English in the video, with specifics in the
  report.
- The output is one MP4 per journey, at desktop size by default, and
  also an HTML version where the annotations are HTML pop-ups (operator,
  later the same day: "Include the HTML version you suggested where the
  'annotations' are HTML objects that pop up").
- The app provides a login or guest access.
- Sensitive data is masked.

## Decision

1. **Explore, then replay for the camera.** The agent's walk is not
   filmed. It pauses to reason and it retries. While walking, the agent
   records each browser action as a replayable step
   (`walkthrough.json` `steps[].do`). `assess video` then replays the
   steps in a browser of its own (as `inspect --replay` does) and records
   that. The video is reproducible, paced for a viewer, and free of the
   agent's dead ends.
2. **The video shows the backlog; it finds nothing.** Every annotation is
   a merged finding with its F- ID, shown at the checkpoint whose evidence
   it cites. The replay re-checks each checkpoint's state, and a finding is
   never shown on a state the replay did not reach.
3. **Record once, clean; render one annotation timeline twice.** The
   replay injects only a cursor and click marks (in a closed shadow root
   above the app, with no pointer events). At each checkpoint with
   findings, it holds the page still for the reading time and writes to
   `annotations.json` each finding's time range and its elements' boxes in
   viewport pixels. Because the page is still while it holds, a box is
   fixed for its whole range, and no per-frame tracking is needed. The
   clean recording and the timeline are then rendered twice:
   - **the MP4**: each caption is rendered to an image by Playwright from
     the same HTML and CSS as the player's pop-up, and `ffmpeg` composites
     the outlines and caption images over the clean video for their time
     ranges;
   - **the player** (`index.html`): it plays the clean video and draws the
     same pop-ups as live HTML, positioned from the boxes and scaled with
     the video.

   The two cannot disagree, because they share the timeline and the caption
   markup. This replay is never an inspection, so the cursor layer cannot
   affect a finding.
4. **MP4 by system `ffmpeg`, not shipped.** Playwright records WebM.
   Compositing, encoding H.264 MP4, joining chapters and adding title cards
   use `ffmpeg` found on the PATH. The SDK does not bundle or redistribute
   ffmpeg, so its LGPL/GPL terms are not ours to meet, and the licence
   check is unchanged. Without it, the stage is `partial`, no MP4 is
   written, and the player still works from the clean WebM and the
   timeline. *(Confirmed by the operator 2026-10-21: "ffmpeg on the PATH is fine"; `ux-builder-87cc5d3b`.)*
5. **Plain English is a field of the finding.** Each finding gains
   `plain: { problem, recommendation }`, written by the agent with the
   finding. The video and the report's summary use it. The rule, component
   mapping and HELIX proposal stay the specifics. Checked and judged
   findings are labelled differently in the caption (COV-02).
6. **Privacy by construction.** The manifest's `evidence.redact` applies
   from the first frame of each chapter, by an init script that masks
   matching elements and text as they appear. If it cannot be installed,
   nothing is recorded. The role signs in before recording starts.
   Secret values are recorded by reference and masked when typed. Videos
   stay in the run package.
7. **The player is a static page of the SDK's own.** `index.html` opens
   from the file system with no server, network or third-party library. It
   uses the browser's `<video>` and the `ux-builder` theme, and is audited
   like any SDK page. The pop-ups pause playback by default, expand for
   evidence and link to the finding in `report.html`.
8. **One file per journey and viewport, chaptered.** The main path, then
   each alternate, is a chapter, with title cards. *(Built 2026-10-21 as one
   recording per journey: between chapters, behind a card, the fixture is
   reset and cookies and storage are put back to the role's signed-in
   state. Joining separate recordings would have needed `ffmpeg` for the
   player too; CONTRACT-006 Walkthrough videos.)*
   Desktop 1440 × 900 is the default; `video.viewports` adds others.

## Alternatives Considered

| Option | Pros | Cons | Evaluation |
|---|---|---|---|
| Film the agent's own walk (CDP screencast) | One pass; no replay | Pauses, retries and dead ends on screen; not reproducible; the inspection would share a page with the camera | Rejected |
| Draw annotations in the page during the replay | Outlines follow scroll and reflow; no compositing | Burned into the recording, so the player could not make them interactive without a second, unannotated replay that might diverge | Rejected for the timeline (decision 3) |
| Burn annotations in from per-frame element tracking | Annotations could move with the page | Per-frame geometry; unnecessary, because the replay holds still while a finding shows | Rejected |
| The HTML player only | No encoder | Not a single shareable file; the operator asked for MP4 | Both: player and MP4 |
| A third-party video player library | Richer controls | A dependency and licence to check; the native `<video>` suffices | Rejected |
| Spoken narration (text-to-speech) | Closer to a demo | A speech dependency; captions suffice for a first release | Deferred |
| An agent explores unlisted flows for the video | Finds more | Not reproducible; the assessment's coverage would not explain the video | Out of scope |

## Consequences

| Type | Impact |
|------|--------|
| Positive | A shareable MP4 and an explorable player from every assessment; reproducible from the run package; consistent with each other and with the report |
| Negative | The agent must record replayable steps and plain-English text; a system dependency for MP4 |
| Neutral | CONTRACT-006 gains `video`, `steps[].do`, `plain` and `assess video` |

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| A replay diverges from the walked state (timing, data) | Medium | Medium | Re-check each checkpoint (REP-05); fixture reset per chapter; a stop card, never a wrong annotation |
| Sensitive data on screen | Low | High | Masking from first paint (fail closed); no sign-in on camera; secrets by reference; staging or local only |
| Plain English oversimplifies a finding | Medium | Low | The F- ID on every caption; the report holds the specifics |
| Injected cursor layer clashes with app CSS | Low | Low | A closed shadow root with its own styles |
| A pop-up's position drifts from its element at another player size | Low | Low | Boxes in viewport pixels, scaled with the video's rendered size; tested at three player sizes |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| FEAT-013's success metrics | Playwright changes its video API; a request for narration or non-HELIX apps |

## Concern Impact

No slot changes.

## References

- Playwright `browser.newContext({ recordVideo })`.
- FFmpeg licensing, <https://ffmpeg.org/legal.html>.
