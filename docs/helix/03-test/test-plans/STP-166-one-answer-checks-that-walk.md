---
ddx:
  id: STP-166
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-166
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-166-one-answer-checks-that-walk

## Story Reference

**User Story**: [[US-166-one-answer-checks-that-walk]]
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-166's criteria with fixtures: no network, no model. The journey walk and the generated app's render run in a local Chromium against folders served on this machine; each is skipped where Chromium or vite is missing.
**Blocking Gate**: `npm test --workspace @ux-builder/design`, `npm test --workspace @ux-builder/ui`, `npm test --workspace @ux-builder/audit`, `npm test --workspace @ux-builder/create-app`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-166-AC1 | Given a design at step 4, when `step batch` records the person's answer with the alternative, modality, frame and theme, then the alternative is chosen, a decision for it and for the theme is written and approved with that answer with the items the alternative changed, the modality and core-2 are recorded, steps 4 and 5 are decided, the design moves to step 6, and the person is counted once. | `us-166-ac1` | the batch's records and one person turn | `@covers US-166-AC1` | Integration | `packages/design/test/batch.test.mjs` | Fixture apps in temp folders; local Chromium where a browser is needed | Built |
| US-166-AC2 | Given a design not at step 4, or a batch without the theme, the frame for responsive web, or a choice between two alternatives, when `step batch` runs, then it is refused and nothing is recorded. | `us-166-ac2` | each refusal, and the state unchanged | `@covers US-166-AC2` | Integration | `packages/design/test/batch.test.mjs` | Fixture apps in temp folders; local Chromium where a browser is needed | Built |
| US-166-AC3 | Given a step prototype from step 5, when it is checked, then each journey is walked in a browser by clicking its actions on the page (never the prototype's bar), a journey that stops is a finding saying where and why, and the drawn pages show each screen's other actions so they can be walked. | `us-166-ac3` | a walk through served pages; a stopped journey as a finding; secondary actions drawn | `@covers US-166-AC3` | Integration | `packages/audit/test/walk.test.mjs, packages/design/test/step-prototype.test.mjs, packages/ui/test/blueprint-entry-frame-states.test.mjs` | Fixture apps in temp folders; local Chromium where a browser is needed | Built |
| US-166-AC4 | Given test sessions where several participants hit the same problem, when the report is written, then it is one finding citing each session, and routing any of its IDs routes it once. | `us-166-ac4` | one merged finding; routed once | `@covers US-166-AC4` | Integration | `packages/design/test/report.test.mjs` | Fixture apps in temp folders; local Chromium where a browser is needed | Built |
| US-166-AC5 | Given a QR code or barcode marked `data-graphic`, when the lint runs, then its own `<svg>` and black and white colours pass, and an unmarked `<svg>` or another colour is still reported. | `us-166-ac5` | the marked graphic passes; the unmarked and other colours fail | `@covers US-166-AC5` | Integration | `packages/ui/test/lint.test.mjs` | Fixture apps in temp folders; local Chromium where a browser is needed | Built |
| US-166-AC6 | Given a state of a screen's own with `values`, then its wireframe and the built app show those values instead of the samples; the generated app's every screen opens with no page error; a list on a phone shows its first three items or those marked `compact`; and the prototype bar's links are readable in dark. | `us-166-ac6` | values in the wireframe and the built app; no page error; three fields on a phone; the bar's link colour | `@covers US-166-AC6` | Integration | `packages/ui/test/blueprint-entry-frame-states.test.mjs, packages/create-app/test/journey-app.test.mjs` | Fixture apps in temp folders; local Chromium where a browser is needed | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/design && npm test --workspace @ux-builder/ui && npm test --workspace @ux-builder/audit && npm test --workspace @ux-builder/create-app
```

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
