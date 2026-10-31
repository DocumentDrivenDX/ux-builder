---
ddx:
  id: STP-164
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-164
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-164-finish-for-me

## Story Reference

**User Story**: [[US-164-finish-for-me]]
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-164's criteria with fixtures only: no network, no model, no browser (the audit runner is injected).
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-164-AC1 | Given a blueprint with errors, or a job no task serves, when `finish` runs, then it exits 2 naming each, and nothing is written. | `us-164-ac1` | It exits 2 naming each, and nothing is written | `@covers US-164-AC1` | Integration | `packages/design/test/finish.test.mjs` | Fixture design folders in temp directories; the audit runner stubbed; no network, no model, no browser | To build |
| US-164-AC2 | Given a complete draft, when `finish` runs, then it writes the brief, wireframes, a step prototype and a test kit, and applies every pending HELIX proposal directly, each applied document marked assumed in its frontmatter (`ux-builder.assumed: true`) with a line under its title saying it was generated, not confirmed. | `us-164-ac2` | It writes the brief, wireframes, a step prototype and a test kit, and applies every pending HELIX proposal directly, each applied document marked assumed in its frontmatter (`ux-builder.assumed: true`) with a line under its title saying it was generated, not confirmed | `@covers US-164-AC2` | Integration | `packages/design/test/finish.test.mjs` | Fixture design folders in temp directories; the audit runner stubbed; no network, no model, no browser | To build |
| US-164-AC3 | Given a finish, then `docs/ux-builder/finish-summary.md` lists what the person confirmed (approved items, answered checkpoints), what was assumed (assumptions and unapproved items), what to check first (direction-changing assumptions and business rules) and what was not done (testing with people). | `us-164-ac3` | `docs/ux-builder/finish-summary.md` lists what the person confirmed (approved items, answered checkpoints), what was assumed (assumptions and unapproved items), what to check first (direction-changing assumptions and business rules) and what was not done (testing with people) | `@covers US-164-AC3` | Integration | `packages/design/test/finish.test.mjs` | Fixture design folders in temp directories; the audit runner stubbed; no network, no model, no browser | To build |
| US-164-AC4 | Given a finish, then every core checkpoint not yet answered is recorded as skipped with the reason "finished by the agent at the person's request", never as passed; the state records the finish with the person's words; and `status` says the design was finished with assumptions. | `us-164-ac4` | Every core checkpoint not yet answered is recorded as skipped with the reason "finished by the agent at the person's request", never as passed; the state records the finish with the person's words; and `status` says the design was finished with assumptions | `@covers US-164-AC4` | Integration | `packages/design/test/finish.test.mjs` | Fixture design folders in temp directories; the audit runner stubbed; no network, no model, no browser | To build |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
```

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
