---
ddx:
  id: STP-141
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-141
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-141-import-observations-and-consented-transcripts

## Story Reference

**User Story**: [[US-141-import-observations-and-consented-transcripts]] (Import observations and consented transcripts)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-141's criteria on fixtures: a fixture app, blueprint and design state, with no network, no model and no real participants.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-141-AC1 | Given a filled observation sheet, when `observe import <file> --study <study>` runs, then each row becomes a finding with `source: human`, a pseudonym, the task, completed, time, errors, assists and a paraphrased remark, with a stable `F-` key, in the study's run folder (`findings.json`, run output). | `us-141-ac1` | Each row becomes a finding with `source: human`, a pseudonym, the task, completed, time, errors, assists and a paraphrased remark, with a stable `F-` ID | `@covers US-141-AC1` | Integration | `packages/design/test/observations.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-141-AC2 | Given a sheet whose remarks contain a name, an email and a phone number, when it is imported, then they are masked before anything is written, and participants appear only by pseudonym. | `us-141-ac2` | They are masked before anything is written, and participants appear only by pseudonym | `@covers US-141-AC2` | Integration | `packages/design/test/observations.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-141-AC3 | Given `transcript add` without `--consent-confirmed`, when it runs, then it refuses, says consent must be confirmed for that session, and writes nothing. | `us-141-ac3` | It refuses, says consent must be confirmed for that session, and writes nothing | `@covers US-141-AC3` | Integration | `packages/design/test/observations.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-141-AC4 | Given a consented transcript, when `transcript add --study <study>` runs, then it proposes the transcript as a source of the study and only masked, cited excerpts with timestamps for its *Findings*, and records the consent (with the study and its participants) in the design state; an audio or video file is refused. | `us-141-ac4` | It stores only masked, cited excerpts with timestamps and a reference to the source, and the consent confirmation in the design state; an audio or video file is refused | `@covers US-141-AC4` | Integration | `packages/design/test/observations.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-141-AC5 | Given five imported sessions for one kit, when `ux-builder-design rubric --json` runs, then it reports per task the completion rate, median time, error rate and assists, and the problems seen in two or more sessions. | `us-141-ac5` | It reports per task the completion rate, median time, error rate and assists, and the problems seen in two or more sessions | `@covers US-141-AC5` | Integration | `packages/design/test/observations.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-141-AC6 | Given findings from the agent and from people in one run, when they are listed, then each is labelled `human` (verified observation) or `agent` (recommendation), and no agent recommendation carries `source: human`. | `us-141-ac6` | Each is labelled `human` (verified observation) or `agent` (recommendation), and no agent recommendation carries `source: human` | `@covers US-141-AC6` | Integration | `packages/audit/test/assess-source.test.mjs`, `packages/design/test/observations.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network, a model or real participants
