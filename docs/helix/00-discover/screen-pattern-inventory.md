---
ddx:
  id: screen-pattern-inventory
  status: draft
  links:
    - kind: informed_by
      to: product-vision
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: ADR-011
    - kind: informed_by
      to: ADR-012
    - kind: informs
      to: ADR-020
    - kind: informs
      to: ADR-021
    - kind: informs
      to: ADR-022
    - kind: informs
      to: FEAT-006
---

# Screen Pattern Inventory — what a complete SaaS app needs

> Drafted 2026-10-18 at the operator's request: "a list of screen patterns
> necessary to build complete SaaS-type apps for both transactional and
> reporting work", including menu systems and responsiveness from desktop to
> smartphone, "based on best practices". A discovery note, not a governed
> artifact type: it feeds ADR-020 (a patterns layer in `@ux-builder/ui`),
> ADR-021 (the responsive layout model), ADR-022 (variants per design system)
> and FEAT-006 (screen patterns).

## Summary

- `@ux-builder/ui` 0.6.0 ships **basic widgets** (Button, Field, Choice,
  ChoicePicker, DataTable, Notice, StatusPill, Toast, Loading). Nothing above
  them: no layout primitives, no navigation, no screen patterns, no breakpoints
  or size-class tokens.
- A complete transactional + reporting app needs **~40 screens** built from
  **~15 shared regions** and **~6 menu systems** (below), each adapting across
  five window size classes.
- The **P0 set** (13 screens, all regions, primary navigation and action
  menus) covers the core of a CRUD + dashboard app; P1 and P2 extend it.
- Prerequisite gaps: 10 basic widgets (§7) and layout/size-class tokens
  (§6.2). Charts also need a categorical palette per theme from the engine.
- Scope conflict: the PRD non-goal "Not every component of Material, Fluent or
  Carbon", ADR-011's admission-by-need rule, and ADR-011's note that "the
  package supplies widgets, not views". ADR-020 addresses all three.

Priority: **P0** a minimal working transactional or reporting app needs it ·
**P1** needed for typical SaaS coverage · **P2** admit when a product asks.

## Best-practice sources

Every rule below cites one of these. Where sources disagree, the ranking is
legal/accessibility standard → platform guideline → research → mature design
system.

| Ref | Source | Used for |
|---|---|---|
| WCAG | W3C WCAG 2.2, level AA | Reflow, target size, focus, error handling, redundant entry, dragging |
| APG | W3C WAI-ARIA Authoring Practices Guide | Keyboard and ARIA contract for every interactive pattern |
| M3 | Material Design 3 — window size classes, canonical layouts, navigation | Size classes; navigation by size; list-detail and supporting-pane layouts |
| HIG | Apple Human Interface Guidelines | Touch targets (44 pt), tab bars, sheets, safe areas |
| GOV.UK | GOV.UK Design System | Error summary, check-answers, task list, one-question-per-page |
| NN/g | Nielsen Norman Group research | Navigation discoverability, tables on mobile, empty states, form usability |
| Baymard | Baymard Institute form research | Single-column forms, inline validation timing, field labelling |
| Carbon / Fluent | IBM Carbon, Microsoft Fluent 2 | Data-table, filter and dashboard patterns in enterprise apps (the design systems this SDK already themes) |

## 1. App frame and menu systems

### 1.1 Screens

| Screen | Must handle | Pri |
|---|---|---|
| **App shell** | Primary nav, top bar, workspace/tenant switcher, user menu, slots for notifications and help; adapts per size class (§6.3) | P0 |
| **Home / landing** | Per-user summary: assigned work, recent items, key numbers | P1 |
| **Global search / command palette** | Search across record types, jump to a record or action, keyboard-first (Ctrl/Cmd+K), recent items | P1 |
| **Error pages** | Not found, no permission, offline, maintenance, session expired; each with a way forward | P0 |
| **Sign-in and recovery** | Open question: likely owned by the harness for embedded products (ADR-012); standalone apps may still need it | ? |

### 1.2 Menu systems

| Menu system | Use for | Desktop (expanded+) | Smartphone (compact) | ARIA contract (APG) | Pri |
|---|---|---|---|---|---|
| **Primary navigation** | Moving between top-level destinations | Persistent side nav, collapsible to a rail; groups expand by disclosure | Bottom navigation bar for 3–5 top destinations, the rest in a modal drawer | `<nav>` + list of links + `aria-current="page"`; groups are disclosure buttons (`aria-expanded`). **Not** `role="menu"` | P0 |
| **Secondary / local navigation** | Sections inside one area or record | Tabs, or a second level in the side nav | Scrollable tabs; past ~5 tabs, a select-style switcher | Tabs pattern (`tablist`/`tab`/`tabpanel`, arrow keys) when panels swap in place; links + `aria-current` when they change the URL | P0 |
| **Breadcrumbs** | Showing position in a hierarchy, going up | Full trail | Collapses to a single "← Parent" link | `<nav aria-label="Breadcrumb">`, ordered list, `aria-current="page"` on the last item | P0 |
| **Action menus** | Actions on a page, record or row | Menu button ("More", ⋯), split button, row-action menu | The same, opened as a bottom sheet when long | Menu button pattern: `aria-haspopup`, `aria-expanded`, `role="menu"`/`menuitem`, arrow keys, Esc returns focus to the button | P0 |
| **Account / workspace menus** | Profile, settings, sign-out; switching tenant | Menu button in the top bar | In the drawer or top bar | Menu button pattern; tenant switcher with search is a combobox | P0 |
| **Bulk action bar** | Actions on selected rows | Replaces the toolbar while rows are selected; shows count | Sticky at the bottom of the screen | `role="toolbar"`, count announced through a polite live region | P0 |
| **Command palette** | Fast navigation and actions for frequent users | Modal dialog with a search input and results | Full-screen dialog | Dialog + combobox with listbox popup | P1 |
| **Context menu** | Right-click shortcuts | Allowed only as a **duplicate** of a visible action menu | Not used (no right-click; long-press conflicts with text selection) | Menu pattern; never the only way to reach an action | P2 |

**Menu rules**

- Site navigation is a list of links, not an ARIA menu; `role="menu"` is for
  actions only (APG). The active destination carries a visible cue **and**
  `aria-current="page"`.
- Keep primary navigation visible on desktop; hidden navigation is used less
  (NN/g on hamburger menus). On smartphones, a bottom bar beats a hamburger
  for the 3–5 most-used destinations (M3, HIG, NN/g).
- Navigation is the same on every screen, in the same order (WCAG 3.2.3
  Consistent Navigation, 3.2.6 Consistent Help).
- Out of scope: **menubars** (File/Edit desktop menus; APG warns they are
  rarely the right model for web apps) and **mega menus** (marketing sites,
  not apps).

## 2. Transactional screens

| Screen | Must handle | Best-practice notes | Pri |
|---|---|---|---|
| **Collection list** | Search, filters, sort, paging, selection, bulk actions, saved views, column choice, all states (§5) | Filters show what is applied as removable chips (Carbon, Fluent); paging keeps position on return (NN/g) | P0 |
| **List with detail panel** | List stays visible while the selected record opens beside it; up/down moves selection | M3 canonical list-detail layout; one pane with back navigation on compact | P0 |
| **Record detail** | Header with title, status, actions; key fields; tabs; related lists; activity history | Primary action visible, the rest in an overflow menu; status by text + colour, never colour alone (WCAG 1.4.1) | P0 |
| **Create / edit form (full page)** | Sections, validation, error summary, sticky save/cancel, unsaved-changes warning | One column (Baymard); labels above fields; validate on blur or submit, not per keystroke (Baymard); error summary at top linking to each field (GOV.UK, WCAG 3.3.1/3.3.3); correct `autocomplete` and `inputmode` | P0 |
| **Quick create / edit** | Same form in a dialog (desktop) or full-screen sheet (compact) | Only for short forms (≲6 fields); dialog traps focus and restores it on close (APG Dialog) | P0 |
| **Wizard** | Steps, per-step validation, save draft, back without data loss, review step | Never ask again for data already given (WCAG 3.3.7 Redundant Entry); for long multi-section forms done in any order use a task list instead (GOV.UK) | P1 |
| **Review and confirm** | Read-only summary with "Change" links per section, then a result page | GOV.UK check-answers; irreversible actions say what will happen (WCAG 3.3.4 Error Prevention) | P1 |
| **Editable grid / line items** | Add/remove rows, per-cell errors, totals | APG Grid keyboard model; on compact edit one row in a sheet | P1 |
| **Work queue / approvals** | Next/previous, approve/reject with comment, assign, count remaining | Keyboard shortcuts for the frequent actions, listed in a help dialog | P1 |
| **Import** | Upload, map columns, validate, preview errors, commit, result report | Errors listed by row with a downloadable file of failed rows | P1 |
| **Export / download** | Choose format and fields; progress for long exports | Long jobs continue in the background and notify when done | P1 |
| **Board (Kanban)** | Grouped by status, move between columns, totals | Drag must have a non-drag alternative such as a "Move to" menu (WCAG 2.5.7 Dragging Movements) | P2 |
| **Calendar / schedule** | Month/week/day, create event, resource lanes | Becomes an agenda list on compact | P2 |
| **Attachments** | Upload, list, preview, version | Upload has a button, not only drag-and-drop (WCAG 2.5.7) | P2 |

## 3. Reporting and analysis screens

| Screen | Must handle | Best-practice notes | Pri |
|---|---|---|---|
| **Dashboard** | Number tiles, chart grid, page-wide filters and date range, last-refreshed time | Most important figure top-left; related tiles grouped under headings; each chart has a title stating what it answers (NN/g, Carbon) | P0 |
| **Report viewer** | Parameter panel, results as table and/or chart, export, print | Parameters stay visible or summarised above results; results URL reproduces the report | P0 |
| **Drill-down** | Summary → breakdown → records, with a trail back | Breadcrumb trail of applied drill levels; browser Back works | P1 |
| **Period comparison** | Current vs previous or target, differences and direction | Direction by sign and icon, not colour alone (WCAG 1.4.1) | P1 |
| **Print / PDF layout** | Page breaks, repeated table headers, logo, paper-safe theme | `@media print`; tables repeat `<thead>` | P1 |
| **Pivot / cross-tab** | Rows × columns, subtotals, expand/collapse | APG Treegrid keyboard model | P2 |
| **Explore / report builder** | Pick measures and groupings, save as a report | — | P2 |
| **Subscriptions and alerts** | Scheduled delivery, threshold alerts | — | P2 |

**Chart rules** (all P0 with the dashboard): every chart has an accessible
data-table alternative (WCAG 1.1.1); series are told apart by more than colour
(WCAG 1.4.1); graphical elements clear 3:1 against their background (WCAG
1.4.11); colours come from a categorical palette the engine generates and
contrast-checks per theme and appearance.

## 4. Admin and account screens

| Screen | Must handle | Pri |
|---|---|---|
| **Settings** | Sectioned navigation (in-page nav on desktop, list → section on compact); save per section | P0 |
| **Users and roles** | Invite, list, assign roles, permissions matrix | P1 |
| **Audit log** | Filterable read-only history of who changed what, when | P1 |
| **Notification centre and preferences** | Read/unread, links to records, channels | P2 |
| **Integrations / API keys** | Connect/disconnect, status, show a secret once then mask it | P2 |

## 5. Shared regions

Built once, reused by the screens above. All P0 unless marked.

| Region | Must handle |
|---|---|
| **Page header** | Title (`<h1>`), breadcrumbs, status, primary action, secondary actions, overflow menu |
| **Toolbar / filter bar** | Search, filter chips, saved views, date range, density and column controls; on compact collapses to search + a "Filters (n)" button opening a sheet |
| **Faceted filter panel** | Collapsible filter groups with counts; side panel on desktop, full-screen sheet on compact |
| **Label/value list** | A record's fields read-only; two columns on desktop, stacked on compact |
| **Activity timeline** | Comments, changes and system events in order |
| **Number tile** | Value, label, change, sparkline |
| **Chart container** | Title, legend, empty/loading/error, table alternative, export |
| **Section with tabs** | Tabs reflected in the URL, with counts |
| **Confirmation dialog** | Destructive actions name the object and consequence; typed confirmation for serious ones; focus starts on the safe choice |
| **State panels** | First use (explain + primary action), no results (show the active filters + clear), no permission (who to ask), error (what happened + retry), partial (what is missing) (NN/g, Carbon) |
| **Pagination** | Page size, position "21–40 of 312", keeps position on return; P1: infinite scroll only for feeds, never for tables that need a footer |

**State rules**: loading uses skeletons shaped like the content for waits
over ~1 s and a spinner for short in-place actions; results and errors are
announced through live regions (WCAG 4.1.3 Status Messages); no screen shows a
blank area while waiting.

## 6. Responsiveness — desktop to smartphone

### 6.1 Requirements

| Requirement | Source |
|---|---|
| Content reflows at **320 CSS px** wide (= 1280 px at 400% zoom) with no horizontal page scroll; only data tables, charts and maps may scroll in two directions | WCAG 1.4.10 |
| Text resizes to 200% without loss | WCAG 1.4.4 |
| Works in portrait and landscape | WCAG 1.3.4 |
| Pointer targets **≥ 24×24 CSS px** (AA); **44×44** on touch devices (`pointer: coarse`) | WCAG 2.5.8; HIG 44 pt; M3 48 dp |
| Sticky headers, toolbars and action bars never hide the focused element | WCAG 2.4.11 |
| Nothing works by hover alone; hover content is dismissible and hoverable | WCAG 1.4.13 |
| Every drag has a single-pointer alternative | WCAG 2.5.7 |
| Form inputs are ≥ 16 px text on mobile so iOS does not zoom on focus | Platform behaviour (iOS Safari) |
| Full-height layouts use dynamic viewport units (`dvh`) and respect safe-area insets (`env(safe-area-inset-*)`) | HIG; CSS Values 4 |
| Motion respects `prefers-reduced-motion` (already in `ui.css`) | WCAG 2.3.3 |

### 6.2 Size classes

Adopt **M3 window size classes**: device-agnostic, published, and they come
with navigation guidance. Values in CSS px.

| Class | Width | Typical device | Panes |
|---|---|---|---|
| Compact | < 600 | Phone portrait | 1 |
| Medium | 600–839 | Tablet portrait, phone landscape, narrow embed | 1 (optionally 2 small) |
| Expanded | 840–1199 | Tablet landscape, small laptop | 2 |
| Large | 1200–1599 | Laptop, desktop | 2–3 |
| Extra-large | ≥ 1600 | Wide desktop | 3; content width capped |

New tokens: content max-widths (reading ~70ch, form, page), page gutters per
class, minimum touch-target size; the boundaries themselves are fixed
constants (§6.4). Density stays a
design-system decision (ADR-013): Carbon dense, Material roomier.

### 6.3 How each pattern adapts

| Pattern | Compact | Medium | Expanded+ |
|---|---|---|---|
| App shell | Bottom nav bar (3–5) + modal drawer; top bar with title and one action | Navigation rail | Persistent side nav (collapsible to rail) |
| List with detail | List, then detail as its own view with Back | List, then detail; or two panes in landscape | Two panes side by side |
| Collection list | Rows become stacked cards with 2–4 priority fields; filters in a sheet; bulk bar at bottom | Table with priority columns; others hidden behind column choice | Full table |
| Record detail | Tabs scroll; related lists collapse to counts with "View all" | As compact with two-column field lists | Supporting pane for activity |
| Forms | One column; sticky bottom action bar above the keyboard and safe area | One column, max form width | One column, max form width; optional section nav |
| Quick create / dialogs | Full-screen sheet | Dialog | Dialog or side drawer |
| Wizard | "Step 2 of 5 — Title" + progress bar | Same, or compact stepper | Full stepper |
| Editable grid | Edit one row in a sheet; the grid scrolls horizontally | Grid scrolls horizontally | Full grid |
| Dashboard | One column; tiles 2-up; charts simplified (fewer ticks, legend below) | Two columns | 3–4 column grid |
| Report viewer | Parameters in a sheet, summarised as chips above results | Collapsible parameter panel | Side parameter panel |
| Board | One column at a time with a column switcher | Two columns, horizontal scroll | All columns |
| Calendar | Agenda list | Week | Month/week/day |
| Settings | Section list → section view | Same | In-page nav + sections |

### 6.4 Mechanism

- **Container queries for patterns, media queries for the shell.** A pattern
  adapts to the width it is given, not to the screen. An embedded product's
  view is rendered by the harness in an iframe of its own size (ADR-012), and
  a list inside a side pane must behave like a list on a phone. Container
  queries have been supported in all evergreen browsers since 2023.
- Input-type queries (`pointer: coarse`, `hover: none`) set target sizes and
  remove hover-only affordances, independent of width.
- No device or user-agent detection.
- Size-class boundaries are fixed constants: CSS cannot read a custom
  property in a query condition. Gutters, content widths and target sizes are
  tokens a design system can change without touching `ui.css`.

## 7. Basic widgets the patterns need first

| Widget | Needed by | APG pattern |
|---|---|---|
| Tabs | Record detail, settings, sections | Tabs |
| Dialog | Quick create, confirm, command palette | Dialog (modal) |
| Drawer / sheet | Filters, mobile nav, quick create on compact | Dialog (modal) / disclosure |
| Menu button | Action, account, row menus | Menu button |
| Breadcrumbs | Shell, drill-down | Breadcrumb |
| Combobox | Tenant switcher, lookups, filters | Combobox |
| Date and date-range picker | Filters, forms, reports | Dialog + grid (date picker) |
| Tooltip | Icon-only buttons, chart values | Tooltip |
| Pagination | Collection list, reports | — (nav + links/buttons) |
| Charts | Dashboard, reports | — (with table alternative) |

## 8. Recommended P0 set

**Screens**: app shell, error pages, collection list, list with detail panel,
record detail, full-page form, quick create/edit, dashboard, report viewer,
settings. **Menus**: primary navigation, local navigation, breadcrumbs, action
menus, account/workspace menus, bulk action bar. **Regions**: all of §5.
**Foundation**: size-class and layout tokens (§6.2), layout primitives
(stack, cluster, grid, page, split view), the §7 widgets except charts, then
charts with the engine's categorical palette.

## Open questions

1. Does the harness own sign-in, the notification centre and global search for
   embedded products, leaving apps to supply only their own screens?
2. Which products confirm need for each P0 pattern? ADR-011 records that
   the billing-review app built "its own table and navigation layer"; the harness port of this
   application's UI is the second candidate.
3. Does any consumer need right-to-left layouts? Either way, patterns use
   logical CSS properties (`inline-start`, not `left`) from the start; adding
   them later means touching every rule.
