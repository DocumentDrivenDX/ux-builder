---
ddx:
  id: STP-165
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-165
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-165-the-person-where-only-they-can-help

## Story Reference

**User Story**: [[US-165-the-person-where-only-they-can-help]]
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-165's criteria with fixtures only: no network, no model; the audit and the app's build are injected.
**Blocking Gate**: `npm test --workspace @ux-builder/design`, `npm test --workspace @ux-builder/ui`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-165-AC1 | Given HELIX 0.20's locations with `{n}`, `{nn}`, `{feature}` and `{view}`, when the blueprint is proposed, then no path holds a placeholder and each wireframe is its own file. | `us-165-ac1` | no path holds a placeholder and each wireframe is its own file | `@covers US-165-AC1` | Integration | `packages/ui/test/blueprint-propose.test.mjs` | Fixture apps in temp folders; audit and build stubbed; no network | Built |
| US-165-AC2 | Given a session, then a check is stamped when it ends with its seconds, step 1 has its minutes, a step logged twice is one entry, testing starts with the first kit, simulated sessions and evidence are marked and confirm no job, the share prints as a percent, the next action follows the steps, and a proposal ID without `--accepted` is refused. | `us-165-ac2` | a check is stamped when it ends with its seconds, step 1 has its minutes, a step logged twice is one entry, testing starts with the first kit, simulated sessions and evidence are marked and confirm no job, the share prints as a percent, the next action follows the steps, and a proposal ID without `--accepted` is refused | `@covers US-165-AC2` | Integration | `packages/design/test/instrumentation.test.mjs` | Fixture apps in temp folders; audit and build stubbed; no network | Built |
| US-165-AC3 | Given an approved brief, when a step prototype is drawn, then neither the brief nor the coverage map changes, and a PRD line that repeats the design state does not come back into the brief. | `us-165-ac3` | neither the brief nor the coverage map changes, and a PRD line that repeats the design state does not come back into the brief | `@covers US-165-AC3` | Integration | `packages/design/test/step-prototype.test.mjs` | Fixture apps in temp folders; audit and build stubbed; no network | Built |
| US-165-AC4 | Given a step prototype, when it is checked, then each screen's ideal state is audited at every size and its other states at one, a redraw keeps its rounds and audits only changed pages, and `step decide` waits until each finding is gone or accepted with a reason. | `us-165-ac4` | each screen's ideal state is audited at every size and its other states at one, a redraw keeps its rounds and audits only changed pages, and `step decide` waits until each finding is gone or accepted with a reason | `@covers US-165-AC4` | Integration | `packages/design/test/step-prototype.test.mjs` | Fixture apps in temp folders; audit and build stubbed; no network | Built |
| US-165-AC5 | Given a blueprint, then a screen with `entry` is not unreachable, a screen's `frame` draws it in that frame, a state of its own is drawn as its `stateNotices` notice (and refused without one), and `nav.audience` warns about a tab for other users. | `us-165-ac5` | a screen with `entry` is not unreachable, a screen's `frame` draws it in that frame, a state of its own is drawn as its `stateNotices` notice (and refused without one), and `nav.audience` warns about a tab for other users | `@covers US-165-AC5` | Integration | `packages/ui/test/blueprint-entry-frame-states.test.mjs` | Fixture apps in temp folders; audit and build stubbed; no network | Built |
| US-165-AC6 | Given screens with content, then wireframes and step prototypes draw that content (form fields by what each label asks, lists and details with sample values); once the app is built, the step prototype is the app and its routes are checked. | `us-165-ac6` | wireframes and step prototypes draw that content (form fields by what each label asks, lists and details with sample values); once the app is built, the step prototype is the app and its routes are checked | `@covers US-165-AC6` | Integration | `packages/ui/test/blueprint-entry-frame-states.test.mjs, packages/design/test/step-prototype.test.mjs` | Fixture apps in temp folders; audit and build stubbed; no network | Built |
| US-165-AC7 | Given the guide, then the intake asks how often and on what device, what each person must and must not give, and the rules; `scope` lists stories, criteria, screens, destinations and inputs to cut; and the skill makes steps 1 to 3 the person's and steps 4 to 6 one batch of defaults. | `us-165-ac7` | the intake asks how often and on what device, what each person must and must not give, and the rules; `scope` lists stories, criteria, screens, destinations and inputs to cut; and the skill makes steps 1 to 3 the person's and steps 4 to 6 one batch of defaults | `@covers US-165-AC7` | Integration | `packages/design/test/human-time.test.mjs, instrumentation.test.mjs, skill.test.mjs` | Fixture apps in temp folders; audit and build stubbed; no network | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/design && npm test --workspace @ux-builder/ui
```

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
