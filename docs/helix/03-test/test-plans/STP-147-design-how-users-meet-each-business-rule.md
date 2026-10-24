---
ddx:
  id: STP-147
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-147
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-147-design-how-users-meet-each-business-rule

## Story Reference

**User Story**: [[US-147-design-how-users-meet-each-business-rule]] (Design how users meet each business rule)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-147's criteria with fixtures only: no network, no model, no browser.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-147-AC1 | Given HELIX documents defining `**BR-<n>**` rules, when a blueprint task or journey step cites a rule HELIX does not define, then `ux-builder-design validate` exits 1 naming the item and the rule. | `us-147-ac1` | `ux-builder-design validate` exits 1 naming the item and the rule | `@covers US-147-AC1` | Integration | `packages/design/test/business-rules.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-147-AC2 | Given a task citing a rule, when the blueprint's `businessRules` has no entry for it, or the entry lacks its trigger, how the user learns before acting, what they see when blocked, or how they recover, then `validate` exits 1 naming the rule and each missing answer. | `us-147-ac2` | `validate` exits 1 naming the rule and each missing answer | `@covers US-147-AC2` | Integration | `packages/design/test/business-rules.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-147-AC3 | Given tasks citing rules with their trigger, when `test-kit` runs, then the kit has a task per cited rule whose goal is the task's goal in the rule's trigger situation, with no interface words, and whose success criterion is the rule's ID. | `us-147-ac3` | The kit has a task per cited rule whose goal is the task's goal in the rule's trigger situation, with no interface words, and whose success criterion is the rule's ID | `@covers US-147-AC3` | Integration | `packages/design/test/business-rules.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-147-AC4 | Given imported observations for a kit with rule tasks, when `report` runs, then a Business rules section lists each cited rule with its kit tasks' completion and the problems seen, and a cited rule no kit tested is listed under Not tested. | `us-147-ac4` | A Business rules section lists each cited rule with its kit tasks' completion and the problems seen, and a cited rule no kit tested is listed under Not tested | `@covers US-147-AC4` | Integration | `packages/design/test/business-rules.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-147-AC5 | Given a rule cited by a task and a step, when `trace BR-<n>` runs, then it lists the HELIX document defining it and the tasks, journeys and screens it applies to; and `impact` of a change naming the rule reaches them. | `us-147-ac5` | It lists the HELIX document defining it and the tasks, journeys and screens it applies to; and `impact` of a change naming the rule reaches them | `@covers US-147-AC5` | Integration | `packages/design/test/business-rules.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-147-AC6 | Given the skill, when the agent models tasks, then it tells the agent to cite each business rule by ID and ask the person the four questions for it. | `us-147-ac6` | It tells the agent to cite each business rule by ID and ask the person the four questions for it | `@covers US-147-AC6` | Integration | `packages/design/test/skill.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
