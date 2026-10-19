---
ddx:
  id: US-024
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-006
    - kind: informed_by
      to: ADR-020
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: CONTRACT-004
---

# US-024: Move around an app on desktop and phone

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: SCR-01, SCR-02, NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, NAV-06, RSP-04, RSP-05, RSP-06, RSP-07
**PRD Requirements**: FR-25, FR-26
**Priority**: P0
**Status**: Draft

## Story

**As an** end user of an app built on the SDK
**I want** the same navigation, breadcrumbs and account and workspace menus on my laptop and my phone, by mouse, touch, keyboard or screen reader
**So that** I always know where I am, can reach every area, and can get back on track when a page fails

## Context

Requested by the operator on 2026-10-18; implements FEAT-006's app shell,
error screens and navigation and menus under ADR-020 and ADR-021. Each app
builds its own frame today, and the billing-review app's private navigation layer uses the
ARIA menu role for site links, which the APG reserves for actions. The shell
is the one pattern that adapts to the window rather than its container,
because navigation placement depends on the device: a persistent side nav at
expanded size and above, a rail at medium, a bottom bar and drawer at
compact (inventory §1.2, §6.3).

## Walkthrough

1. On a 1366 px laptop the user sees the side navigation with "Matters"
   marked current, a top bar with the workspace and account menus, and
   breadcrumbs "Clients / Acme / Matters".
2. They open the "Billing" group by its disclosure button and choose
   "Invoices"; the URL changes and "Invoices" becomes current.
3. Inside a matter, local navigation tabs swap panels in place by arrow
   keys.
4. They open the workspace menu, type "lon" in its search and switch to
   "London"; the menu closes and focus returns to its button.
5. On a phone (390 px) the same app shows a bottom bar with four
   destinations, the rest in a drawer, and breadcrumbs reduced to
   "← Acme".
6. They follow a stale link and get the not-found screen, with a link back
   to the area they came from.

## Acceptance Criteria

- [ ] **US-024-AC1** — Given primary navigation, when it renders, then destinations are links in a labelled navigation landmark, no element has the ARIA menu or menuitem role, and the current destination has a visible active state and `aria-current="page"`.
- [ ] **US-024-AC2** — Given a navigation group, when its disclosure button is activated by click, Enter or Space, then its links show or hide and the button's `aria-expanded` reports the new state.
- [ ] **US-024-AC3** — Given the app shell, when the window is 390, 720 and 1366 px wide, then navigation is a bottom bar plus drawer, a rail, and a persistent side nav respectively, with the same destinations in the same order.
- [ ] **US-024-AC4** — Given breadcrumbs, when they render at expanded size, then they are an ordered list in a navigation landmark labelled "Breadcrumb" with `aria-current="page"` on the last item; at compact size they are a single link to the parent.
- [ ] **US-024-AC5** — Given an account, workspace or page action menu, when its button is activated, then it follows the APG Menu Button pattern: arrow keys move between items, Escape closes it and returns focus to the button.
- [ ] **US-024-AC6** — Given a workspace menu with 8 workspaces, when it opens, then it offers a search that narrows the list; with 7 or fewer it shows no search.
- [ ] **US-024-AC7** — Given each error screen (not found, no permission, offline, maintenance, expired session), when it renders, then it has one level-1 heading stating what happened and at least one link or button that leads on.
- [ ] **US-024-AC8** — Given the shell under `pointer: coarse` with a sticky top bar, when a user tabs through every control, then each target is at least the touch-target token's size, no control is reachable only on hover, and no focused element is covered by the top or bottom bar (WCAG 2.5.8, 1.4.13, 2.4.11).

## Edge Cases

- **More than five top destinations on a phone**: the bottom bar shows the first four and a "More" entry that opens the drawer.
- **Drawer open when the window widens past compact**: the drawer closes and focus moves to the current destination in the rail or side nav.
- **On-screen keyboard open on a phone**: the shell fits the visible viewport; the bottom bar stays out of the device's safe areas.
- **Long translated labels** (German): navigation labels wrap or truncate with the full text available to assistive technology and on focus.
- **Expired session while editing**: the expired-session screen offers to sign in again; the app, not the pattern, decides what happens to unsaved work.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Links, not menu | US-024-AC1 | Shell, current "Matters" | Query roles | `nav` + links; no `menu`; current has `aria-current="page"` |
| Disclosure | US-024-AC2 | "Billing" group closed | Press Enter on its button | Links shown; `aria-expanded="true"` |
| Shell by window | US-024-AC3 | 6 destinations | Viewports 390, 720, 1366 | Bottom bar + drawer; rail; side nav |
| Breadcrumbs | US-024-AC4 | Clients / Acme / Matters | Render at 1024 and 390 | Ordered list; then "Acme" link only |
| Menu keys | US-024-AC5 | Account menu | Enter, ArrowDown ×2, Escape | Second item focused; closed; focus on button |
| Workspace search | US-024-AC6 | 8 and 7 workspaces | Open menu | Search shown; not shown |
| Error screens | US-024-AC7 | Each of 5 screens | Render | One h1; a way forward |
| Touch, hover, focus | US-024-AC8 | `pointer: coarse`, 390 px | Tab through shell | Targets ≥ token; nothing hover-only; focus never covered |

## Dependencies

- **Stories**: US-023 (layout primitives)
- **Feature Spec**: FEAT-006
- **Feature Requirements**: SCR-01, SCR-02, NAV-01 to NAV-06, RSP-04 to RSP-07
- **PRD Requirements**: FR-25, FR-26
- **External**: CONTRACT-004 revision (shell and navigation slots); FEAT-004 widgets: menu button, breadcrumbs, tabs, drawer, combobox

## Out of Scope

- Routing, sign-in and permission decisions (the app's; SCR-11).
- Global search and the command palette (P1).
- Notification and help content (the shell provides slots only).
- The navigation variant (side menu or icon rail), covered by US-030.
