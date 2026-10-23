---
ddx:
  id: FEAT-006
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: ADR-011
    - kind: informed_by
      to: ADR-016
    - kind: informed_by
      to: ADR-020
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: ADR-022
    - kind: informed_by
      to: screen-pattern-inventory
---

# Feature Specification: FEAT-006 — Screen patterns

**Feature ID**: FEAT-006
**Status**: Specified
**Priority**: P0 (foundations, navigation, regions, P0 screens) / P1 and P2 per the inventory, admitted by operator decision on 2026-10-19 (ADR-020 amendment)
**Owner**: Operator (until a design-system owner is named); harness team as future owner
**Covered PRD Subsystem(s)**: App SDK
**Covered PRD Requirements**: FR-21, FR-25, FR-26 (FR-27 is FEAT-001's; this feature reads the variants it declares)
**Cross-Subsystem Rationale**: None — single subsystem. The design system file's `variants` member (Theme composition, FR-2) and the builder's screen preview (Brand builder, FR-14) are dependencies owned by FEAT-001 and FEAT-003.

## Overview

Screen patterns let an app, or an AI agent working for one, build complete
transactional and reporting screens from the SDK: layout primitives,
navigation and menus, shared regions and the P0 screens of the inventory, each
responsive from smartphone to wide desktop and wearing the design system's
conventions. It extends FR-17 (apps get presentation from the SDK, nothing
copied) from widgets to screens, and FR-21 (agents read what exists) to
patterns. Decisions: ADR-020 (patterns layer), ADR-021 (container-based
responsiveness), ADR-022 (variants).

## Ideal Future State

A developer asks an agent for "a matters list with a detail panel and an edit
form". The agent reads the catalogue, composes the app shell, collection list,
list-with-detail and form patterns, and supplies only the app's data, columns
and fields. The screen works on a phone and a 27-inch monitor, inside the
harness's narrow iframe and full screen. It has empty, loading, error and
no-permission states without anyone writing them. Keyboard and screen-reader
users can do everything a mouse user can. Switching from Praxis Carbon to
Praxis Material changes the look to each system's conventions; nothing moves,
disappears or breaks. The billing-review app deletes its own table and navigation layer.

## Problem Statement

- **Current situation** (before `@ux-builder/ui` 0.6.0, which shipped this feature): the SDK provided basic widgets only. Each
  app builds its own layout, navigation, list, form and dashboard structure;
  there are no breakpoints or layout tokens; the billing-review app maintains a private table
  and navigation layer (ADR-011).
- **Pain points**: Screens differ between apps that should look like one
  product; empty, error and loading states are skipped or inconsistent;
  responsive behaviour is reinvented per app or missing; agents hand-build
  layouts that drift from the design system.
- **Desired outcome**: A list + detail + form screen and a dashboard can be
  built from patterns alone, with no app-written layout CSS, and pass the audit
  in every theme × appearance × size class.

## Functional Areas

Similar objects, defined separately:

- **Widget** — a basic control (Button, Field, DataTable). Exists today.
- **Layout primitive** — a content-free arrangement (stack, cluster, grid,
  page, split view).
- **Region** — a recurring part of a screen built from widgets (page header,
  filter bar, state panel).
- **Screen pattern** — a full screen layout composed of regions, primitives
  and widgets, with content supplied through slots.
- **Variant point / variant** — a place in a pattern where design systems
  follow different conventions, and one named token bundle for it (ADR-022).
- **Size class** — one of five container-width ranges (ADR-021).

| Area | User question or job | Feature responsibility |
|------|----------------------|------------------------|
| Foundations | "How do I lay out a screen without writing layout CSS?" | Layout tokens and layout primitives |
| Navigation and menus | "How do users move around and act?" | Primary and local navigation, breadcrumbs, action, account and bulk-action menus |
| Regions | "What goes on every screen?" | Page header, filter bar, filter panel, label/value list, timeline, number tile, chart container, tabs section, confirmation dialog, state panels, pagination |
| Screens | "How do I build a list, record, form, dashboard or report?" | The P0 screen patterns |
| Responsiveness | "Does it work on a phone and in a narrow embed?" | Container-based adaptation per size class |
| Variants | "Does it look like Carbon / Material / Fluent?" | Variant points implemented through token bundles |
| Agent guidance | "How does an agent know which pattern to use?" | Catalogue entries and selection guidance |

## Requirements

### Functional Requirements by Area

#### Foundations

LAY-01. Layout tokens exist for page gutters per size class, content maximum
widths (reading, form, page) and minimum touch-target size, with values set per
design system; the size-class boundaries are fixed and published read-only
(ADR-021).
LAY-02. Stack, cluster, grid, page and split-view primitives arrange arbitrary
children using only space and layout tokens.
LAY-03. Layout primitives and patterns use logical properties, so a
right-to-left document mirrors them without additional CSS.

#### Navigation and menus

NAV-01. Primary navigation renders destinations as links in a navigation
landmark; the current destination shows a visible active state and carries
`aria-current="page"`.
NAV-02. Expandable navigation groups open and close by disclosure buttons that
report `aria-expanded`; navigation never uses the ARIA menu role.
NAV-03. Local navigation that swaps panels in place follows the APG Tabs
pattern; local navigation that changes the URL uses links with
`aria-current="page"`. *[Amended 2026-10-23 — AR-2026-10-22 D-8]* `LocalNav`
is optional and planned (US-024-AC9), wanted first for Praxis plug-ins, the
embedded apps of a coming modality; `Tabs` and `TabsSection` cover the
panel-swapping case today.
NAV-04. Breadcrumbs render as an ordered list in a labelled navigation
landmark, the last item marked `aria-current="page"`; in the compact size class
they reduce to a single link to the parent.
NAV-05. Action menus (page, record and row) follow the APG Menu Button
pattern: arrow keys move between items, Escape closes the menu and returns
focus to its button.
NAV-06. Account and workspace menus are action menus; a workspace switcher with
more than 7 workspaces offers search.
NAV-07. While rows are selected, a bulk action bar shows the number selected
and the bulk actions, announces the count through a polite live region, and
sits at the bottom of the screen in the compact size class.

#### Regions

REG-01. A page header provides one level-1 heading, optional breadcrumbs and
status, a primary action, secondary actions and an overflow menu.
REG-02. A filter bar provides search, applied filters as removable chips and a
"clear all" action; in the compact size class it reduces to search and a
"Filters" button showing the number applied.
REG-03. A filter panel groups filters in collapsible sections; it is a side
panel at expanded size and above, and a full-screen sheet below.
REG-04. A label/value list shows a record's fields read-only, in two columns at
medium size and above and one column below.
REG-05. An activity timeline lists events in time order with actor, action and
time, distinguishing comments, changes and system events by text and icon.
REG-06. A number tile shows a value, a label and optionally a change with its
direction stated in text, not by colour alone.
REG-07. A chart container provides a title, legend, empty, loading and error
states, and a data-table alternative reachable by keyboard and screen reader.
REG-08. A tabs section reflects the selected tab in the URL and shows counts
where supplied.
REG-09. A confirmation dialog names the object and the consequence, starts
focus on the non-destructive choice, and can require the user to type the
object's name before a serious destructive action.
REG-10. State panels exist for first use, no results, no permission, error and
partially loaded content; each states what happened and offers the next
action (no-results lists the active filters and a way to clear them; error
offers retry).
REG-11. Pagination shows the position ("21–40 of 312"), page size and
previous/next, and preserves the position when the user returns to the list.

#### Screens

SCR-01. The app shell composes primary navigation, a top bar, account and
workspace menus and a content area, and provides slots for notifications and
help.
SCR-02. Error screens exist for not found, no permission, offline, maintenance
and expired session, each with a way forward.
SCR-03. A collection list composes the page header, filter bar, a table or
list, selection, the bulk action bar, pagination and all state panels.
SCR-04. A list-with-detail screen keeps the list visible beside the selected
record at expanded size and above, moves selection with the arrow keys, and
shows the record as its own view with a Back link below expanded size.
SCR-05. A record detail screen composes the page header with status and
actions, a label/value list, a tabs section, related lists and an activity
timeline.
SCR-06. A full-page form lays fields out in one column with labels above
fields, validates on blur and on submit, shows an error summary at the top
that links to each invalid field and receives focus on a failed submit, keeps
save and cancel visible, and warns before leaving with unsaved changes.
SCR-07. Quick create/edit presents a short form as a modal dialog at medium
size and above and as a full-screen sheet below; focus is trapped while open
and returns to the triggering control on close.
SCR-08. A dashboard composes number tiles and chart containers in a grid of
1, 2 or 3–4 columns by size class, with page-wide filters, a date range and the
last-refreshed time.
SCR-09. A report viewer composes a parameter panel, results as a table and/or
chart, and export and print actions; the applied parameters remain visible as a
summary above the results in every size class.
SCR-10. A settings screen shows section navigation beside the sections at
expanded size and above, and a section list leading to each section below.
SCR-11. Every screen pattern takes its content through slots; no pattern
fetches data, routes, or decides permissions.

#### Responsiveness

RSP-01. Every pattern adapts to the width of its container, not the window, at
the five size-class boundaries; only the app shell adapts to the window.
RSP-02. Every pattern reflows at 320 CSS px with no horizontal page scroll;
only data tables, charts and maps may scroll horizontally inside their own
region.
RSP-03. In the compact size class, collection lists render each row as a
stacked item showing the columns marked as priority.
RSP-04. On touch input (`pointer: coarse`) every target is at least the
touch-target token's size; on any input every target is at least 24×24 CSS px.
RSP-05. No action or information is available only on hover.
RSP-06. Sticky headers, toolbars and action bars never cover the element that
has keyboard focus.
RSP-07. Full-height layouts fit the visible viewport on mobile browsers,
including when the on-screen keyboard is open, and keep content out of device
safe areas.
RSP-08. When a layout changes size class while a user is working (for example
two panes collapse to one), keyboard focus stays on, or moves to, the element
the user was working with.

#### Variants

VAR-01. Patterns implement the initial variant points `navigation` (labelled
side menu or icon rail at expanded size and above), `tabs` (underlined or
enclosed), `page-header` (large or compact title) and `table` (ruled or
banded rows), each through token values only (ADR-022).
VAR-02. Each variant point has a default that applies when a design system
names none.
VAR-03. Switching theme or appearance at run time changes variants without
moving, adding or removing content or actions, and without losing focus or
form input.
VAR-04. A pattern inside a nested theme shows the inner theme's variants.

#### Agent guidance

AGT-01. `catalogue.json` and `@ux-builder/mcp` list every pattern with its slots,
states, size-class behaviour and variant points.
AGT-02. Agent guidance states when to choose each pattern over its nearest
alternative: list or list-with-detail, full-page form or quick create, wizard
or task list (when P1 lands), table or stacked items.
AGT-03. The agent rules in `catalogue.json` direct agents to compose screens
from patterns and layout primitives before writing layout CSS.

#### Extended screens *[Added 2026-10-19 — operator decision]*

The inventory's P1 and P2 patterns, admitted by the operator on 2026-10-19
ahead of consumer evidence, under ADR-020's operator-admission amendment ("do all P1
and P2 screen patterns"). The same quality bar applies: APG keyboard and ARIA,
WCAG 2.2 AA, every applicable state, container-based responsiveness, slots and
no data fetching.

HOME-01. A home screen shows a per-user summary through slots: number tiles,
the user's assigned work and recent items, each list with its empty state.
SRCH-01. A command palette opens with Ctrl+K or Cmd+K (and from a visible
button) as a modal dialog whose combobox lists matching records and actions
in labelled groups, with recent items before typing; Enter goes to the active
result; Escape closes and returns focus.
CTX-01. A context menu opens on right-click, Shift+F10 or the ContextMenu key
at the pointer or the focused element, as an APG menu, and only duplicates
actions also available from a visible control.
WIZ-01. A wizard shows the current step ("Step 2 of 5: Title") with a step
list at medium size and above and a progress bar below; validates each step
before moving on; keeps entered data when going back; can save a draft; ends
in a review step; never asks again for data already given (WCAG 3.3.7).
WIZ-02. A task list shows independent sections of a long form with each
one's status (Not started, In progress, Completed) as text, each a link to its
section, and a count of sections completed.
REV-01. A review and confirm screen summarises answers by section with a
Change link to each, states what submitting will do, and after submitting
shows a confirmation panel with a reference.
GRID-01. An editable grid follows the APG Grid pattern: arrow keys move
between cells, Enter or F2 edits a cell, Escape cancels, Enter commits; rows
can be added and removed; each cell's error is tied to it; a totals row sums
numeric columns; below medium size a row is edited in a sheet.
QUEUE-01. A work queue shows one item at a time with its position ("3 of
12"), previous and next, approve and reject (reject requires a comment) and
assign; its keyboard shortcuts are listed in a help dialog, use a modifier
key or can be turned off (WCAG 2.1.4); the empty queue says so.
IMP-01. An import flow steps through upload (a button, and drop as an
extra), mapping file columns to fields, validation (errors listed by row with
a file of the failed rows), preview and commit, then a result report.
EXP-01. An export dialog lets the user choose a format and fields, and a
long export continues in the background with progress and a notification
when it is ready.
BOARD-01. A board groups records into status columns with counts; a card
moves by drag and by a "Move to" menu (WCAG 2.5.7); below medium size one
column shows at a time with a column switcher.
CAL-01. A calendar shows month, week and day views; the month is an APG grid
with arrow-key navigation between days; below medium size it is an agenda
list; events are named in text with their time.
ATT-01. An attachments region uploads by a button (drop as an extra), lists
files with name, type, size and version, links to each, and removes one only
after confirmation.
DRILL-01. A drill-down moves from a summary to a breakdown to records,
showing the applied levels as a trail that leads back, with each level in the
URL so Back works.
CMP-01. A period comparison shows the current and previous (or target)
values with the difference, its sign and its direction in words.
PRINT-01. A print layout prints a report with a header (title, logo and run
date) on the first page, repeated table headers, page breaks between
sections, and the light appearance.
PIVOT-01. A pivot table shows rows by columns with subtotals and a grand
total; row groups expand and collapse following the APG Treegrid pattern.
RB-01. A report builder lets the user choose measures and groupings, shows a
preview table as they choose, and saves the choice as a named report.
SUB-01. Subscriptions list a report's scheduled deliveries and alerts with
frequency or threshold and recipients, and add, pause and delete them
(delete confirmed).
USR-01. Users and roles lists members with their role, invites a member by
email with a role, changes a role, and shows a permissions matrix of roles
by permissions with row and column headers.
AUDIT-01. An audit log lists who changed what and when, with the before
and after values, filterable by person, action and date, read only.
NOTIF-01. A notification centre opens from a button that states the unread
count in text, lists notifications as read or unread with links to their
records, marks one or all as read, and offers channel preferences.
INT-01. Integrations show each connection's status with connect and
disconnect; an API key is shown in full once when created, with a copy
button, then only masked; revoking a key is confirmed.

### Non-Functional Requirements

- **Accessibility**: Every pattern and variant meets WCAG 2.2 AA; the audit
  reports zero violations on every pattern story in every theme × appearance ×
  size class.
- **Performance**: A collection list showing 50 rows from a 1,000-row data set
  responds to sort, filter and page interactions with Interaction to Next Paint
  ≤ 200 ms on a mid-range laptop (Web Vitals "good").
- **Stability**: Moving from loading to loaded, and between size classes,
  causes Cumulative Layout Shift ≤ 0.1 (Web Vitals "good"); skeletons occupy
  the space of the content they stand for.
- **Package impact**: An app importing only widgets gains no pattern
  JavaScript (patterns ship from their own entry point).
- **Coverage**: Every pattern has a story per applicable state and per variant;
  every requirement above is cited by at least one test once its story exists.

## User Stories

- [US-023 — Lay out a screen from layout primitives](../user-stories/US-023-lay-out-a-screen-from-layout-primitives.md) (Foundations: LAY-01–03, RSP-01–02)
- [US-024 — Move around an app on desktop and phone](../user-stories/US-024-move-around-an-app-on-desktop-and-phone.md) (Navigation: NAV-01–06; Screens: SCR-01–02; RSP-04–07)
- [US-025 — Find and act on records in a collection list](../user-stories/US-025-find-and-act-on-records-in-a-collection-list.md) (SCR-03; REG-01–03, REG-10–11; NAV-05, NAV-07; RSP-03)
- [US-026 — Review a record beside its list](../user-stories/US-026-review-a-record-beside-its-list.md) (SCR-04–05; REG-04–05, REG-08; RSP-08)
- [US-027 — Create and edit a record with a form](../user-stories/US-027-create-and-edit-a-record-with-a-form.md) (SCR-06–07; REG-09)
- [US-028 — Read a dashboard and a report](../user-stories/US-028-read-a-dashboard-and-a-report.md) (SCR-08–09; REG-06–07)
- [US-029 — Change settings](../user-stories/US-029-change-settings.md) (SCR-10)
- [US-030 — See each design system's conventions on the same screens](../user-stories/US-030-see-each-design-systems-conventions-on-the-same-screens.md) (Variants: VAR-01–04; FR-27)
- [US-031 — An agent builds a list, detail and form screen from patterns](../user-stories/US-031-an-agent-builds-a-list-detail-and-form-screen-from-patterns.md) (Agent guidance: AGT-01–03; FR-21)

- [US-035 — Step through a wizard, a task list and a review](../user-stories/US-035-step-through-a-wizard-a-task-list-and-a-review.md) (WIZ-01, WIZ-02, REV-01)
- [US-036 — Edit rows in a grid](../user-stories/US-036-edit-rows-in-a-grid.md) (GRID-01)
- [US-037 — Work through a queue](../user-stories/US-037-work-through-a-queue.md) (QUEUE-01)
- [US-038 — Import and export records](../user-stories/US-038-import-and-export-records.md) (IMP-01, EXP-01)
- [US-039 — Plan work on a board and a calendar, with attachments](../user-stories/US-039-plan-work-on-a-board-and-a-calendar-with-attachments.md) (BOARD-01, CAL-01, ATT-01)
- [US-040 — Drill into figures, compare periods and print](../user-stories/US-040-drill-into-figures-compare-periods-and-print.md) (DRILL-01, CMP-01, PRINT-01)
- [US-041 — Pivot, build and subscribe to reports](../user-stories/US-041-pivot-build-and-subscribe-to-reports.md) (PIVOT-01, RB-01, SUB-01)
- [US-042 — Manage users and roles, and read the audit log](../user-stories/US-042-manage-users-and-roles-and-read-the-audit-log.md) (USR-01, AUDIT-01)
- [US-043 — Notifications, integrations and API keys](../user-stories/US-043-notifications-integrations-and-api-keys.md) (NOTIF-01, INT-01)
- [US-044 — Start from home, search everything, and use context menus](../user-stories/US-044-start-from-home-search-everything-and-use-context-menus.md) (HOME-01, SRCH-01, CTX-01)

SCR-11 (slots, no data fetching) is exercised across US-025 to US-029. The
builder's screens preview is US-032, under FEAT-003 (BB-18).

## Edge Cases and Error Handling

- **Container narrower than 320 px** (a very narrow embed): the compact layout
  applies; text wraps; no content is clipped without a way to reach it.
- **Long and translated text** (labels 30–40% longer, as in German): headers,
  tabs, chips and buttons wrap or truncate with the full text available to
  assistive technology and on focus.
- **Zero, one and very many items**: zero shows the first-use or no-results
  panel; one item still offers list actions; very many items page rather than
  render all rows.
- **Partial permission**: actions the user cannot take are hidden or disabled
  with a stated reason; a screen with no permitted content shows the
  no-permission panel.
- **Slow or failed loading**: skeletons after a short wait; errors keep the
  page's frame, filters and navigation usable and offer retry.
- **Theme switch while a dialog or menu is open**: it stays open with focus
  unchanged.
- **Resize across a size class with unsaved form input**: input is kept.
- **Reduced motion**: pane, sheet and dialog transitions are removed.
- **Printing a report or record**: navigation and actions are omitted; tables
  repeat their headers.

## Success Metrics

- The billing-review app replaces its private table and navigation layer with patterns and
  deletes that CSS.
- An app built from the starter has a list, detail and form screen with no
  app-written layout CSS.
- An agent using `@ux-builder/mcp` builds a list + detail + form screen from
  patterns in one session without hand-written layout CSS.
- Zero audit findings on pattern stories across every theme × appearance ×
  size class at release.

## Constraints and Assumptions

- Patterns follow ADR-016: framework-free `.piq-*` CSS reading tokens; React 19
  components own behaviour and markup only.
- Patterns are admitted under ADR-020's rule; this feature's P0 set comes from
  the inventory, with P0 need assumed (provisional) for patterns beyond the
  shell, collection list, record detail and form until the billing-review app and
  the harness port confirm.
- Variants are limited to what tokens can express (ADR-022).
- The harness may own sign-in, notifications and global search for embedded
  products; those screens are not in this feature until that is settled.

## Dependencies

- **Other features**: FEAT-004 (widgets, ThemeProvider, catalogue, audit,
  MCP server); FEAT-001 (design system files gain the `variants` member and
  layout tokens); FEAT-002 (a categorical chart palette per theme, needed by
  the chart container's charts); FEAT-003 (builder screen preview, a follow-up
  amendment).
- **Basic widgets to add first** (FEAT-004 scope): tabs, dialog, drawer/sheet,
  menu button, breadcrumbs, combobox, date and date-range picker, tooltip,
  pagination.
- **Contracts**: CONTRACT-001 (layout and variant token names), CONTRACT-002
  (`variants` member in design system and anatomy), CONTRACT-004 (the
  `@ux-builder/ui/patterns` entry point and pattern slots) — each revised for this
  feature.
- **PRD requirements**: FR-21, FR-25, FR-26; FR-27 through FEAT-001.

## Out of Scope

- A page builder or configuration-driven screens (PRD non-goal; ADR-020).
- Data fetching, routing, permissions and domain logic.
- Sign-in and account recovery screens (pending the harness decision).
- The builder's screen preview and variant comparison (FEAT-003 amendment).
- A chart rendering library choice (technical design).
- Non-React bindings (ADR-016).
- Brand-selectable variants (ADR-022).

## Open Questions

1. Which P0 patterns beyond the shell, collection list, record detail and form
   do the billing-review app and the harness port need first?
2. Does the harness own sign-in, notifications and global search for embedded
   products?
3. Which variant does each shared design system choose at each initial point,
   and from which source? To be recorded in each design system file.
