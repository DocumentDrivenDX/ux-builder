---
ddx:
  id: US-085
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-011
    - kind: informed_by
      to: FEAT-007
    - kind: informed_by
      to: ADR-029
    - kind: informed_by
      to: US-047
---

# US-085: Card actions call the app, with approval when high-impact

**Feature**: FEAT-011 — AI and agent experience rules
**Feature Requirements**: AIC-04; FEAT-007 GEN-06
**PRD Requirements**: FR-51
**Priority**: P1
**Status**: Draft

## Story

**As an** app developer (PRD primary persona) whose agent's cards can pay, send or delete
**I want** card actions to reach my app with the card's inputs, and high-impact ones to wait for the user's approval
**So that** a card can never pay, send or delete on the user's behalf without the user saying yes

## Context

A card's `Action.Submit` and `Action.Execute` carry data and inputs to the host. ADR-029 decision 5: an action marked `"ux-builder": { "highImpact": true, "consequence" }` in its data gets FEAT-007's approval (AGT-T-04) before `onAction`; `destructive` actions get FEAT-008's safeguard; `Action.OpenUrl` is a link marked as leaving the app. `checkCard` flags unmarked actions whose titles name paying, sending or deleting.

## Walkthrough

1. The agent sends a card with an amount input and an `Action.Execute` "Pay invoice" marked high-impact.
2. The user edits the amount and presses Pay invoice.
3. An approval states "Pay £120.00 to Acme Ltd" with Approve and Deny.
4. The user approves; `onAction` receives the verb, data (without the `ux-builder` key) and inputs.
5. The card records the choice and its actions are no longer available.

## Acceptance Criteria

Element mappings, exports and rule IDs are proposals in CONTRACT-004
*Adaptive Cards* and SD-005; the criteria name them so tests can cite them.

- [ ] **US-085-AC1** — Given an `Action.Submit` or `Action.Execute` not marked high-impact, when the user activates it, then `onAction` receives its type, id or verb, data and the card's inputs.
- [ ] **US-085-AC2** — Given an action marked high-impact, when the user activates it, then an approval stating its `consequence` with Approve and Deny appears, and `onAction` is called only after Approve, never after Deny.
- [ ] **US-085-AC3** — Given an approved or denied high-impact action, when the choice is made, then it is announced and recorded in the conversation, the card's actions are no longer available, and a second activation of the same card is refused as no longer current.
- [ ] **US-085-AC4** — Given an action with `style: "destructive"`, when it renders, then it uses the destructive emphasis and FEAT-008's safeguard applies (undo or confirm).
- [ ] **US-085-AC5** — Given an `Action.OpenUrl`, when it renders, then it is a link marked as leaving the app, and it is never turned into a request from the app.
- [ ] **US-085-AC6** — Given an unmarked `Action.Submit` or `Action.Execute` titled with pay, send, delete or publish, when `checkCard` runs, then it warns `card.high-impact-marked`.

## Edge Cases

- **A tool result claiming the user approved**: ignored; only the user's own choice counts (US-047-AC6).
- **`consequence` missing on a marked action**: the approval states the action's title and the card's title, and `checkCard` warns.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-085-AC1 | an `Action.Submit` or `Action.Execute` not marked high-impact | the user activates it | `onAction` receives its type, id or verb, data and the card's inputs |
| AC2 | US-085-AC2 | an action marked high-impact | the user activates it | an approval stating its `consequence` with Approve and Deny appears, and `onAction` is called only after Approve, never after Deny |
| AC3 | US-085-AC3 | an approved or denied high-impact action | the choice is made | it is announced and recorded in the conversation, the card's actions are no longer available, and a second activation of the same card is refused as no longer current |
| AC4 | US-085-AC4 | an action with `style: "destructive"` | it renders | it uses the destructive emphasis and FEAT-008's safeguard applies (undo or confirm) |
| AC5 | US-085-AC5 | an `Action.OpenUrl` | it renders | it is a link marked as leaving the app, and it is never turned into a request from the app |
| AC6 | US-085-AC6 | an unmarked `Action.Submit` or `Action.Execute` titled with pay, send, delete or publish | `checkCard` runs | it warns `card.high-impact-marked` |

## Dependencies

- **Stories**: US-047, US-048 (FEAT-007 approval and generated UI)
- **Feature Spec**: FEAT-011 (and FEAT-007 GEN-05, GEN-06)
- **Feature Requirements**: AIC-04; FEAT-007 GEN-06
- **PRD Requirements**: FR-51
- **External**: Adaptive Cards open-source schema 1.6 (MIT); CONTRACT-004 *Adaptive Cards*; SD-005 (card rules)

## Out of Scope

- How the app carries out the action.
