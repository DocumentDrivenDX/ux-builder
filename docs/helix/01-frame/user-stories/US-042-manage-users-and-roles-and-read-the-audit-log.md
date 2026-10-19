---
ddx:
  id: US-042
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

# US-042: Manage users and roles, and read the audit log

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: USR-01, AUDIT-01
**PRD Requirements**: FR-25, FR-26
**Priority**: P1
**Status**: Draft

## Story

**As an** administrator of an app built on the SDK
**I want** to see who has access with which role, invite people, change roles, see what each role may do, and read who changed what and when
**So that** I give the right people the right access and can answer "who changed this bill's rate?" without asking an engineer

## Context

Requested by the operator on 2026-10-19 ("do all P1 and P2 screen
patterns"), admitted ahead of consumer evidence by operator decision
(FEAT-006 "Extended screens"). Every app that has more than one kind of user
builds these screens, and each builds them differently. The permissions
matrix is a data table of roles by permissions with row and column headers
so a screen reader can read each cell with both. The audit log is read
only. The app supplies members, roles, permissions, log entries and the
invite and role-change calls, and enforces access; the pattern supplies the
lists, the invite dialog, the matrix and the filters.

## Walkthrough

1. The administrator opens "Users"; a list shows "J. Chen, Partner",
   "A. Patel, Associate" and eight others.
2. They choose "Invite", enter "r.ortiz@example.com", choose "Associate"
   and send the invite.
3. They change A. Patel's role to "Senior associate".
4. On "Roles" a matrix shows roles across the top and permissions down the
   side, each cell saying "Allowed" or "Not allowed".
5. On "Audit log" they see "A. Patel changed Rate on bill B-1043 from 450
   to 475, 18 Oct 2026 14:02".
6. They filter by person "A. Patel", action "Changed" and the last seven
   days; the list narrows and the filters show as chips.

## Acceptance Criteria

- [ ] **US-042-AC1** — Given ten members, when the users list renders, then each member is listed with their role.
- [ ] **US-042-AC2** — Given the invite control, when the user opens it, enters an email address and chooses a role, then submitting gives the app the email and role; an address that is not an email address is shown as an error at its field and the invite is not sent.
- [ ] **US-042-AC3** — Given a member, when the user changes their role, then the app is given the member and the new role and the list shows the new role once the app confirms.
- [ ] **US-042-AC4** — Given three roles and five permissions, when the permissions matrix renders, then it is a table with a column header for each role and a row header for each permission, and each cell states in text whether that role has that permission.
- [ ] **US-042-AC5** — Given audit log entries, when the log renders, then each entry shows who made the change, what changed, when, and the value before and after.
- [ ] **US-042-AC6** — Given the audit log, when the user filters by person, action and date, then the app is given the filters, the applied filters are shown as removable chips, and the log shows the entries the app returns.
- [ ] **US-042-AC7** — Given the audit log, when it renders, then it offers no control to edit or delete an entry.

## Edge Cases

- **Inviting an existing member**: the app's error is shown at the email field.
- **Changing your own role**: the change is confirmed in a dialog first, since it may remove your access.
- **A role change the app rejects**: the list keeps the old role and shows the app's reason.
- **A long permissions matrix at compact size**: it scrolls inside its own region with the permission headers kept in view; the page does not scroll horizontally.
- **An entry with no previous value** (a record created): "before" is shown as empty, stated in text.
- **No entries match the filters**: the no-results panel lists the filters with a way to clear them.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Members | US-042-AC1 | 10 members | Render | 10 entries each with role |
| Invite | US-042-AC2 | Roles Partner, Associate | Enter "r.ortiz", submit; enter "r.ortiz@example.com", "Associate", submit | Field error, nothing sent; app receives email and role |
| Change role | US-042-AC3 | A. Patel, Associate | Choose "Senior associate"; app confirms | App receives change; list shows "Senior associate" |
| Matrix | US-042-AC4 | 3 roles × 5 permissions | Render | 3 `th scope="col"`, 5 `th scope="row"`; 15 cells with "Allowed" or "Not allowed" |
| Entries | US-042-AC5 | Rate 450 → 475 by A. Patel | Render | Who, what, when, 450, 475 |
| Filter | US-042-AC6 | 40 entries | Filter person, action, last 7 days | App receives 3 filters; 3 chips; returned entries shown |
| Read only | US-042-AC7 | Any entries | Render | No edit or delete controls |

## Dependencies

- **Stories**: US-025, US-027, US-029
- **Feature Spec**: FEAT-006
- **Feature Requirements**: USR-01, AUDIT-01
- **PRD Requirements**: FR-25, FR-26
- **External**: CONTRACT-004 revision (users, roles and audit log slots); FEAT-004 widgets: DataTable, dialog, combobox, date range picker, Field

## Out of Scope

- Enforcing permissions, sending invite emails and recording audit entries (the app's; SCR-11).
- Editing which permissions a role has.
- Sign-in, single sign-on and account recovery (pending the harness decision).
