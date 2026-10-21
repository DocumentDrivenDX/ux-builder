---
ddx:
  id: US-083
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
      to: CONTRACT-004
---

# US-083: Render an agent's Adaptive Card in the app's theme

**Feature**: FEAT-011 — AI and agent experience rules
**Feature Requirements**: AIC-01; FEAT-007 GEN-05
**PRD Requirements**: FR-51
**Priority**: P1
**Status**: Draft

## Story

**As an** app developer (PRD primary persona) whose assistant talks to an agent built for Microsoft hosts
**I want** the Adaptive Cards that agent sends to render with the SDK's own components in my app's theme
**So that** the agent works in my app without being rewritten, and its cards look, adapt and behave like the rest of the app

## Context

Agents for Teams, Outlook, Copilot and Bot Framework answer with Adaptive Cards. Their format leaves the look to the host (ACP). ADR-029 makes ux-builder that host: `<AdaptiveCard>` maps each element of the open-source schema 1.6 to an SDK widget or pattern (CONTRACT-004 *Adaptive Cards*), takes the nearest theme, adapts to its container's size class, and marks the card as generated UI (ADR-028).

## Walkthrough

1. The agent returns a card with a heading, a FactSet, a ChoiceSet and two actions.
2. The app passes it to `<AdaptiveCard card onAction>` inside the conversation.
3. The card renders as a `Card` with a heading, a `DescriptionList`, a `Select` and two `Button`s in the app's theme.
4. The user switches the theme to dark; the card follows.
5. At a 360 px column, its ColumnSet collapses to one column.

## Acceptance Criteria

Element mappings, exports and rule IDs are proposals in CONTRACT-004
*Adaptive Cards* and SD-005; the criteria name them so tests can cite them.

- [ ] **US-083-AC1** — Given a card using every element of the open-source schema 1.6, when `<AdaptiveCard>` renders it, then each element renders as the SDK component CONTRACT-004 *Adaptive Cards* maps it to, and no element from the `adaptivecards` DOM renderer is used.
- [ ] **US-083-AC2** — Given a rendered card, when the theme or appearance changes, then the card's colours, type and spacing change with it, and the card's own styling is limited to the semantic styles the schema allows.
- [ ] **US-083-AC3** — Given a card with a ColumnSet, when it renders in a compact container, then its columns stack into one, and nothing scrolls sideways.
- [ ] **US-083-AC4** — Given a card containing an element outside schema 1.6 or a host-specific element, when it renders, then the element's `fallback` renders, or a plain notice says the content could not be shown; nothing is inserted as HTML or script.
- [ ] **US-083-AC5** — Given TextBlock text with markdown, raw HTML or a script, when it renders, then only the supported markdown subset is formatted and the rest shows as text.
- [ ] **US-083-AC6** — Given a rendered card, when the audit runs, then it is marked `data-piq-ai="generated"`, and the SDK components' own audit checks and FEAT-011's AI checks apply to it.

## Edge Cases

- **A card declaring version 1.7 or later**: its supported parts render, and a notice says the card uses a newer version.
- **Templated card (`${...}`)**: rendered as text; templating is out of scope (ADR-029).

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-083-AC1 | a card using every element of the open-source schema 1.6 | `<AdaptiveCard>` renders it | each element renders as the SDK component CONTRACT-004 *Adaptive Cards* maps it to, and no element from the `adaptivecards` DOM renderer is used |
| AC2 | US-083-AC2 | a rendered card | the theme or appearance changes | the card's colours, type and spacing change with it, and the card's own styling is limited to the semantic styles the schema allows |
| AC3 | US-083-AC3 | a card with a ColumnSet | it renders in a compact container | its columns stack into one, and nothing scrolls sideways |
| AC4 | US-083-AC4 | a card containing an element outside schema 1.6 or a host-specific element | it renders | the element's `fallback` renders, or a plain notice says the content could not be shown; nothing is inserted as HTML or script |
| AC5 | US-083-AC5 | TextBlock text with markdown, raw HTML or a script | it renders | only the supported markdown subset is formatted and the rest shows as text |
| AC6 | US-083-AC6 | a rendered card | the audit runs | it is marked `data-piq-ai="generated"`, and the SDK components' own audit checks and FEAT-011's AI checks apply to it |

## Dependencies

- **Stories**: US-047, US-048 (FEAT-007 approval and generated UI)
- **Feature Spec**: FEAT-011 (and FEAT-007 GEN-05, GEN-06)
- **Feature Requirements**: AIC-01; FEAT-007 GEN-05
- **PRD Requirements**: FR-51
- **External**: Adaptive Cards open-source schema 1.6 (MIT); CONTRACT-004 *Adaptive Cards*; SD-005 (card rules)

## Out of Scope

- Emitting cards for Microsoft hosts (bead); hub-only elements.
