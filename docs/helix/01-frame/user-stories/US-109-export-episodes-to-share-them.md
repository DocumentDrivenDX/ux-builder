---
ddx:
  id: US-109
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-016
    - kind: informed_by
      to: ADR-035
    - kind: informed_by
      to: ADR-023
    - kind: informed_by
      to: CONTRACT-007
---

# US-109: Export episodes to share them

**Feature**: FEAT-016 — Learning from builds
**Feature Requirements**: TRC-07
**PRD Requirements**: FR-71
**Priority**: P1
**Status**: Draft

## Story

**As an** app owner (PRD primary persona), Synaptiq's or a client's
**I want** to export chosen episodes as a bundle I review before it is written, with nothing sent by ux-builder
**So that** I decide what of my app's builds helps improve ux-builder

## Context

ADR-023 rule 8 forbids telemetry. An export is a person's act: it masks again, checks the schema, lists every file, and makes no network request.

## Walkthrough

1. The owner runs `ux-builder-trace export --since 2026-10-01 --out builds.tgz`.
2. It lists each file and its masked count and asks to confirm.
3. The owner sends builds.tgz to the learning store.

## Acceptance Criteria

- [ ] **US-109-AC1** — Given episodes in an app, when `export --episode <id>` or `--since <date>` runs, then it lists every file it will include with its masked count and asks for confirmation (`--yes` skips).
- [ ] **US-109-AC2** — Given confirmation, when the bundle is written, then it holds `bundle.json` (with the repository name hashed and no remote URL), each episode's events and its transcripts, and validates against `bundle.schema.json`.
- [ ] **US-109-AC3** — Given an unmasked secret pattern anywhere in the bundle, when `export` runs, then it exits 1 naming the file and line and writes nothing.
- [ ] **US-109-AC4** — Given `export`, when it runs, then it makes no network request (tested with networking blocked).

## Edge Cases

- **An episode still open**: export includes it only with `--include-open`.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-109-AC1 | episodes in an app | `export --episode <id>` or `--since <date>` runs | it lists every file it will include with its masked count and asks for confirmation (`--yes` skips) |
| AC2 | US-109-AC2 | confirmation | the bundle is written | it holds `bundle.json` (with the repository name hashed and no remote URL), each episode's events and its transcripts, and validates against `bundle.schema.json` |
| AC3 | US-109-AC3 | an unmasked secret pattern anywhere in the bundle | `export` runs | it exits 1 naming the file and line and writes nothing |
| AC4 | US-109-AC4 | `export` | it runs | it makes no network request (tested with networking blocked) |

## Dependencies

- **Feature Spec**: FEAT-016
- **Feature Requirements**: TRC-07
- **PRD Requirements**: FR-71
- **External**: ADR-035, ADR-023, CONTRACT-007

## Out of Scope

- Uploading the bundle.
