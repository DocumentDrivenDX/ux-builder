---
ddx:
  id: US-125
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-039
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-006
---

# US-125: Add research evidence and get it synthesized

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-18, GDL-19
**PRD Requirements**: FR-81
**Priority**: P1
**Status**: Draft

## Story

**As a** designer or developer using the guide (PRD primary persona)
**I want** to hand the guide interview notes, transcripts, analytics exports, support tickets and survey results
**So that** the agent can show me what users actually struggle with, without copying private material into the repository

## Context

Phase 2, evidence mode. `ux-builder-design evidence add` records each source as `docs/ux/evidence/EV-<n>.md`: its kind, date, provenance, a reference to the raw file and the masked excerpts the synthesis cites. Raw material stays where the owner keeps it. Participants appear only by pseudonym (ADR-039).

## Walkthrough

1. The owner runs `ux-builder-design evidence add interviews/p3.txt --kind interview --date 2026-10-20 --source "Field study"`.
2. The command writes `docs/ux/evidence/EV-1.md` with a reference to the file, not its content.
3. The agent synthesizes the sources and adds cited, masked excerpts with pseudonyms.
4. The synthesis lists repeated frustrations, common task sequences, unmet needs, segment differences and say-do conflicts.

## Acceptance Criteria

- [ ] **US-125-AC1** — Given a transcript file, when `ux-builder-design evidence add <file> --kind interview --date <d> --source <s>` runs, then it writes `docs/ux/evidence/EV-<n>.md` with the next free number, the kind, date, source and a reference to the file, and does not copy the file's text.
- [ ] **US-125-AC2** — Given a kind outside interview, analytics, support, feedback, survey and observation, when `evidence add` runs, then it exits 2 (bad input, CONTRACT-008), names the allowed kinds and writes nothing.
- [ ] **US-125-AC3** — Given an evidence file whose excerpts contain an email address, a phone number and a key matching the trace's patterns, when `ux-builder-design validate` runs, then it exits 1 and names each unmasked excerpt; after masking it exits 0.
- [ ] **US-125-AC4** — Given an excerpt that names a participant by the real name the owner listed for that pseudonym in `.ux-builder/participants.local.json` (kept out of git, ADR-039), when `validate` runs, then it fails until the excerpt uses the participant's pseudonym.
- [ ] **US-125-AC5** — Given three evidence files, when `ux-builder-design evidence list --json` runs, then it lists each with its ID, kind, date, source and the number of excerpts cited.
- [ ] **US-125-AC6** — Given a created app, when the skill's research section is read, then it tells the agent to report repeated frustrations, common task sequences, unmet needs, differences between segments and conflicts between what users say and do, each citing evidence IDs.

## Edge Cases

- **The raw file moves**: the reference is kept; `evidence list` marks it unreachable.
- **An analytics export with no participants**: no pseudonym map is needed.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-125-AC1 | a transcript file | `ux-builder-design evidence add <file> --kind interview --date <d> --source <s>` runs | it writes `docs/ux/evidence/EV-<n>.md` with the next free number, the kind, date, source and a reference to the file, and does not copy the file's text |
| AC2 | US-125-AC2 | a kind outside interview, analytics, support, feedback, survey and observation | `evidence add` runs | it exits 2 (bad input, CONTRACT-008), names the allowed kinds and writes nothing |
| AC3 | US-125-AC3 | an evidence file whose excerpts contain an email address, a phone number and a key matching the trace's patterns | `ux-builder-design validate` runs | it exits 1 and names each unmasked excerpt; after masking it exits 0 |
| AC4 | US-125-AC4 | an excerpt that names a participant by the real name the owner listed for that pseudonym in `.ux-builder/participants.local.json` (kept out of git, ADR-039) | `validate` runs | it fails until the excerpt uses the participant's pseudonym |
| AC5 | US-125-AC5 | three evidence files | `ux-builder-design evidence list --json` runs | it lists each with its ID, kind, date, source and the number of excerpts cited |
| AC6 | US-125-AC6 | a created app | the skill's research section is read | it tells the agent to report repeated frustrations, common task sequences, unmet needs, differences between segments and conflicts between what users say and do, each citing evidence IDs |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-18, GDL-19
- **PRD Requirements**: FR-81
- **External**: ADR-039, CONTRACT-008, SD-006

## Out of Scope

- Transcribing recordings (US-141).
- Hosting raw research files.
