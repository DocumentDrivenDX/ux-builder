---
ddx:
  id: STP-157
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-157
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-157-the-modality-is-judged-by-what-the-app-does-at-the-sizes-it-chose

## Story Reference

**User Story**: [[US-157-the-modality-is-judged-by-what-the-app-does-at-the-sizes-it-chose]]
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-157's criteria with fixtures only: no network, no model.
**Blocking Gate**: `npm test --workspace @ux-builder/audit`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-157-AC1 | Given a page framed by a main landmark that fits, or an AppShell with no navigation, when the audit judges responsive-web, then it passes; where navigation exists it must still adapt by size class, and a blueprint with one top-level destination needs no navigation check. | `us-157-ac1` | It passes; where navigation exists it must still adapt by size class, and a blueprint with one top-level destination needs no navigation check | `@covers US-157-AC1` | Integration (Chromium) | `packages/audit/test/modality-outcome.test.mjs` | Fixture pages served locally in Chromium; no network, no model | Built |
| US-157-AC2 | Given chosen size classes (the blueprint's `supports.sizeClasses`, else `--size-classes`), when the audit runs, then only their widths are audited, and a size class that was not chosen is never reported as unchecked. | `us-157-ac2` | Only their widths are audited, and a size class that was not chosen is never reported as unchecked | `@covers US-157-AC2` | Integration (Chromium) | `packages/audit/test/modality-outcome.test.mjs` | Fixture pages served locally in Chromium; no network, no model | Built |
| US-157-AC3 | Given a failing responsive-web verdict, when it is reported, then it says which outcome failed (content overflowing at a width, navigation that exists but does not adapt), never that AppShell is missing when another frame passes, and that it is missing only when there is no AppShell and no main landmark. | `us-157-ac3` | It says which outcome failed (content overflowing at a width, navigation that exists but does not adapt), never that AppShell is missing when another frame passes, and that it is missing only when there is no AppShell and no main landmark | `@covers US-157-AC3` | Integration (Chromium) | `packages/audit/test/modality-outcome.test.mjs` | Fixture pages served locally in Chromium; no network, no model | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/audit
```

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
