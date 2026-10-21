---
ddx:
  id: STP-062
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-062
    - kind: informed_by
      to: SD-004
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-062-check-the-state-just-reached

## Story Reference

**User Story**: [[US-062-check-the-state-just-reached]] (Run checks on the state just reached)
**Technical Design**: N/A (SD-004 covers the story at this size)
**Related Solution Design**: [[SD-004-helix-aware-ux-assessment]]
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: `inspect()` checks a page in place; `audit()` runs on it; a shared CDP browser is inspected without disturbance; the three-checkpoint proof passes.
**Blocking Gate**: `node --test packages/audit/test/inspect.test.mjs packages/audit/test/inspect-cdp.test.mjs && npm test --workspace @ux-builder/audit`

**In Scope**
- `inspect()`, `attach()`, `assess browser`, `assess inspect`
- The fixture app and the proof

**Out of Scope**
- The replay adapter's step recorder (increment 2); its assertion path is tested here with a hand-written replay

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-062-AC1 | Given a Playwright page with an open dialog, a filled form or a signed-in session, when `inspect(page)` runs, then it does not navigate, reload, reset a form, switch theme or end the session, and the page's URL, form values and open dialog are unchanged afterwards. | `inspect leaves the page as it was` | After `inspect(page)` on the fixture's open dialog, filled form and signed-in page: same URL, same input values, dialog still `open`, session cookie present, no navigation event fired | `@covers US-062-AC1` | Integration | `packages/audit/test/inspect.test.mjs` | Fixture app | |
| US-062-AC2 | Given the same page, when inspected through `inspect()` and audited by URL through `audit()`, then the same checks give the same findings, because `audit()` calls `inspect()`. | `URL audit and inspect agree` | For the existing audit fixtures, `audit()` findings equal the findings from `inspect()` on the same page and theme; the existing suites pass unchanged | `@covers US-062-AC2` | Integration | `packages/audit/test/inspect.test.mjs`; audit.test.mjs, patterns.test.mjs, interaction.test.mjs | Existing fixtures | |
| US-062-AC3 | Given a browser started with a CDP endpoint and driven by another client, when `assess inspect --cdp` runs, then it inspects that page in place; and given a replay adapter, then it asserts the expected state before inspecting and reports a mismatch instead of findings when the assertion fails. | `CDP attach in place; replay mismatch reported` | A second Playwright client drives the fixture in a browser from `assess browser`; `assess inspect --cdp` finds the one matching page and inspects it with `mode: in-place`; a replay whose assertion fails writes `verified.passed: false` and no findings, exit 1 | `@covers US-062-AC3` | Integration | `packages/audit/test/inspect-cdp.test.mjs` | `assess browser` on a free port | |
| US-062-AC4 | Given an inspection, when its findings are written, then each carries the journey, step, role, viewport, theme and checkpoint IDs and a reference to a screenshot of the state inspected. | `findings carry checkpoint IDs and a screenshot` | Every finding in `inspection.json` has `checkpoint.id`, `journey`, `step`, `role`, `viewport`, `theme`, and the screenshot file exists | `@covers US-062-AC4` | Integration | `packages/audit/test/inspect-cdp.test.mjs` | As above | |
| US-062-AC5 | Given a check that moves focus, resizes, switches theme or presses Escape, when `inspect()` runs without asking for it, then it is skipped and listed; asked for, it runs in a separate pass that restores the URL, scroll, focus, viewport and theme, or reports that it could not. | `state-affecting checks are separate and restore` | Without the option, `focus-obscured` and the Escape test are in `skipped`; with it they run, focus and scroll are restored, and the closed dialog is named with `restored: false` | `@covers US-062-AC5` | Integration | `packages/audit/test/inspect.test.mjs` | Fixture dialog page | |
| US-062-AC6 | Given three checkpoints (a signed-in screen, an open dialog, and a form showing a validation error with its input kept), when each is inspected in place, then each produces findings linked to its checkpoint and the task can continue from the same state. | `three checkpoints, then the task continues` | Signed-in screen, open dialog, and validation error with input kept are each inspected in place with findings linked to their checkpoint; the client then completes sign-out, the dialog's action and a corrected submission from the same state | `@covers US-062-AC6` | Integration | `packages/audit/test/inspect-cdp.test.mjs` | Fixture app | |

## Executable Proof

### Primary Commands

```bash
node --test packages/audit/test/inspect.test.mjs packages/audit/test/inspect-cdp.test.mjs && npm test --workspace @ux-builder/audit
```

### Coverage Focus

- P0: every row above.
- P1: the edge cases below.

## Data and Setup

| Need | Required For | Source / Strategy |
|------|--------------|-------------------|
| Temp directories and git repositories | All rows | Created per test, removed after |
| Built `@ux-builder/ui` and `@ux-builder/tokens` CSS | Browser rows | `npm run build` before the suite, as the audit suites need |

## Edge Cases and Failure Modes

- The page is closed before inspection: exit 1 `checkpoint lost`.
- Two pages match `--page`: exit 1 listing both.

## Build Handoff

**Implementation Order**
1. The first row's test, red, then the code that turns it green.
2. The remaining rows in order.

**Constraints**
- CONTRACT-006 formats; ADR-026 decisions; the existing audit suites pass unchanged.

**Done When**
- [ ] Every in-scope acceptance criterion has passing evidence
- [ ] Named commands or test files exist and run
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`
- [ ] The story can fail red before implementation and pass green after implementation

## Review Checklist

- [x] References the governing story and design
- [x] Every active acceptance criterion maps to concrete failing tests, keyed by its stable ID
- [x] Every row names the asserted behavior
- [x] Every row records its `@covers` citation
- [x] File paths and commands are specific
- [x] Setup and fixtures are explicit
- [x] Edge cases cover real story risks
- [x] Scope is one story slice
- [x] Build handoff gives a usable sequence
