---
ddx:
  id: US-168
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-019
    - kind: informed_by
      to: CONTRACT-009
    - kind: informed_by
      to: US-013
    - kind: informed_by
      to: US-022
---

# US-168: Draw a visual inside an app, lint- and audit-clean

**Feature**: FEAT-019 — Visuals renderer
**Feature Requirements**: WGT-01, WGT-02, LNT-01, AUD-01
**PRD Requirements**: FR-96, FR-97
**Priority**: P1
**Status**: Draft

## Story

**As an** app developer (PRD primary persona) or an agent building an app on the SDK
**I want** a `<Visual>` component that draws a `umf.visual` document in my app's theme
**So that** I can show a diagram or chart without writing SVG, and the lint and the audit stay clean

## Context

The lint (`ux-builder/no-inline-svg`, US-013) reports SVG an app writes, and the audit
(`sdk-widgets`, `token-colors`, US-022) reports drawings and colours that are not the SDK's. A
visual drawn by `@ux-builder/visuals` uses only theme tokens, so the SDK can offer it as a widget
the way it offers icons and charts' containers today.

## Walkthrough

1. The developer imports `<Visual>` and passes a document.
2. It draws in the app's theme; switching theme or appearance redraws its colours.
3. A screen reader announces its title and can reach its text equivalent.
4. The lint and the audit report nothing for it; an `<svg>` diagram written by hand is still reported.

## Acceptance Criteria

- [ ] **US-168-AC1** — Given an app inside a `ThemeProvider` rendering `<Visual doc={…} />`, when the theme or appearance switches, then the visual's colours are the new theme's, with no new render of the document.
- [ ] **US-168-AC2** — Given a rendered `<Visual>`, when its accessibility tree is read, then it is one image named by the visual's title and described by its takeaway, and its text equivalent is reachable.
- [ ] **US-168-AC3** — Given app source using `<Visual>` and, separately, a hand-written `<svg>` diagram, when the lint runs with the starter's configuration, then it reports the hand-written one only.
- [ ] **US-168-AC4** — Given a page drawing three documents of different kinds with `<Visual>`, when the audit runs in every theme and appearance, then it reports no error or warning for the visuals; given a page with a hand-drawn `<svg>` diagram, then it still reports that one.

## Edge Cases

- **A document that fails validation**: the widget draws nothing and shows why in text, so a broken document is visible, not silent.
- **A visual wider than its container**: it scrolls sideways inside a captioned frame, never the page (visuals PRD §8).

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-168-AC1 | `<Visual>` in a themed app | switch theme and appearance | colours follow; no re-render of the document |
| AC2 | US-168-AC2 | a rendered `<Visual>` | read the accessibility tree | one named image; text equivalent reachable |
| AC3 | US-168-AC3 | `<Visual>` and a hand-written `<svg>` | run the lint | only the hand-written one reported |
| AC4 | US-168-AC4 | a page of three visuals; a page with a hand-drawn diagram | run the audit | nothing for the visuals; the hand-drawn one reported |

## Dependencies

- **Feature Spec**: FEAT-019
- **Feature Requirements**: WGT-01, WGT-02, LNT-01, AUD-01
- **PRD Requirements**: FR-96, FR-97
- **External**: US-013 (the lint), US-022 (the audit)

## Out of Scope

- Editing a visual in the app.
