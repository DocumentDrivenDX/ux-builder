---
ddx:
  id: US-108
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-016
    - kind: informed_by
      to: ADR-035
    - kind: informed_by
      to: CONTRACT-007
---

# US-108: The full transcript stays with its episode

**Feature**: FEAT-016 — Learning from builds
**Feature Requirements**: TRC-06
**PRD Requirements**: FR-70
**Priority**: P1
**Status**: Draft

## Story

**As an** app owner (PRD primary persona)
**I want** the agent's full transcript kept with the episode it belongs to, with secrets masked
**So that** the complete train of thought is there when we review or learn from a build

## Context

The operator chose full transcripts. create-app installs a Claude Code session-end hook; other agents import with `--file`. Masking runs before anything is written.

## Walkthrough

1. A Claude Code session ends in the app.
2. Its hook runs `ux-builder-trace attach-transcript`, which copies the transcript into `.ux-builder/transcripts/<episode>/`, masked, and writes a `transcript` event.

## Acceptance Criteria

- [ ] **US-108-AC1** — Given a created app, when `.claude/settings.json` is read, then it has a session-end hook running `npx ux-builder-trace attach-transcript`.
- [ ] **US-108-AC2** — Given the hook's JSON on stdin naming a transcript, when `attach-transcript` runs with an open episode, then the transcript is copied to `.ux-builder/transcripts/<episode>/` and a `transcript` event records its file, agent, bytes, sha256 and masked count.
- [ ] **US-108-AC3** — Given `attach-transcript --file other-agent.log`, when it runs, then that file is attached in the same way.
- [ ] **US-108-AC4** — Given a transcript containing an API key, a GitHub token, a JWT, a value from `.env` and a `redact.text` match, when it is attached, then each is replaced by `[masked:<kind>]` and the event's `masked` count is 5.
- [ ] **US-108-AC5** — Given `"transcripts": false` in `.ux-builder/config.json`, or an episode started with `--no-transcripts`, when `attach-transcript` runs, then nothing is copied and it says why.

## Edge Cases

- **No open episode**: the transcript goes to the unscoped episode.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-108-AC1 | a created app | `.claude/settings.json` is read | it has a session-end hook running `npx ux-builder-trace attach-transcript` |
| AC2 | US-108-AC2 | the hook's JSON on stdin naming a transcript | `attach-transcript` runs with an open episode | the transcript is copied to `.ux-builder/transcripts/<episode>/` and a `transcript` event records its file, agent, bytes, sha256 and masked count |
| AC3 | US-108-AC3 | `attach-transcript --file other-agent.log` | it runs | that file is attached in the same way |
| AC4 | US-108-AC4 | a transcript containing an API key, a GitHub token, a JWT, a value from `.env` and a `redact.text` match | it is attached | each is replaced by `[masked:<kind>]` and the event's `masked` count is 5 |
| AC5 | US-108-AC5 | `"transcripts": false` in `.ux-builder/config.json`, or an episode started with `--no-transcripts` | `attach-transcript` runs | nothing is copied and it says why |

## Dependencies

- **Feature Spec**: FEAT-016
- **Feature Requirements**: TRC-06
- **PRD Requirements**: FR-70
- **External**: ADR-035, CONTRACT-007

## Out of Scope

- Hooks for agents other than Claude Code.
