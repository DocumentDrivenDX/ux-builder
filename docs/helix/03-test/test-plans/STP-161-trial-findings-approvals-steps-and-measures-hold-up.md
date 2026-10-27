---
ddx:
  id: STP-161
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-161
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-161-the-trial-s-findings-approvals-steps-and-measures-hold-up-in-a-real-session

## Story Reference

**User Story**: [[US-161-the-trial-s-findings-approvals-steps-and-measures-hold-up-in-a-real-session]]
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-161's criteria with fixtures only: no network, no model, no browser.
**Blocking Gate**: `npm test --workspace @ux-builder/design`, `npm test --workspace @ux-builder/create-app`, `npm test --workspace @ux-builder/ui`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-161-AC1 | Given an approved document, when only its paragraph wrapping or the placement of bold or underline markers changes, then it stays approved; a change of its words still reopens it; and an approval recorded under the earlier normalization still holds. | `us-161-ac1` | It stays approved; a change of its words still reopens it; and an approval recorded under the earlier normalization still holds | `@covers US-161-AC1` | Integration | `packages/design/test/trial-fixes.test.mjs` | Fixture apps and blueprints in temp folders; no network, no model | Built |
| US-161-AC2 | Given core-2 is passed, then the design is at step 5 (Design the structure), still in Explore, with the modality as the next thing to do. | `us-161-ac2` | The design is at step 5 (Design the structure), still in Explore, with the modality as the next thing to do | `@covers US-161-AC2` | Integration | `packages/design/test/trial-fixes.test.mjs` | Fixture apps and blueprints in temp folders; no network, no model | Built |
| US-161-AC3 | Given an approved item that changed, when the agent approves it again without having shown it (review show, or review table of its kind), then the approval is refused and nothing is recorded; the coverage map approved again needs review map first; and each approval event records the person's answer. | `us-161-ac3` | The approval is refused and nothing is recorded; the coverage map approved again needs review map first; and each approval event records the person's answer | `@covers US-161-AC3` | Integration | `packages/design/test/trial-fixes.test.mjs` | Fixture apps and blueprints in temp folders; no network, no model | Built |
| US-161-AC4 | Given a session's events, when `metrics` runs, then testing starts at the testing milestone or at a step 7 the loop does not leave, the approvals before testing are the person's distinct answers, an approval reopened with unchanged words counts against the formatting target, and the prototype time is to the milestone marked when the person first tried it. | `us-161-ac4` | Testing starts at the testing milestone or at a step 7 the loop does not leave, the approvals before testing are the person's distinct answers, an approval reopened with unchanged words counts against the formatting target, and the prototype time is to the milestone marked when the person first tried it | `@covers US-161-AC4` | Integration | `packages/design/test/trial-fixes.test.mjs` | Fixture apps and blueprints in temp folders; no network, no model | Built |
| US-161-AC5 | Given a verified claim, when `evidence claim contradict <EV-n> <Cn> --text` runs, then the person's words are written in its Contradicting column and an open question asks which holds; `validate` warns about a contradicted claim no question asks about. | `us-161-ac5` | The person's words are written in its Contradicting column and an open question asks which holds; `validate` warns about a contradicted claim no question asks about | `@covers US-161-AC5` | Integration | `packages/design/test/trial-fixes.test.mjs` | Fixture apps and blueprints in temp folders; no network, no model | Built |
| US-161-AC6 | Given a blueprint whose journeys carry stories, when the brief lists a story as confirmed that no journey carries, then `validate` warns about it. | `us-161-ac6` | `validate` warns about it | `@covers US-161-AC6` | Integration | `packages/design/test/trial-fixes.test.mjs` | Fixture apps and blueprints in temp folders; no network, no model | Built |
| US-161-AC7 | Given a generated journey skeleton, then its prototype toolbar is folded to one line by default and names journeys by their goal, not their ID. | `us-161-ac7` | Its prototype toolbar is folded to one line by default and names journeys by their goal, not their ID | `@covers US-161-AC7` | Integration | `packages/create-app/test/journey-app.test.mjs` | Fixture apps and blueprints in temp folders; no network, no model | Built |
| US-161-AC8 | Given a screen whose pattern has no sample of its own, then its wireframe and prototype draw its content items as what they are: an input as a field with the primary action, data as three sample entries (ticked where the screen toggles items), feedback as a notice. | `us-161-ac8` | Its wireframe and prototype draw its content items as what they are: an input as a field with the primary action, data as three sample entries (ticked where the screen toggles items), feedback as a notice | `@covers US-161-AC8` | Integration | `packages/ui/test/blueprint-content.test.mjs` | Fixture apps and blueprints in temp folders; no network, no model | Built |
| US-161-AC9 | Given the design skill, then it says to approve only with the person's own approval of what was shown, to show the diff before re-approving a change (their own edits too), to record a contradiction with `evidence claim contradict` and ask, to mark the prototype milestone when the person first tries it, to re-read a whole story after changing part of it, and to run one command per call, without shell variables or scripts. | `us-161-ac9` | It says to approve only with the person's own approval of what was shown, to show the diff before re-approving a change (their own edits too), to record a contradiction with `evidence claim contradict` and ask, to mark the prototype milestone when the person first tries it, to re-read a whole story after changing part of it, and to run one command per call, without shell variables or scripts | `@covers US-161-AC9` | Integration | `packages/design/test/trial-fixes.test.mjs` | Fixture apps and blueprints in temp folders; no network, no model | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/design && npm test --workspace @ux-builder/create-app && npm test --workspace @ux-builder/ui
```

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
