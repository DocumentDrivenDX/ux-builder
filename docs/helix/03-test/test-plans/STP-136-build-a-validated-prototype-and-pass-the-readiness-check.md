---
ddx:
  id: STP-136
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-136
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-136-build-a-validated-prototype-and-pass-the-readiness-check

## Story Reference

**User Story**: [[US-136-build-a-validated-prototype-and-pass-the-readiness-check]] (Build a validated prototype and pass the readiness check)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-136's criteria on fixtures: a fixture app, blueprint and design state, with no network, no model and no real participants.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-136-AC1 | Given a design state whose chosen alternative has a validated-prototype branch, when `ux-builder-design status --json` runs, then it reports the branch as `prototype: validated` until checkpoint core-3 is answered. | `us-136-ac1` | It reports the branch as `prototype: validated` until checkpoint core-3 is answered | `@covers US-136-AC1` | Integration | `packages/design/test/ready.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-136-AC2 | Given a validated prototype on which lint, `check:blueprint` or the audit reports an error, when the guide asks to show it to test users (`ux-builder-design ready --for testing`), then it refuses and names each failing check. | `us-136-ac2` | It refuses and names each failing check | `@covers US-136-AC2` | Integration | `packages/design/test/ready.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-136-AC3 | Given a design state listing faked data and error handling for the prototype, when `ux-builder-design ready` runs, then it lists each faked item and each acceptance criterion the prototype covers that no test cites with `@covers`, and exits 1 while any remain. | `us-136-ac3` | It lists each faked item and each acceptance criterion the prototype covers that no test cites with `@covers`, and exits 1 while any remain | `@covers US-136-AC3` | Integration | `packages/design/test/ready.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-136-AC4 | Given every covered criterion cited, the audit with no errors and nothing faked, when `ux-builder-design ready` runs, then it passes and asks checkpoint core-3; the answer is recorded with `state checkpoint core-3`. | `us-136-ac4` | It passes and asks checkpoint core-3; the answer is recorded with `state checkpoint core-3` | `@covers US-136-AC4` | Integration | `packages/design/test/ready.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |
| US-136-AC5 | Given the package's source, when it is searched, then no command in `@ux-builder/design` or `@ux-builder/ui` writes screen code into the app's `src/` (ADR-037). | `us-136-ac5` | No command in `@ux-builder/design` or `@ux-builder/ui` writes screen code into the app's `src/` (ADR-037) | `@covers US-136-AC5` | Integration | `packages/design/test/ready.test.mjs` | Fixture app and design state under `test/fixtures/`; no network, no model | |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network, a model or real participants
