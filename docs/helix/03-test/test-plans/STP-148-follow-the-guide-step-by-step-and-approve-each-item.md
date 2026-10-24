---
ddx:
  id: STP-148
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-148
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-148-follow-the-guide-step-by-step-and-approve-each-item

## Story Reference

**User Story**: [[US-148-follow-the-guide-step-by-step-and-approve-each-item]] (Follow the guide step by step, and approve each item)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-148's criteria with fixtures only: no network, no model, no browser.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-148-AC1 | Given any app, when `ux-builder-design overview` runs, then it lists the eight steps with what the person does in each, what comes out and the checkpoint that closes it; and the skill opens a first session with it. | `us-148-ac1` | It lists the eight steps with what the person does in each, what comes out and the checkpoint that closes it; and the skill opens a first session with it | `@covers US-148-AC1` | Integration | `packages/design/test/guided.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-148-AC2 | Given a design state, when `status` runs, then it leads with "Step <n> of 8: <name>" (or change mode's "Step <n> of 4", or "Baseline, before step 1"); `step next` moves to the next step, and a passed core checkpoint moves to the step after the ones it closes. | `us-148-ac2` | It leads with "Step <n> of 8: <name>" (or change mode's "Step <n> of 4", or "Baseline, before step 1"); `step next` moves to the next step, and a passed core checkpoint moves to the step after the ones it closes | `@covers US-148-AC2` | Integration | `packages/design/test/guided.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-148-AC3 | Given a term in the glossary, when `explain <term>` runs, then it prints what the term means and why it is valuable; `explain --step <n>` lists the terms that step introduces; an unknown term exits 2 listing the known ones; and the skill tells the agent to explain each term the first time it comes up. | `us-148-ac3` | It prints what the term means and why it is valuable; `explain --step <n>` lists the terms that step introduces; an unknown term exits 2 listing the known ones; and the skill tells the agent to explain each term the first time it comes up | `@covers US-148-AC3` | Integration | `packages/design/test/guided.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-148-AC4 | Given an app with target users, jobs, tasks and a decision, when `review` runs, then it lists every item not yet approved in its current form, in step order, each with its ID and step; and `review show <item>` prints the item's content to present inline. | `us-148-ac4` | It lists every item not yet approved in its current form, in step order, each with its ID and step; and `review show <item>` prints the item's content to present inline | `@covers US-148-AC4` | Integration | `packages/design/test/guided.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-148-AC5 | Given an item, when `review feedback <item> --text` records feedback, then `review approve <item>` refuses until `review respond <FB-n>` records how it was addressed; an approval records the person's words and the item's content, and an item changed after approval is listed for review again. | `us-148-ac5` | `review approve <item>` refuses until `review respond <FB-n>` records how it was addressed; an approval records the person's words and the item's content, and an item changed after approval is listed for review again | `@covers US-148-AC5` | Integration | `packages/design/test/guided.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-148-AC6 | Given items of steps 1 to 3 awaiting review, when `state checkpoint core-1 --answer` runs, then it exits 2 naming them and records nothing; likewise core-2 for step 4, core-3 for steps 5 to 7, and `step next` for the current step. | `us-148-ac6` | It exits 2 naming them and records nothing; likewise core-2 for step 4, core-3 for steps 5 to 7, and `step next` for the current step | `@covers US-148-AC6` | Integration | `packages/design/test/guided.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-148-AC7 | Given the skill, when it is read, then it tells the agent to present each item inline in the conversation, one at a time, collect and address the person's feedback, and get explicit approval before showing the next, and to say which step the person is on at each step. | `us-148-ac7` | It tells the agent to present each item inline in the conversation, one at a time, collect and address the person's feedback, and get explicit approval before showing the next, and to say which step the person is on at each step | `@covers US-148-AC7` | Integration | `packages/design/test/skill.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |

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
