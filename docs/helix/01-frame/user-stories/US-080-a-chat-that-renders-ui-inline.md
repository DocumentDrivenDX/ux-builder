---
ddx:
  id: US-080
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-011
    - kind: informed_by
      to: ADR-028
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: US-048
---

# US-080: A chat that renders UI inline

**Feature**: FEAT-011 — AI and agent experience rules
**Feature Requirements**: AIB-02, AIB-03, AIA-01 (generated UI)
**PRD Requirements**: FR-47, FR-48
**Priority**: P1
**Status**: Draft

## Story

**As an** app developer (PRD primary persona) whose assistant answers with SDK patterns, such as a wizard or a form
**I want** the inline UI checked with its own pattern rules at the chat column's size, plus rules for generated UI
**So that** a wizard inside a message works like any wizard, and nothing the user typed is lost or submitted without review

## Context

FEAT-007 GEN-01 and GEN-02 let an assistant render SDK components in a message (US-048). A hybrid screen is a conversation (role `assistant`) whose messages contain patterns. Those patterns keep their own rules, adapting to the column they render in (ADR-021), so a wizard in a 400 px column follows compact rules even on a wide window. Generated UI adds four rules: it is marked, pre-filled values are reviewed before submission, regenerating keeps user input, and its state stays readable in the history.

## Walkthrough

1. The blueprint's chat screen declares `ai.roles: ["assistant"]` and `ai.renders: ["Wizard"]`.
2. The blueprint check applies the Wizard's rules at the conversation region's size classes.
3. At run time the assistant renders a Wizard, pre-filling two fields; the user corrects one and submits.
4. The user regenerates the answer; the Wizard keeps the user's edits, or asks before discarding them.
5. Later, the history shows the submitted wizard's values, read-only.

## Acceptance Criteria

Exact rule IDs, fields, markers and check names are proposals in SD-005 and
CONTRACT-005 *[Amendment 2026-10-21]*; the criteria name them so tests can
cite them.

- [ ] **US-080-AC1** — Given `ai.renders` naming a pattern, when the blueprint is checked, then that pattern's rules (FEAT-008) are applied at the size classes of the conversation region (`ai.region` sizes, default `compact` and `medium`), and their findings point to the screen.
- [ ] **US-080-AC2** — Given `ai.renders` naming a pattern that is not renderable (FEAT-007 GEN-01), when the blueprint is checked, then a warning (`genui.renderable`) names it.
- [ ] **US-080-AC3** — Given an inline component marked `data-piq-ai="generated"` with pre-filled inputs, when the audit runs, then a warning (`genui.review-prefill`) is reported unless its submit control is separate from the AI's message and the pre-filled fields are editable.
- [ ] **US-080-AC4** — Given an inline component the user has edited, when its message is regenerated, then the edits are kept or the user is asked before they are discarded (`genui.keep-input`; FEAT-007 component test).
- [ ] **US-080-AC5** — Given a submitted inline component, when the user scrolls back, then it shows the submitted values and is not editable (`genui.history`).
- [ ] **US-080-AC6** — Given an inline pattern, when the audit runs, then the pattern's own audit checks run on it as on any page.
- [ ] **US-080-AC7** — Given `ai.renders` naming a `Wizard` or `FormPage` and a conversation region that includes `compact`, when the blueprint is checked, then a warning (`genui.inline-compact`) points to the screen and says how to fit the task to the column or move it to a screen of its own. *[Added 2026-10-23, AR-2026-10-22 D-2]*

## Edge Cases

- **A pattern that needs a full screen** (e.g. `ListDetail`): the guidance says to open it as an artifact pane (FEAT-007 AGT-T-05), and the blueprint check warns if it is rendered inline.
- **Inline high-impact submission**: the approval rule applies as for any agent action.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-080-AC1 | `ai.renders` naming a pattern | the blueprint is checked | that pattern's rules (FEAT-008) are applied at the size classes of the conversation region (`ai.region` sizes, default `compact` and `medium`), and their findings point to the screen |
| AC2 | US-080-AC2 | `ai.renders` naming a pattern that is not renderable (FEAT-007 GEN-01) | the blueprint is checked | a warning (`genui.renderable`) names it |
| AC3 | US-080-AC3 | an inline component marked `data-piq-ai="generated"` with pre-filled inputs | the audit runs | a warning (`genui.review-prefill`) is reported unless its submit control is separate from the AI's message and the pre-filled fields are editable |
| AC4 | US-080-AC4 | an inline component the user has edited | its message is regenerated | the edits are kept or the user is asked before they are discarded (`genui.keep-input`; FEAT-007 component test) |
| AC5 | US-080-AC5 | a submitted inline component | the user scrolls back | it shows the submitted values and is not editable (`genui.history`) |
| AC6 | US-080-AC6 | an inline pattern | the audit runs | the pattern's own audit checks run on it as on any page |
| AC7 | US-080-AC7 | `ai.renders` naming a `Wizard` or `FormPage`, a region including `compact` | the blueprint is checked | a warning (`genui.inline-compact`) points to the screen with the fix |

## Dependencies

- **Stories**: US-047, US-048 (FEAT-007 components that emit markers)
- **Feature Spec**: FEAT-011
- **Feature Requirements**: AIB-02, AIB-03, AIA-01 (generated UI)
- **PRD Requirements**: FR-47, FR-48
- **External**: CONTRACT-005 (rules, blueprint, AI markup); SD-005 (rule catalogue)

## Out of Scope

- Which components are renderable (FEAT-007 GEN-01).
