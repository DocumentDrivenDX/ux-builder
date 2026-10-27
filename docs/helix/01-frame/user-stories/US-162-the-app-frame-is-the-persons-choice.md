---
ddx:
  id: US-162
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: FEAT-014
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: CONTRACT-005
    - kind: informed_by
      to: ADR-041
---

# US-162: The app frame is the person's choice

**Feature**: FEAT-018
**Feature Requirements**: GDL-80
**PRD Requirements**: FR-77
**Priority**: P1
**Status**: Draft

## Story

**As a** person designing an app with the guide (PRD primary persona)
**I want** to choose what surrounds every screen of my web app: nothing, a top bar, navigation across the top or a side menu
**So that** a one-screen app has no empty menus and an app with many places has a menu that fits, by my choice rather than a template's

## Context

Every responsive-web prototype and app was drawn in AppShell's side navigation, so a one-screen to-do list (trial tasks-1) showed an empty 256 px side column on desktop. The frame was never asked.

## Walkthrough

1. At step 5 the agent asks for the modality, the screen sizes and the app frame in one message, showing the four and recommending one from the destinations.
2. The person chooses just the screen for their to-do list.
3. Wireframes, prototypes and the built app have no top bar or menus; the audit passes it, and check warns if a second destination is added.

## Acceptance Criteria

- [ ] **US-162-AC1** — Given AppShell, when its frame is screen, top-bar, top-nav or side-nav, then it draws only that frame's chrome at compact, medium and expanded widths: screen nothing but the content, top-bar the top bar alone, top-nav the bottom bar when compact and the destinations across the top bar from medium, side-nav (the default) as before.
- [ ] **US-162-AC2** — Given a blueprint, then supports.frame is one of the four, and `ux-builder-blueprint check` warns when a frame without navigation has more than one destination, when navigation has one destination or none, or when more than five destinations are put across the top.
- [ ] **US-162-AC3** — Given a chosen frame, then the wireframes, and the exploratory prototypes made from them, are drawn in it; without one, as before.
- [ ] **US-162-AC4** — Given a design folder built into an app, then the generated App passes the blueprint's frame to AppShell; without one, AppShell keeps side navigation.
- [ ] **US-162-AC5** — Given a responsive-web app, when `modality` runs without `--frame`, then it exits 2 naming the four frames and the one recommended from the destinations; with it, the frame is recorded in the blueprint and the design state, `status` names it (or what to recommend from step 5), the budget counts it until chosen, and a changed frame asks again; chat alone takes no frame.
- [ ] **US-162-AC6** — Given an audit with the blueprint, then navigation across the top bar counts as adapting, a frame with no navigation passes, and an app drawn in a frame other than the one chosen is named in the verdict's fixes.
- [ ] **US-162-AC7** — Given the design skill and glossary, then the agent asks for the frame with the modality, shows the four, recommends one and lets the person decide, and `explain "app frame"` says what it is.

## Edge Cases

- **A chat-only app**: No frame; --frame is refused
- **An old blueprint with no frame**: Side navigation, as before

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-162-AC1 | AppShell in each frame | render at 390, 768, 1280 | only its chrome |
| AC2 | US-162-AC2 | frame vs destinations | check | warnings |
| AC3 | US-162-AC3 | chosen frame | wireframes | drawn in it |
| AC4 | US-162-AC4 | design folder | build | App has frame= |
| AC5 | US-162-AC5 | responsive-web | modality without --frame | exit 2 with recommendation |
| AC6 | US-162-AC6 | top-nav pages | audit verdict | adapts; mismatch named |
| AC7 | US-162-AC7 | SKILL.md, glossary | read | frame asked with modality |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-80
- **PRD Requirements**: FR-77
- **External**: CONTRACT-008

## Out of Scope

- A frame per screen (one frame for the whole app)
- Native platform frames (future modalities)
