---
ddx:
  id: STP-151
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-151
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-151-ids-explained-helix-read-as-it-is-a-choice-of-audit-and-the-reports-beside-the-design

## Story Reference

**User Story**: [[US-151-ids-explained-helix-read-as-it-is-a-choice-of-audit-and-the-reports-beside-the-design]]
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-151's criteria with fixtures only: no network, no model, no browser.
**Blocking Gate**: `npm test --workspace @ux-builder/design`, `@ux-builder/audit`, `@ux-builder/ui`, `@ux-builder/create-app`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-151-AC1 | Given a HELIX ID the guide shows (`FEAT-1`, `US-3`, `US-3-AC2`, `BR-1`, `ADR-008`, `UF-4`, `UF-4-01-list`) or a participant's pseudonym (`P1`), when `ux-builder-design explain <ID>` runs, then it prints what kind of thing the ID names and where it lives, with that kind's glossary term when there is one; `explain ids` lists only those kinds (ADR-042 decision 5: everything else is named by what it says); the overview says so; and the skill tells the agent to show names, not IDs. | `us-151-ac1` | It prints what kind of thing the ID names and where it lives, with that kind's glossary term when there is one; `explain ids` lists every kind; the overview mentions them; and the skill tells the agent never to show a bare ID | `@covers US-151-AC1` | Integration | `packages/design/test/lessons.test.mjs` | Fixture apps and HELIX repos in temp folders; no network, no model | Built |
| US-151-AC2 | Given HELIX stories with a `US-<n>` ID and no type tag, or with `type: user-story`, when the blueprint check reads the stories and the assessment collects the flow, then each is read as a user story, a corrected type is reported as information naming HELIX's type, the untyped warning says nothing is missing, and both skills tell the agent never to hand the person a command to edit HELIX or to guess a HELIX field. | `us-151-ac2` | Each is read as a user story, a corrected type is reported as information naming HELIX's type, the untyped warning says nothing is missing, and both skills tell the agent never to hand the person a command to edit HELIX or to guess a HELIX field | `@covers US-151-AC2` | Integration | `packages/audit/test/assess-lessons.test.mjs`, `packages/design/test/lessons.test.mjs`, `packages/ui/test/blueprint-stories-untyped.test.mjs` | Fixture apps and HELIX repos in temp folders; no network, no model | Built |
| US-151-AC3 | Given the person asks for an audit, when the guide's or the assessment's skill is followed, then it explains the UI audit and the usability assessment and asks which, or both, before running either; and `explain "UI audit"` and `explain "usability assessment"` define them. | `us-151-ac3` | It explains the UI audit and the usability assessment and asks which, or both, before running either; and `explain "UI audit"` and `explain "usability assessment"` define them | `@covers US-151-AC3` | Integration | `packages/design/test/lessons.test.mjs` | Fixture apps and HELIX repos in temp folders; no network, no model | Built |
| US-151-AC4 | Given an app with `docs/ux-builder/` and no `ux-assessment.yml` at its top, when the starter writes its manifest, `assess` runs without `--manifest`, and `ux-builder-audit` runs without `--out`, then the manifest is `docs/ux-builder/ux-assessment.yml`, its relative paths resolve from the app, runs go to `docs/ux-builder/assessments/<run>/` and the report to `docs/ux-builder/audit-report/`; and an app that keeps `ux-assessment.yml` at its top keeps all three there, `status` lists them, and `migrate` moves them and rewrites the app's references (a workflow's artifact name left as it is); and the app's `.gitignore` ignores `docs/ux-builder/assessments/` and `docs/ux-builder/runs/` (run output, ADR-042 decision 6). | `us-151-ac4` | The manifest is `docs/ux-builder/ux-assessment.yml`, its relative paths resolve from the app, runs go to `docs/ux-builder/assessments/<run>/` and the report to `docs/ux-builder/audit-report/`; and an app that keeps `ux-assessment.yml` at its top keeps all three there, `status` lists them, and `migrate` moves them and rewrites the app's references (a workflow's artifact name left as it is) | `@covers US-151-AC4` | Integration | `packages/audit/test/assess-lessons.test.mjs`, `packages/create-app/test/helix-wiring.test.mjs`, `packages/design/test/lessons.test.mjs` | Fixture apps and HELIX repos in temp folders; no network, no model | Built |
| US-151-AC8 | Given a journey named by what it is (`review`), or an older `J-review`, when the blueprint check or the assessment manifest is validated, then both pass, a name that is not kebab-case does not, and create-app's starter journey is `start`. | `us-151-ac8-journey-names` | a bare name and an older J- name pass; non-kebab fails | `@covers US-151-AC8` | Integration | `packages/audit/test/assess-manifest.test.mjs` | Fixture apps and HELIX repos in temp folders; no network, no model | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/design && npm test --workspace @ux-builder/audit && npm test --workspace @ux-builder/ui && npm test --workspace @ux-builder/create-app
```

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
