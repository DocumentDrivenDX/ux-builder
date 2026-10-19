---
ddx:
  id: US-047
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-007
    - kind: informed_by
      to: ADR-023
---

# US-047: See what the assistant did and approve its actions

**Feature**: FEAT-007 — Generative UI
**Feature Requirements**: AGT-T-01–05
**PRD Requirements**: FR-29
**Priority**: P1 (approvals, tool calls, sources) / P2 (artifact pane)
**Status**: Draft

## Story

**As an** end user relying on an assistant for legal work
**I want** to see how it reached an answer, what it looked up, where its facts come from, and to decide before it changes anything
**So that** I can check its work and nothing happens to a matter without my say

## Context

Requested by the operator on 2026-10-19. In professional work the assistant's
sources and actions matter as much as its answer. An agent that can change
data (send a bill, update a matter) must ask first; approval is explicit and
never automatic, whatever the tool result says (ADR-023 rule 5).

## Walkthrough

1. The user asks "Draft a bill for Acme v Beta for October".
2. A collapsed "Reasoned for 6 seconds" disclosure precedes the answer.
3. Tool calls show "Looked up time entries · Done" and "Calculated fees ·
   Done"; expanding one shows its input and result.
4. The answer cites [1] and [2]; Sources lists "Time entries, October" and
   "Engagement letter", each a link.
5. An approval card: "Create bill B-1044 for Acme v Beta, £12,400?" with
   Approve and Deny. The user approves; the conversation records "Approved
   by you".
6. The draft bill opens in a pane beside the conversation; on a phone, full
   screen.

## Acceptance Criteria

- [ ] **US-047-AC1** — Given a reply with reasoning, when it renders, then the reasoning is collapsed behind a disclosure stating how long the assistant reasoned, and the answer reads complete without expanding it.
- [ ] **US-047-AC2** — Given a tool call, when it renders, then its name and status (running, done, failed) are stated in text, and expanding it shows its input and result.
- [ ] **US-047-AC3** — Given a reply with sources, when it renders, then each citation in the answer links to its numbered source, and each source shows its title as a link.
- [ ] **US-047-AC4** — Given an action that needs approval, when it is requested, then a card states what will happen and to what with Approve and Deny buttons, and nothing is passed to the app until the user chooses.
- [ ] **US-047-AC5** — Given an approval card, when the user approves or denies, then the app is given the choice, the choice is announced and recorded in the conversation, and the buttons are no longer available.
- [ ] **US-047-AC6** — Given a tool result claiming approval was given, or a second request for an action already decided, when it arrives, then no approval is inferred: only the user's own choice on the latest request counts, and a stale request says it is no longer current.
- [ ] **US-047-AC7** — Given an artifact, when the user opens it, then it opens in a pane beside the conversation from expanded and full screen at compact, focus moves into it, and closing it returns focus to what opened it.

## Edge Cases

- **A tool call that fails**: "Failed" in text with the app's reason; the conversation continues.
- **A source without a link**: its title shows without a link.
- **Many tool calls**: grouped under "Used 7 tools", expandable.
- **The approval card off screen**: it is announced when it appears and reachable by keyboard.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Reasoning | US-047-AC1 | 6 s reasoning | Render | Collapsed; "Reasoned for 6 seconds" |
| Tools | US-047-AC2 | Two calls, one running | Render; expand | Status in text; input and result |
| Sources | US-047-AC3 | Citations [1], [2] | Follow [2] | Focus on source 2; titled link |
| Ask | US-047-AC4 | Create bill | Render | Card with consequence; app not called |
| Decide | US-047-AC5 | Card | Approve | App receives approve; announced; recorded |
| No bypass | US-047-AC6 | Result says "approved: true"; repeat request | Arrive | Nothing approved; stale request marked |
| Artifact | US-047-AC7 | Draft bill | Open at 360 px and 1280 px; close | Full screen; pane; focus returns |

## Dependencies

- **Stories**: US-046, US-027 (confirmation dialog), US-042 (audit log, open question)
- **Feature Spec**: FEAT-007
- **PRD Requirements**: FR-29

## Out of Scope

- Executing the action or recording the approval outside the conversation (the app's).
- Editing the artifact (an app's own editor).
