---
ddx:
  id: STP-152
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-152
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-152-an-approval-holds-until-the-meaning-changes-and-then-shows-the-change

## Story Reference

**User Story**: [[US-152-an-approval-holds-until-the-meaning-changes-and-then-shows-the-change]]
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-152's criteria with fixtures only: no network, no model, no browser.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-152-AC1 | Given an approved story, when only its frontmatter or its formatting (list markers, trailing spaces, blank lines) changes, then it stays approved, the approval having recorded the meaning approved, its hash and the whole content's hash. | `us-152-ac1` | It stays approved, the approval having recorded the meaning approved, its hash and the whole content's hash | `@covers US-152-AC1` | Integration | `packages/design/test/human-time.test.mjs` | Fixture apps in temp folders; no network, no model | Built |
| US-152-AC2 | Given an approved story, when its meaning changes, then `review` lists it as changed with a diff of only the changed lines (no frontmatter), `review show` prints the diff, and approving it again is counted as reopened in `metrics`. | `us-152-ac2` | `review` lists it as changed with a diff of only the changed lines (no frontmatter), `review show` prints the diff, and approving it again is counted as reopened in `metrics` | `@covers US-152-AC2` | Integration | `packages/design/test/human-time.test.mjs` | Fixture apps in temp folders; no network, no model | Built |
| US-152-AC3 | Given an approval recorded before meanings were kept (a hash of the whole content), when the item is unchanged, then it stays approved; and when it changes, then it is listed as changed, without a diff. | `us-152-ac3` | It stays approved; and when it changes, then it is listed as changed, without a diff | `@covers US-152-AC3` | Integration | `packages/design/test/human-time.test.mjs` | Fixture apps in temp folders; no network, no model | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
```

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
