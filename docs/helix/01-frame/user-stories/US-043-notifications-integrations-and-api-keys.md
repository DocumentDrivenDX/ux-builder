---
ddx:
  id: US-043
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

# US-043: Notifications, integrations and API keys

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: NOTIF-01, INT-01
**PRD Requirements**: FR-25, FR-26
**Priority**: P2
**Status**: Draft

## Story

**As an** end user or administrator of an app built on the SDK
**I want** to see what needs my attention and go straight to it, choose how I am told, and connect other systems with keys that are never shown twice
**So that** I do not miss an approval, and a key for the billing system cannot be read off my screen later

## Context

Requested by the operator on 2026-10-19 ("do all P1 and P2 screen
patterns"), admitted ahead of consumer evidence by operator decision
(FEAT-006 "Extended screens"). The unread count is stated in text so it is
not conveyed by a badge's colour or position alone. A secret shown once and
then masked is the common practice for API keys; revoking one breaks
whatever uses it, so it is confirmed. The harness may own notifications for
embedded products (FEAT-006 constraints); this pattern is for apps that own
their own. The app supplies notifications, preferences, connections and
keys and performs every change; the pattern supplies the button, list,
states, masking and confirmation.

## Walkthrough

1. The page header shows a bell button named "Notifications, 3 unread".
2. The user opens it; a list shows "Bill B-1043 needs approval" (unread),
   "Export ready" (unread) and "J. Chen assigned you Acme v Beta" (read),
   each a link to its record.
3. They mark one as read, then "Mark all as read"; the button now says
   "Notifications, 0 unread".
4. In "Notification preferences" they turn off email for assignments.
5. On "Integrations" the billing system shows "Connected" with
   "Disconnect"; the document store shows "Not connected" with "Connect".
6. They create an API key; it is shown in full with "Copy". They copy it
   and close; the list now shows "sk_…4f2a".
7. They revoke an old key and confirm.

## Acceptance Criteria

- [ ] **US-043-AC1** — Given three unread notifications, when the notification button renders, then its accessible name states the unread count in text, for example "Notifications, 3 unread".
- [ ] **US-043-AC2** — Given the notification centre open, when it renders, then each notification states whether it is read or unread in text and links to its record.
- [ ] **US-043-AC3** — Given unread notifications, when the user marks one as read or chooses to mark all as read, then the app is given the change, those notifications show as read and the button's unread count updates.
- [ ] **US-043-AC4** — Given notification preferences, when the user changes a channel for a kind of notification, then the app is given the kind, the channel and the new setting.
- [ ] **US-043-AC5** — Given integrations, when they render, then each connection shows its status in text with connect when not connected and disconnect when connected, and choosing either gives the app the request.
- [ ] **US-043-AC6** — Given a newly created API key, when it is shown, then the full key is shown once with a copy control that copies the full key to the clipboard.
- [ ] **US-043-AC7** — Given a key whose creation view has been closed, when the keys list renders, then the key is shown only masked and the full key is not present in the page.
- [ ] **US-043-AC8** — Given a key, when the user chooses to revoke it, then a confirmation dialog names the key; confirming gives the app the revocation and cancelling keeps the key.

## Edge Cases

- **No notifications**: the centre shows an empty state; the button says "Notifications, 0 unread".
- **More than 99 unread**: the visual badge may abbreviate; the accessible name states the full count.
- **A notification whose record was deleted**: the app's text explains it; the link is omitted.
- **A connection in error**: the status says so in text with the app's reason.
- **Copy unavailable** (clipboard blocked): the key stays selectable so it can be copied by hand, with a message saying so.
- **Compact size**: the notification centre opens as a full-screen sheet.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Count | US-043-AC1 | 3 unread | Render | Button name "Notifications, 3 unread" |
| List | US-043-AC2 | 2 unread, 1 read | Open | 3 entries; "Unread" / "Read" in text; 3 record links |
| Mark read | US-043-AC3 | 3 unread | Mark one; mark all | App receives each; count 2 then 0 |
| Preferences | US-043-AC4 | Assignments by email on | Turn off | App receives assignments, email, off |
| Integrations | US-043-AC5 | Billing connected; documents not | Render; Connect documents | "Connected"/"Disconnect"; "Not connected"/"Connect"; app receives connect |
| Show once | US-043-AC6 | New key ending "4f2a" | Copy | Full key shown; clipboard holds full key |
| Masked | US-043-AC7 | Creation view closed | Render list | "sk_…4f2a"; full key absent from DOM |
| Revoke | US-043-AC8 | Key "Billing sync" | Revoke; cancel; revoke; confirm | Kept; app receives revocation |

## Dependencies

- **Stories**: US-024, US-027, US-029
- **Feature Spec**: FEAT-006
- **Feature Requirements**: NOTIF-01, INT-01
- **PRD Requirements**: FR-25, FR-26
- **External**: CONTRACT-004 revision (notification, integrations and keys slots); FEAT-004 widgets: menu button, drawer/sheet, dialog, tooltip

## Out of Scope

- Delivering notifications, storing preferences, and creating, storing or revoking keys (the app's; SCR-11).
- Real-time push of new notifications (the app updates the list).
- OAuth consent screens of the connected systems.
