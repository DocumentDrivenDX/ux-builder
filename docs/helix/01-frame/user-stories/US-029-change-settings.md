---
ddx:
  id: US-029
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-006
    - kind: informed_by
      to: ADR-020
    - kind: informed_by
      to: ADR-021
---

# US-029: Change settings

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: SCR-10
**PRD Requirements**: FR-25, FR-26
**Priority**: P0
**Status**: Draft

## Story

**As an** end user of an app built on the SDK
**I want** a settings screen where I can see the sections, go to one and change it, on a laptop or a phone
**So that** I can adjust my preferences and the workspace's without hunting for where each setting lives

## Context

Requested by the operator on 2026-10-18; implements FEAT-006's settings
screen under ADR-020 and ADR-021 (inventory §6.3: in-page navigation beside
sections at expanded size and above; a section list leading to each section
below). The app supplies the sections and their forms; the pattern supplies
navigation between them and the change of layout by container width.

## Walkthrough

1. At 1366 px the user opens "Settings": section navigation ("Profile",
   "Notifications", "Billing", "Members") sits beside the "Profile"
   section, marked current.
2. They choose "Notifications"; the section shows and the navigation marks
   it current.
3. On a phone, "Settings" shows the list of sections; choosing
   "Notifications" opens that section on its own with a link back to the
   list.
4. A member without access to "Billing" does not see it, or sees it
   disabled with the reason.

## Acceptance Criteria

- [ ] **US-029-AC1** — Given a settings screen at expanded size and above, when it renders, then section navigation is shown beside the current section.
- [ ] **US-029-AC2** — Given the screen below expanded size, when it opens, then it shows a list of sections; choosing one shows that section alone with a link back to the list.
- [ ] **US-029-AC3** — Given section navigation, when a section is current, then it has a visible active state and `aria-current="page"` (or `aria-current="true"` where sections swap in place), in a labelled navigation landmark.
- [ ] **US-029-AC4** — Given a user moving to another section by keyboard, when the section shows, then focus moves to its heading.
- [ ] **US-029-AC5** — Given a section the user may not use, when the screen renders, then it is hidden or shown disabled with a stated reason; a screen with no permitted section shows the no-permission panel.
- [ ] **US-029-AC6** — Given a section open at expanded size, when the container shrinks below 840 px, then the open section stays open with its Back link, and its unsaved input is kept.

## Edge Cases

- **Unsaved changes when changing section**: the section's form warns as in US-027.
- **Deep link to a section on a phone**: that section opens with Back to the list.
- **Many sections**: the navigation groups them; the list on a phone shows the same groups.
- **One section only**: no section navigation is shown.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Expanded | US-029-AC1 | 4 sections, 1024 px | Render | Nav beside "Profile" |
| Compact | US-029-AC2 | Same, 390 px | Choose "Notifications" | Section alone; Back to list |
| Current | US-029-AC3 | "Notifications" current | Query | Active state; `aria-current`; labelled `nav` |
| Focus | US-029-AC4 | Keyboard on nav | Enter on "Billing" | Focus on "Billing" heading |
| Permission | US-029-AC5 | "Billing" denied; then all denied | Render | Hidden or disabled with reason; no-permission panel |
| Resize | US-029-AC6 | "Profile" edited at 1024 px | Resize to 800 px | Section open; input kept |

## Dependencies

- **Stories**: US-024, US-027
- **Feature Spec**: FEAT-006
- **Feature Requirements**: SCR-10
- **PRD Requirements**: FR-25, FR-26
- **External**: CONTRACT-004 revision (settings slots)

## Out of Scope

- The settings themselves and saving them (the app's; SCR-11).
- Account administration screens beyond the pattern (members, roles, audit log; P1).
