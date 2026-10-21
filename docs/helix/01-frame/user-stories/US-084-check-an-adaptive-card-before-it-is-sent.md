---
ddx:
  id: US-084
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-011
    - kind: informed_by
      to: ADR-029
    - kind: informed_by
      to: SD-005
---

# US-084: Check an Adaptive Card before it is sent

**Feature**: FEAT-011 — AI and agent experience rules
**Feature Requirements**: AIC-02, AIC-03
**PRD Requirements**: FR-52
**Priority**: P1
**Status**: Draft

## Story

**As an** AI coding agent (PRD secondary persona) building an agent that answers with Adaptive Cards
**I want** to check a card payload against the card rules before the agent sends it
**So that** its cards are accessible, readable on a phone, and portable to other hosts, without a person reviewing every card

## Context

The card design guidance (TMS, ACH) and Copilot Studio's accessibility tips (CSA) become `card.*` rules (SD-005). `checkCard` runs the vendored 1.6 schema and those rules on a payload and returns FEAT-008-shaped findings; MCP serves it as `check_card`.

## Walkthrough

1. The agent drafts a card with seven actions, an input with only a placeholder, and four columns.
2. It calls `check_card` with the payload.
3. It gets warnings for `card.actions-few`, `card.input-label` and `card.columns-few`, each with a JSON Pointer and a fix.
4. It revises the card; the check returns no findings.

## Acceptance Criteria

Element mappings, exports and rule IDs are proposals in CONTRACT-004
*Adaptive Cards* and SD-005; the criteria name them so tests can cite them.

- [ ] **US-084-AC1** — Given a card that fails the vendored 1.6 schema, when `checkCard` runs, then it returns a `card.version` or schema finding naming the path, and runs no further rule on the invalid part.
- [ ] **US-084-AC2** — Given a card with more than six primary actions, when `checkCard` runs, then it warns `card.actions-few`.
- [ ] **US-084-AC3** — Given an input with no `label`, or a validated input with no `errorMessage`, when `checkCard` runs, then it warns `card.input-label` or `card.input-error` with the input's path.
- [ ] **US-084-AC4** — Given a TextBlock or ChoiceSet without `wrap: true`, a ColumnSet with more than three columns or fixed widths summing over 320 px, an Image without `altText`, or a hidden validated input, when `checkCard` runs, then it warns `card.wrap`, `card.columns-few`, `card.image-alt` or `card.no-hidden-inputs` respectively.
- [ ] **US-084-AC5** — Given an action titled only "Click here" or "Submit", when `checkCard` runs, then it warns `card.action-titles`.
- [ ] **US-084-AC6** — Given the MCP server, when an agent calls `check_card` with a card, then it returns the same findings as `checkCard`.
- [ ] **US-084-AC7** — Given a clean 1.6 sample card, when `checkCard` runs, then it returns no findings.

## Edge Cases

- **A card that is valid JSON but not a card** (no `type: AdaptiveCard`): one schema finding.
- **Review-only card rules** (`card.reading-order`, `card.image-transparent`, `card.sparingly`): returned by `get_rules`, not by `checkCard`.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-084-AC1 | a card that fails the vendored 1.6 schema | `checkCard` runs | it returns a `card.version` or schema finding naming the path, and runs no further rule on the invalid part |
| AC2 | US-084-AC2 | a card with more than six primary actions | `checkCard` runs | it warns `card.actions-few` |
| AC3 | US-084-AC3 | an input with no `label`, or a validated input with no `errorMessage` | `checkCard` runs | it warns `card.input-label` or `card.input-error` with the input's path |
| AC4 | US-084-AC4 | a TextBlock or ChoiceSet without `wrap: true`, a ColumnSet with more than three columns or fixed widths summing over 320 px, an Image without `altText`, or a hidden validated input | `checkCard` runs | it warns `card.wrap`, `card.columns-few`, `card.image-alt` or `card.no-hidden-inputs` respectively |
| AC5 | US-084-AC5 | an action titled only "Click here" or "Submit" | `checkCard` runs | it warns `card.action-titles` |
| AC6 | US-084-AC6 | the MCP server | an agent calls `check_card` with a card | it returns the same findings as `checkCard` |
| AC7 | US-084-AC7 | a clean 1.6 sample card | `checkCard` runs | it returns no findings |

## Dependencies

- **Stories**: US-047, US-048 (FEAT-007 approval and generated UI)
- **Feature Spec**: FEAT-011 (and FEAT-007 GEN-05, GEN-06)
- **Feature Requirements**: AIC-02, AIC-03
- **PRD Requirements**: FR-52
- **External**: Adaptive Cards open-source schema 1.6 (MIT); CONTRACT-004 *Adaptive Cards*; SD-005 (card rules)

## Out of Scope

- Fixing cards automatically.
