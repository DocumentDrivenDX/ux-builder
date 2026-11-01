---
ddx:
  id: STP-167
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-167
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-167-ask-what-others-see-walk-the-rows

## Story Reference

**User Story**: [[US-167-ask-what-others-see-walk-the-rows]]
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-167's criteria with fixtures: no network, no model. The journey walk and the generated app's render run in a local Chromium against folders served on this machine; each is skipped where Chromium or vite is missing.
**Blocking Gate**: `npm test --workspace @ux-builder/design`, `npm test --workspace @ux-builder/ui`, `npm test --workspace @ux-builder/audit`, `npm test --workspace @ux-builder/create-app`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-167-AC1 | Given the intake, then it asks what each person needs to see about the others and where each comes from; and given a blueprint with a form, a name, phone number, email, birth date or address shown on another screen that no form or journey step asks for is a `content.asked` warning. | `us-167-ac1` | the intake question; the warning and its silence once asked | `@covers US-167-AC1` | Integration | `packages/design/test/human-time.test.mjs, packages/ui/test/blueprint-entry-frame-states.test.mjs` | Fixture apps in temp folders; local Chromium where a browser is needed | Built |
| US-167-AC2 | Given a journey step on a list whose action leads to a screen, when the journey is walked, then the list's first row is tapped too, and a row that opens a different screen than the journey's next is a finding. | `us-167-ac2` | a misdirected row reported; the journey still walked; the finding in the check | `@covers US-167-AC2` | Integration | `packages/audit/test/walk.test.mjs, packages/design/test/step-prototype.test.mjs` | Fixture apps in temp folders; local Chromium where a browser is needed | Built |
| US-167-AC3 | Given a design folder without an app, then status says to record the step 4 batch with `step batch` and build on the accepted theme, and that the theme never blocks. | `us-167-ac3` | the status text before and after the modality | `@covers US-167-AC3` | Integration | `packages/create-app/test/design-first.test.mjs` | Fixture apps in temp folders; local Chromium where a browser is needed | Built |
| US-167-AC4 | Given an app built from a design on a theme without logo artwork, then its header shows the app's name alone (`Logo` with its fallback set to none). | `us-167-ac4` | the brand reads the app's name; the logo is hidden | `@covers US-167-AC4` | Integration | `packages/create-app/test/journey-app.test.mjs` | Fixture apps in temp folders; local Chromium where a browser is needed | Built |
| US-167-AC5 | Given the guide's events, then each is logged with its time of day, and an event with a bare date never starts or stretches a measured span. | `us-167-ac5` | the batch's events have times; a bare date does not move the start | `@covers US-167-AC5` | Integration | `packages/design/test/batch.test.mjs, packages/design/test/instrumentation.test.mjs` | Fixture apps in temp folders; local Chromium where a browser is needed | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/design && npm test --workspace @ux-builder/ui && npm test --workspace @ux-builder/audit && npm test --workspace @ux-builder/create-app
```

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
