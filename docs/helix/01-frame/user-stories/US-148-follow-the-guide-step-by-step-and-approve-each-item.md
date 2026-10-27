---
ddx:
  id: US-148
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-008
---

# US-148: Follow the guide step by step, and approve each item

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-79
**PRD Requirements**: FR-77
**Priority**: P1
**Status**: Draft

## Story

**As a** designer or developer using the guide (PRD primary persona)
**I want** to know the whole process up front, where I am in it, what its terms mean, and to review and approve each thing it produces before it moves on
**So that** I understand and control the design, and my feedback is collected and acted on rather than skipped

## Context

The guide writes its work to files, which a person can easily never open: the review gets skipped, and the design moves on without the person's judgment. The conversation is where review happens. The guide shows each item inline, one at a time, and moves on only with the person's approval, with their feedback recorded and addressed. Commands make it hard to skip: a review list, recorded feedback and approvals, and checkpoints that will not pass while items await review.

## Walkthrough

1. A first session opens with an overview: eight steps, what the person does, what comes out, and the checkpoints.
2. "Step 2 of 8: Understand users." The agent explains "target user" and "job to be done" the first time they come up.
3. It shows target user U-1 inline and asks for feedback. The person says the context is wrong; the agent fixes it, records the feedback and what changed, shows it again, and the person approves. Then U-2.
4. The agent tries to ask core-1 while two tasks await review; the command refuses and names them.

## Acceptance Criteria

- [ ] **US-148-AC1** — Given any app, when `ux-builder-design overview` runs, then it lists the eight steps with what the person does in each, what comes out and the checkpoint that closes it; and the skill opens a first session with it.
- [ ] **US-148-AC2** — Given a design state, when `status` runs, then it leads with "Step <n> of 8: <name>" (or change mode's "Step <n> of 4", or "Baseline, before step 1"); `step next` moves to the next step, and a passed core checkpoint moves to the step after the ones it closes.
- [ ] **US-148-AC3** — Given a term in the glossary, when `explain <term>` runs, then it prints what the term means and why it is valuable; `explain --step <n>` lists the terms that step introduces; an unknown term exits 2 listing the known ones; and the skill tells the agent to explain each term the first time it comes up.
- [ ] **US-148-AC4** — Given an app with target users, jobs, tasks and a decision, when `review` runs, then it lists every item not yet approved in its current form, in step order, each with its ID and step; and `review show <item>` prints the item's content to present inline.
- [ ] **US-148-AC5** — Given an item, when `review feedback <item> --text` records feedback, then `review approve <item>` refuses until `review respond <FB-n>` records how it was addressed; an approval records the person's words and the item's content, and an item changed after approval is listed for review again.
- [ ] **US-148-AC6** — Given items of steps 1 to 3 awaiting review, when `state checkpoint core-1 --answer` runs, then it exits 2 naming them and records nothing; likewise core-2 for step 4, core-3 for steps 5 to 7, and `step next` for the current step.
- [ ] **US-148-AC7** — Given the skill, when it is read, then it tells the agent to present each foundation kind inline in the conversation as a table, every row in full, collect and address the person's feedback, and get explicit approval before the next kind (built items as the coverage map, GDL-83), and to say which step the person is on at each step. *(Amended 2026-10-27, GDL-83: one at a time became a table per kind.)*

## Edge Cases

- **The person wants to move on without reviewing**: the checkpoint can be skipped with a reason, as before; the items stay on the review list.
- **An item is removed**: its approval no longer matters; it leaves the list.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-148-AC1 | any app | `overview` | eight steps with what happens and the checkpoints |
| AC2 | US-148-AC2 | a design state | `status`; `step next`; core checkpoint | "Step n of 8"; moves on |
| AC3 | US-148-AC3 | the glossary | `explain`, `explain --step` | meaning and value; unknown term exits 2 |
| AC4 | US-148-AC4 | users, jobs, tasks, a decision | `review`, `review show` | the unapproved items in step order; inline content |
| AC5 | US-148-AC5 | an item with feedback | `approve`, `respond`, change | refused until addressed; changed item listed again |
| AC6 | US-148-AC6 | items awaiting review | checkpoint, `step next` | exit 2 naming them |
| AC7 | US-148-AC7 | the skill | read | inline, a table per kind, feedback, approval, step n of 8 |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-79
- **PRD Requirements**: FR-77
- **External**: CONTRACT-008

## Out of Scope

- Reviewing the HELIX documents the guide does not produce or rely on.
