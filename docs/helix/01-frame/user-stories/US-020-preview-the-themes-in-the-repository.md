---
ddx:
  id: US-020
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-003
    - kind: informed_by
      to: ADR-018
---

# US-020: Preview every theme in the repository, with its logos and favicon

**Feature**: FEAT-003 — Guided brand builder
**Feature Requirements**: BB-17
**PRD Requirements**: FR-14
**Priority**: P1
**Status**: Draft

## Story

**As a** developer or brand owner using the theme builder
**I want** to open "Your themes" and preview any theme in the repository as an app would show it
**So that** I can check a theme's palette, design system, logos and favicon without building an app

## Context

Requested by the operator on 2026-10-07, as an addition to the approved
prototype, whose "Your themes" only listed names. A theme saved in this
session should preview too, before the build has run.

## Walkthrough

1. In the builder, the person clicks "Your themes" at the top right.
2. The list shows every theme in `tokens/themes/` with its design system.
3. They choose one: for each appearance the theme has, light and dark side
   by side, the preview shows its logo on that appearance's ground, its mark
   and its favicon (in a browser-tab mock), its palette (every colour and
   state role with its value), and the SDK's widgets in the theme's anatomy
   and icon set.

## Acceptance Criteria

- [ ] **US-020-AC1** — Given "Your themes", when it opens, then every theme in `tokens/themes/` is listed with its design system (or "own anatomy").
- [ ] **US-020-AC2** — Given a chosen theme, when it previews, then each appearance it has shows its palette (every colour and state role with its value) and the SDK's widgets composed from that theme's tokens, in its design system's icon set.
- [ ] **US-020-AC3** — Given a theme whose brand has artwork, when it previews, then each appearance shows that appearance's logo, its mark and its favicon; a brand without artwork shows its title in its logo colour and says it has no mark or favicon.
- [ ] **US-020-AC4** — Given a theme saved since the builder started, when it is chosen, then it previews, composed from `tokens/` on request.
- [ ] **US-020-AC5** — Given "Your themes", when a theme is chosen, then its own page opens, at `?theme=<name>`, which also opens it directly; a name with no theme says so and links back to the builder.
- [ ] **US-020-AC6** — Given a theme's page, when it opens, then the page wears the theme, and an appearance switch (light, auto, dark as icons, a radio group) changes it; auto follows the system setting; an appearance the theme lacks is disabled.
- [ ] **US-020-AC7** — Given a theme's page, when it opens, then a menu on the left reaches its brand, its CSS for light, dark and auto, and every widget and screen pattern in the SDK, marking the one at the top of the screen; on a phone the menu sits above the content and nothing scrolls sideways.
- [ ] **US-020-AC8** — Given a theme's page, when its CSS is shown, then each appearance shows the imports, the attributes on `<html>` and every custom property with its value, and auto shows how to follow the system setting.
- [ ] **US-020-AC9** — Given a theme's page, when a widget or pattern is shown, then it renders from its own Storybook story in the theme, with a link that opens that story in Storybook in the same theme and appearance.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| List | US-020-AC1 | The repository's themes | Open "Your themes" | Every theme, with its design system |
| Praxis Carbon | US-020-AC2, AC3 | `praxis-carbon` | Choose it | Light and dark; v2 logos, mark, favicon; Carbon icons; palette values match the brand |
| No artwork | US-020-AC3 | `plain` | Choose it | Light only; title as wordmark; no mark or favicon |
| Fresh theme | US-020-AC4 | A theme written after start | Choose it | It previews |
| Theme page | US-020-AC5, AC6 | `praxis-v2-databricks` | Choose it; switch appearance | Its page at `?theme=`; it wears the theme; Auto follows the system |
| Contents | US-020-AC7, AC8 | `praxis-carbon` | Use the menu | Brand, CSS for light, dark and auto, every widget and pattern |
| Samples | US-020-AC9 | `praxis-carbon`, light | Look at each entry | Each renders its story; its link opens it in Storybook in praxis-carbon light |
| One appearance | US-020-AC6 | `plain` | Open its page | Dark disabled; its CSS says it has no dark |

## Dependencies

- **Feature Spec**: FEAT-003
- **API**: `GET /api/theme?name=` (SD-002)

## Out of Scope

- Editing a theme from the preview; deleting themes.
