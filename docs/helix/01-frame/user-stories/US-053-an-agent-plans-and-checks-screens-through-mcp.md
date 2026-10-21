---
ddx:
  id: US-053
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-008
    - kind: informed_by
      to: ADR-025
---

# US-053: An agent plans and checks screens through MCP

**Feature**: FEAT-008 — Interaction and information architecture: rules, blueprint and audit
**Feature Requirements**: AGT-01, AGT-02, RUL-05, BLU-01, BLU-02, BLU-04; the Determinism and Performance NFRs
**PRD Requirements**: FR-33, FR-34
**Priority**: P1
**Status**: Draft

## Story

**As a** AI coding agent building an app or a plug-in view
**I want** to get the applicable rules and a recipe, write a blueprint, and have it checked, from the SDK version the app installed
**So that** what I build follows the rules before a person reviews it

## Context

ADR-025 decision 5. The MCP server describes the installed SDK (FEAT-004 SDK-14); it gains rule, recipe and blueprint tools.

## Walkthrough

1. The agent calls `list_recipes` with "reviewers approve flagged time entries" and gets the queue-review recipe.
2. It calls `get_rules` for its target and `get_blueprint_schema`.
3. It writes a blueprint and calls `check_blueprint`; it fixes a destructive action with no safeguard and a list screen without an error state.
4. It builds the screens from the named patterns.

## Acceptance Criteria

- [ ] **US-053-AC1** — Given the MCP server, when `get_rules` is called with a context, size classes and inputs, then it returns the same rules as `rulesFor` for that target.
- [ ] **US-053-AC2** — Given words describing a job, when `list_recipes` is called with them, then recipes are returned best match first, and `get_recipe` returns a recipe's patterns and rule IDs.
- [ ] **US-053-AC3** — Given a blueprint, when `check_blueprint` is called, then it returns the validator's findings, and `get_blueprint_schema` returns the blueprint's JSON Schema.
- [ ] **US-053-AC4** — Given a blueprint whose screen names a pattern not in the catalogue, when it is checked, then the finding is an error naming the nearest pattern.
- [ ] **US-053-AC5** — Given a blueprint for an app supporting the compact size class with more top-level destinations than the rule allows, a modal containing another modal, a destructive action with no safeguard, and a collection screen without empty, loading and error states, when it is checked, then each produces a finding with its rule ID, path and fix.
- [ ] **US-053-AC6** — Given `get_guidance`, when called, then it includes the plan, check, build, lint and audit loop.
- [ ] **US-053-AC7** — Given the same blueprint and SDK version, when it is checked twice, then the two results are identical: the same findings in the same order, by `path` then `rule`, in plain string order (FEAT-008 NFR Determinism).
- [ ] **US-053-AC8** — Given a valid app blueprint of 50 screens, when it is checked, then the check finishes in under one second (FEAT-008 NFR Performance).
- [ ] **US-053-AC9** — Given CONTRACT-005's example blueprint, when it is checked, then it gives no finding.

## Edge Cases

- An empty job description: every recipe, in catalogue order.
- An app that supports medium but not compact, with six destinations: no destination finding; the limit is for the compact size class (US-053-AC5).

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Rules | US-053-AC1 | Target | get_rules | Same as rulesFor |
| Recipes | US-053-AC2 | Job words | list_recipes, get_recipe | Best match first; patterns and rules |
| Check | US-053-AC3 | Blueprint | check_blueprint, get_blueprint_schema | Findings; schema |
| Unknown pattern | US-053-AC4 | Pattern 'ListDetails' | check | Error naming ListDetail |
| Findings | US-053-AC5 | Four mistakes | check | Four findings |
| Guidance | US-053-AC6 | Server | get_guidance | Loop present |
| Determinism | US-053-AC7 | One blueprint with several findings | check twice | Identical results |
| Performance | US-053-AC8 | 50 screens | check | Under 1 s |
| Contract example | US-053-AC9 | CONTRACT-005's example | check | No findings |

## Dependencies

- **Feature Spec**: FEAT-008
- **Feature Requirements**: AGT-01, AGT-02, RUL-05, BLU-01, BLU-02, BLU-04
- **PRD Requirements**: FR-33, FR-34
- **External**: CONTRACT-004 and CONTRACT-005 revisions

## Out of Scope

- See FEAT-008 "Out of Scope".
