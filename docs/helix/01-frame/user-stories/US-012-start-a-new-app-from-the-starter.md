---
ddx:
  id: US-012
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: CONTRACT-004
---

# US-012: Start a new app that is on the design system from its first commit

**Feature**: FEAT-004 — App SDK
**Feature Requirements**: SDK-08, SDK-09, SDK-15, SDK-16, SDK-18
**PRD Requirements**: FR-19
**Priority**: P1
**Status**: Draft

## Story

**As an** app developer (or an agent working for one)
**I want** to scaffold a new app that already uses the SDK's widgets, fonts, provider and lint rule
**So that** I have a themed screen within the hour and nothing to undo later

## Context

Every app re-implements setup today: packages, fonts, theme switching. The
PRD's metric is new app to first themed screen in ≤ 1 hour.

## Walkthrough

0. No set-up is needed: the packages are on the public npm registry, so no
   scope registry or token is configured (CONTRACT-004, Registry and access).
1. The developer runs the starter (`npm create @ux-builder/app my-app` or the
   template directory), naming a theme.
2. `npm install && npm run dev` shows a page built from SDK widgets with a
   theme and appearance switcher.
3. `npm run lint` reports zero findings; `npm run build` succeeds.
4. `npm run audit` passes in every theme and appearance; the generated
   `.github/workflows/ci.yml` runs lint and the audit on every push, with no secret to
   set (US-022-AC10).

## Acceptance Criteria

- [ ] **US-012-AC1** — Given the starter, when a new app is scaffolded and installed, then `npm run build` succeeds with SDK versions pinned.
- [ ] **US-012-AC2** — Given the generated app, when it runs, then its page uses SDK widgets inside a `ThemeProvider` and offers a working theme and appearance switch.
- [ ] **US-012-AC3** — Given the generated app, when the lint rule runs, then it reports zero findings.
- [ ] **US-012-AC4** — Given the generated app, when it is searched, then it contains no secrets and no presentation values outside the SDK.
- [ ] **US-012-AC5** — Given the generated app, when it runs, then its header shows the theme's `<Logo />`, and switching theme or appearance changes it.
- [ ] **US-012-AC6** — Given the generated app, when it switches to a theme with a favicon, then the page's icon is that favicon and it loads; switching to one without restores the app's own.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Builds | US-012-AC1 | Fresh scaffold in CI | install, build | Success |
| Renders and switches | US-012-AC2 | Built app | Playwright smoke: switch theme | Attribute and widget styles change |
| Lint clean | US-012-AC3 | Fresh scaffold | `npm run lint` | 0 findings |
| Clean | US-012-AC4 | Fresh scaffold | Search | No secrets, no literals |
| Logo | US-012-AC5 | Built app | Playwright: switch databricks → praxis-carbon → dark | Wordmark, then Praxis artwork, then its dark artwork |

## Dependencies

- **Stories**: US-010, US-011, US-013, US-022 (the audit and CI)
- **Contract**: CONTRACT-004 (the starter command, registry and access)
- **Feature Spec**: FEAT-004
- **External**: bead `6b8a0994`

## Out of Scope

- Routing, data fetching, authentication.
