---
ddx:
  id: STP-155
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-155
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-155-every-claim-that-shapes-the-design-names-its-source

## Story Reference

**User Story**: [[US-155-every-claim-that-shapes-the-design-names-its-source]]
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-155's criteria with fixtures only: no network, no model, no browser.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-155-AC1 | Given an evidence record, when `evidence claim add` runs with a source, a basis (observed or inferred) and a confidence, then it adds a row to the record's Claims table before the synthesis notes, with what contradicts it and what is unknown; without a source, a basis or a confidence it is refused. | `us-155-ac1` | It adds a row to the record's Claims table before the synthesis notes, with what contradicts it and what is unknown; without a source, a basis or a confidence it is refused | `@covers US-155-AC1` | Integration | `packages/design/test/human-time.test.mjs` | Fixture apps in temp folders; no network, no model | Built |
| US-155-AC2 | Given a direction-changing claim neither checked against its source nor marked low confidence, when `validate` runs, then it warns naming the claim, until `evidence claim verify` records the check or the claim is low confidence; a claims row with no source fails `validate`; and the skill tells the agent never to relay a subagent's summary as fact. | `us-155-ac2` | It warns naming the claim, until `evidence claim verify` records the check or the claim is low confidence; a claims row with no source fails `validate`; and the skill tells the agent never to relay a subagent's summary as fact | `@covers US-155-AC2` | Integration | `packages/design/test/human-time.test.mjs` | Fixture apps in temp folders; no network, no model | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
```

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
