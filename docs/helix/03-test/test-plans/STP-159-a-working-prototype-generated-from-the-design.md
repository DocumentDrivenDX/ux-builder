---
ddx:
  id: STP-159
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-159
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-159-a-working-prototype-generated-from-the-design

## Story Reference

**User Story**: [[US-159-a-working-prototype-generated-from-the-design]]
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-159's criteria with fixtures only: no network, no model, no browser.
**Blocking Gate**: `npm test --workspace @ux-builder/create-app`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-159-AC1 | Given a design folder whose blueprint has screens and journeys, when the app is built in place, then it has a route per screen showing its title, purpose and content in the blueprint's order with sample data, the journeys' actions leading step to step, and the blueprint's dialogs. | `us-159-ac1` | It has a route per screen showing its title, purpose and content in the blueprint's order with sample data, the journeys' actions leading step to step, and the blueprint's dialogs | `@covers US-159-AC1` | Integration | `packages/create-app/test/journey-app.test.mjs` | The fixture blueprint in temp folders; no network, no model | Built |
| US-159-AC2 | Given the generated app, when a screen is shown, then it can show its loading, empty, error and recovery states and the business-rule warnings its journeys cite; `?state=<name>` forces a state; and the prototype toolbar resets the sample data. | `us-159-ac2` | It can show its loading, empty, error and recovery states and the business-rule warnings its journeys cite; `?state=<name>` forces a state; and the prototype toolbar resets the sample data | `@covers US-159-AC2` | Integration | `packages/create-app/test/journey-app.test.mjs` | The fixture blueprint in temp folders; no network, no model | Built |
| US-159-AC3 | Given generated files, when they are read and `create-app --prototype` runs again, then each names the blueprint and its hash, files not edited by hand are replaced, and edited ones are left and listed. | `us-159-ac3` | Each names the blueprint and its hash, files not edited by hand are replaced, and edited ones are left and listed | `@covers US-159-AC3` | Integration | `packages/create-app/test/journey-app.test.mjs` | The fixture blueprint in temp folders; no network, no model | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/create-app
```

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
