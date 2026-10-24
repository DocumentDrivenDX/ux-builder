---
ddx:
  id: US-147
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-036
    - kind: informed_by
      to: CONTRACT-008
---

# US-147: Design how users meet each business rule

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-78
**PRD Requirements**: FR-82
**Priority**: P2
**Status**: Draft

## Story

**As a** designer or developer using the guide (PRD primary persona)
**I want** each business rule a task depends on linked to where it applies, with how the user learns of it, what they see when it blocks them and how they recover
**So that** rules are designed into the experience and tested with people, instead of surfacing as surprise errors

## Context

Business rules ("orders over $500 need a manager's approval", "only public stretches can be saved") are defined in HELIX: the PRD, a feature spec or the solution design's Business Rules section. Until now the design loop saw them only as acceptance criteria and task exceptions in prose; nothing named a rule or followed it to the screens it affects, and nobody asked how the user meets it. A rule keeps its single definition in HELIX, written `**BR-<n>** — <rule>` like an acceptance criterion; the blueprint says where it applies and how the user meets it.

## Walkthrough

1. The solution design lists `**BR-1** — Only stretches with public access can be saved.`
2. Task T-1 cites BR-1; the journey's save step cites it too.
3. The guide asks four questions and records the answers in the blueprint's `businessRules`: the trigger (the river has no public access), before (the list marks private stretches), blocked (Save is replaced by "Private: no public access"), recover (nearby public stretches are offered).
4. The test kit adds a task: "You want to find a river to fish this weekend, and the one you like best has no public access."
5. The evaluation report shows how people fared with BR-1.

## Acceptance Criteria

- [ ] **US-147-AC1** — Given HELIX documents defining `**BR-<n>**` rules, when a blueprint task or journey step cites a rule HELIX does not define, then `ux-builder-design validate` exits 1 naming the item and the rule.
- [ ] **US-147-AC2** — Given a task citing a rule, when the blueprint's `businessRules` has no entry for it, or the entry lacks its trigger, how the user learns before acting, what they see when blocked, or how they recover, then `validate` exits 1 naming the rule and each missing answer.
- [ ] **US-147-AC3** — Given tasks citing rules with their trigger, when `test-kit` runs, then the kit has a task per cited rule whose goal is the task's goal in the rule's trigger situation, with no interface words, and whose success criterion is the rule's ID.
- [ ] **US-147-AC4** — Given imported observations for a kit with rule tasks, when `report` runs, then a Business rules section lists each cited rule with its kit tasks' completion and the problems seen, and a cited rule no kit tested is listed under Not tested.
- [ ] **US-147-AC5** — Given a rule cited by a task and a step, when `trace BR-<n>` runs, then it lists the HELIX document defining it and the tasks, journeys and screens it applies to; and `impact` of a change naming the rule reaches them.
- [ ] **US-147-AC6** — Given the skill, when the agent models tasks, then it tells the agent to cite each business rule by ID and ask the person the four questions for it.

## Edge Cases

- **No business rules**: nothing changes.
- **A rule defined twice in HELIX**: `validate` warns, naming both documents.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-147-AC1 | a task or step citing an undefined rule | `validate` runs | exit 1 naming the item and the rule |
| AC2 | US-147-AC2 | a cited rule with no or partial `businessRules` entry | `validate` runs | exit 1 naming the rule and each missing answer |
| AC3 | US-147-AC3 | tasks citing rules with triggers | `test-kit` runs | a task per rule in its trigger situation, success: the rule ID |
| AC4 | US-147-AC4 | observations for rule tasks | `report` runs | Business rules section; untested rules under Not tested |
| AC5 | US-147-AC5 | a rule cited by a task and a step | `trace BR-<n>`; `impact` | the HELIX document, tasks, journeys and screens |
| AC6 | US-147-AC6 | the skill | the agent models tasks | it cites rules by ID and asks the four questions |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-78
- **PRD Requirements**: FR-82
- **External**: ADR-036, CONTRACT-008

## Out of Scope

- Writing or changing business rules: they stay HELIX's, changed through `propose`.
- Checking that the built app enforces a rule (a test's job, cited by `@covers`).
