---
ddx:
  id: STP-125
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-125
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-125-add-research-evidence-and-get-it-synthesized

## Story Reference

**User Story**: [[US-125-add-research-evidence-and-get-it-synthesized]] (Add research evidence and get it synthesized)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-125's criteria with fixtures only: no network, no model, no browser unless a row says so.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-125-AC1 | Given a transcript file, when `ux-builder-design evidence add <file> --kind interview --date <d> --source <s>` runs, then it writes `docs/ux/evidence/EV-<n>.md` with the next free number, the kind, date, source and a reference to the file, and does not copy the file's text. | `us-125-ac1` | It writes `docs/ux/evidence/EV-<n>.md` with the next free number, the kind, date, source and a reference to the file, and does not copy the file's text | `@covers US-125-AC1` | Unit | `packages/design/test/evidence.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-125-AC2 | Given a kind outside interview, analytics, support, survey and observation, when `evidence add` runs, then it exits 1, names the allowed kinds and writes nothing. | `us-125-ac2` | It exits 1, names the allowed kinds and writes nothing | `@covers US-125-AC2` | Unit | `packages/design/test/evidence.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-125-AC3 | Given an evidence file whose excerpts contain an email address, a phone number and a key matching the trace's patterns, when `ux-builder-design validate` runs, then it exits 1 and names each unmasked excerpt; after masking it exits 0. | `us-125-ac3` | It exits 1 and names each unmasked excerpt; after masking it exits 0 | `@covers US-125-AC3` | Unit | `packages/design/test/evidence.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-125-AC4 | Given an excerpt that names a participant by a name listed in the evidence file's `participants` map, when `validate` runs, then it fails until the excerpt uses the participant's pseudonym. | `us-125-ac4` | It fails until the excerpt uses the participant's pseudonym | `@covers US-125-AC4` | Unit | `packages/design/test/evidence.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-125-AC5 | Given three evidence files, when `ux-builder-design evidence list --json` runs, then it lists each with its ID, kind, date, source and the number of excerpts cited. | `us-125-ac5` | It lists each with its ID, kind, date, source and the number of excerpts cited | `@covers US-125-AC5` | Unit | `packages/design/test/evidence.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-125-AC6 | Given a created app, when the skill's research section is read, then it tells the agent to report repeated frustrations, common task sequences, unmet needs, differences between segments and conflicts between what users say and do, each citing evidence IDs. | `us-125-ac6` | It tells the agent to report repeated frustrations, common task sequences, unmet needs, differences between segments and conflicts between what users say and do, each citing evidence IDs | `@covers US-125-AC6` | Content | `packages/design/test/evidence.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |

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
- [x] No test depends on the network or a model
