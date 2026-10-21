---
ddx:
  id: US-054
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-008
    - kind: informed_by
      to: ADR-025
---

# US-054: Audit an app's structure and interaction

**Feature**: FEAT-008 — Interaction and information architecture: rules, blueprint and audit
**Feature Requirements**: AUD-01, AUD-02
**PRD Requirements**: FR-35
**Priority**: P1
**Status**: Draft

## Story

**As a** tech lead of an app built on the SDK (or an agent auditing its own work)
**I want** the audit to report modal, emphasis, navigation and line-length problems by rule ID
**So that** the running app is held to the same rules as its blueprint

## Context

ADR-025 decision 4. The audit already runs every theme, appearance and width (SDK-18, SDK-20).

## Walkthrough

1. CI runs `npx ux-builder-audit --width 390 --width 1280 <url>`.
2. At 390 px the bottom navigation shows seven destinations: `nav-per-breakpoint`.
3. A page shows Save and Publish as primary buttons: `one-primary-action`.
4. An open dialog has no title: `modal-contract`.
5. Each finding names its rule and links its source; they are warnings this release.

## Acceptance Criteria

- [ ] **US-054-AC1** — Given a page with two modal dialogs open, when the audit runs, then it reports `one-modal` naming both.
- [ ] **US-054-AC2** — Given an open modal dialog with no accessible name, with no dismiss control, or that Escape does not close, when the audit runs, then it reports `modal-contract` naming the dialog and what is missing.
- [ ] **US-054-AC3** — Given two primary buttons in one page region, when the audit runs, then it reports `one-primary-action`; one primary button in each of two dialogs is not reported.
- [ ] **US-054-AC4** — Given primary navigation showing more top-level destinations than the rule allows at a compact width, or hidden behind a menu button at an expanded or wider width, when the audit runs at that width, then it reports `nav-per-breakpoint`.
- [ ] **US-054-AC5** — Given a paragraph whose lines run past the rule's character limit, when the audit runs, then it reports `line-length` naming the element and its measured characters per line.
- [ ] **US-054-AC6** — Given any finding from these checks, when the reports are written, then it carries its rule ID and source titles, the HTML report links each source, and with the default failure level the findings are warnings and the audit exits 0.

## Edge Cases

- `data-audit-ignore` excludes an element from these checks.
- A dialog the page does not open is not opened by the audit.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Two modals | US-054-AC1 | Two open dialogs | Audit | one-modal |
| Contract | US-054-AC2 | Nameless, undismissable dialog | Audit | modal-contract |
| Primary | US-054-AC3 | Two primaries in main; one per dialog | Audit | One finding |
| Navigation | US-054-AC4 | 7 destinations at 390; nav in menu at 1280 | Audit at both | Two findings |
| Lines | US-054-AC5 | 120-character lines | Audit | line-length |
| Rule IDs | US-054-AC6 | Any finding | Read reports | Rule, sources, warning, exit 0 |

## Dependencies

- **Feature Spec**: FEAT-008
- **Feature Requirements**: AUD-01, AUD-02
- **PRD Requirements**: FR-35
- **External**: CONTRACT-004 and CONTRACT-005 revisions

## Out of Scope

- See FEAT-008 "Out of Scope".
