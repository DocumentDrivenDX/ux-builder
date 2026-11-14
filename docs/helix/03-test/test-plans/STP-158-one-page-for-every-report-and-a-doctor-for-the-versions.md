---
ddx:
  id: STP-158
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-158
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-158-one-page-for-every-report-and-a-doctor-for-the-versions

## Story Reference

**User Story**: [[US-158-one-page-for-every-report-and-a-doctor-for-the-versions]]
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-158's criteria with fixtures only: no network, no model, no browser.
**Blocking Gate**: `npm test --workspace @ux-builder/audit`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-158-AC1 | Given an app with a UI audit and assessment runs, when either report is written, then `docs/ux-builder/reports.html` (the app's top on the old layout) is rewritten, listing what each report is in one sentence, the latest UI audit (date, themes, pass, warn and fail checks, a link), each assessment run newest first by its path (run, journeys and steps, findings, a link), every folder under `docs/ux-builder/runs/<kind>/` by path and modified date with a link, no run's content copied in (ADR-042 decision 6), the latest run's journeys step by step with thumbnails, and the @ux-builder versions that wrote each; the UI audit records its versions. | `us-158-ac1` | `docs/ux-builder/reports.html` (the app's top on the old layout) is rewritten, listing what each report is in one sentence, the latest UI audit (date, themes, pass, warn and fail checks, a link), each assessment run newest first (run, journeys and steps, findings, a link), the latest run's journeys step by step with thumbnails, and the @ux-builder versions that wrote each; the UI audit records its versions | `@covers US-158-AC1` | Integration | `packages/audit/test/reports-page.test.mjs` | Fixture reports and installs in temp folders; no network, no model | Built |
| US-158-AC2 | Given an app, when `ux-builder-audit reports` runs, then it rewrites the page and prints its path, and `--open` opens it. | `us-158-ac2` | It rewrites the page and prints its path, and `--open` opens it | `@covers US-158-AC2` | Integration | `packages/audit/test/reports-page.test.mjs` | Fixture reports and installs in temp folders; no network, no model | Built |
| US-158-AC3 | Given installed @ux-builder packages, when `ux-builder-audit doctor` runs, then it lists their versions and flags each dependency or peer range on another @ux-builder package, or the app's own range, that the installed version does not meet; it exits 1 when they disagree and 0 when they agree, and `--json` gives the same. | `us-158-ac3` | It lists their versions and flags each dependency or peer range on another @ux-builder package, or the app's own range, that the installed version does not meet; it exits 1 when they disagree and 0 when they agree, and `--json` gives the same | `@covers US-158-AC3` | Integration | `packages/audit/test/reports-page.test.mjs` | Fixture reports and installs in temp folders; no network, no model | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/audit
```

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
