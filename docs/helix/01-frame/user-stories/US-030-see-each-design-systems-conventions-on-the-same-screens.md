---
ddx:
  id: US-030
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-006
    - kind: informed_by
      to: ADR-022
    - kind: informed_by
      to: ADR-013
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: CONTRACT-002
    - kind: informed_by
      to: CONTRACT-003
---

# US-030: See each design system's conventions on the same screens

**Feature**: FEAT-006 — Screen patterns
**Feature Requirements**: VAR-01, VAR-02, VAR-03, VAR-04
**PRD Requirements**: FR-27, FR-25
**Priority**: P0
**Status**: Draft

## Story

**As an** app developer building on the SDK
**I want** the same screen to follow Carbon's, Material's or Fluent's conventions for navigation, tabs, page headers and tables according to the theme my app selects
**So that** each client's app looks like its design system without my writing per-system code, and switching theme never rearranges what users rely on

## Context

Requested by the operator on 2026-10-18; implements FEAT-006's variants
under ADR-022 (pattern variants are named token bundles, chosen by the
design system). A design system names one variant at each variant point in
its file; patterns implement every variant with one markup and CSS that
reads tokens, so variants work with plain `data-theme` and inside nested
themes. Brands are identity only (ADR-013) and cannot choose variants.
The initial points are navigation (labelled side menu or icon rail at
expanded size and above), tabs (underlined or enclosed), page header (large
or compact title) and table (ruled or banded rows).

## Walkthrough

1. The developer renders a record detail screen under Praxis Carbon: a
   labelled side menu, underlined tabs, a compact title and ruled rows.
2. They switch the app to Praxis Material at run time with a dialog open
   and a half-filled field; the navigation becomes an icon rail, tabs
   change to Material's convention and the title grows. The dialog stays
   open, focus and input are kept, and nothing moves in reading order.
3. A design system that names no table variant shows the default.
4. A panel themed Databricks inside the Carbon app shows Databricks'
   variants; the page around it keeps Carbon's.

## Acceptance Criteria

- [ ] **US-030-AC1** — Given two design systems naming different variants at the navigation, tabs, page-header and table points, when the same screen renders under each, then each point shows its named variant and the DOM (elements, order, text and actions) is identical between the two renders.
- [ ] **US-030-AC2** — Given a design system that names no variant at a point, when the themes are built, then that point uses the pattern's default and existing themes build unchanged.
- [ ] **US-030-AC3** — Given a brand file that names a variant, when the themes are built, then the build fails stating that variants belong to the design system (CONTRACT-002).
- [ ] **US-030-AC4** — Given a screen with a dialog open, focus on a field and typed input, when the theme or appearance switches at run time, then the dialog stays open, focus and input are unchanged, and no content or action is added, removed or reordered.
- [ ] **US-030-AC5** — Given a pattern inside a nested theme whose design system names different variants from the outer one, when it renders with only `data-theme` attributes (no provider), then the inner pattern shows the inner variants and the outer pattern the outer ones.
- [ ] **US-030-AC6** — Given the navigation variant icon rail, when the shell renders at expanded size, then every destination keeps an accessible name equal to its label in the side-menu variant.
- [ ] **US-030-AC7** — Given every variant of every point, when the audit runs on the pattern stories at one width per size class in every theme and appearance, then it reports no errors, including contrast and target size.

## Edge Cases

- **Variant change at compact size**: navigation is a bottom bar in every variant; only its look follows the design system.
- **Theme switch while a menu is open**: it stays open with focus unchanged.
- **Design system names an unknown variant**: the build fails naming the point and the allowed variants.
- **A theme's own anatomy names a variant**: it applies to that theme only, as a design system's choice would (ADR-022 rule 3).

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Same DOM | US-030-AC1 | Record detail, Praxis Carbon and Praxis Material | Render both; diff DOM; screenshot | DOM equal; variants differ visually |
| Default | US-030-AC2 | Design system with no `table` choice | Build | Default table; other themes' output unchanged |
| Brand refused | US-030-AC3 | Brand file naming a tabs variant | Build | Fails with the stated reason |
| Live switch | US-030-AC4 | Quick-create dialog, "Acme" typed | Switch theme, then appearance | Open; focus and "Acme" kept; DOM unchanged |
| Nested | US-030-AC5 | Databricks panel in Carbon page, attributes only | Render | Inner and outer variants each correct |
| Rail names | US-030-AC6 | Icon rail at 1024 px | Read accessible names | Same as side-menu labels |
| Audit | US-030-AC7 | All variant stories | `ux-builder-audit` at 5 widths × themes × appearances | Exit 0 |

## Dependencies

- **Stories**: US-024, US-025, US-026
- **Feature Spec**: FEAT-006
- **Feature Requirements**: VAR-01 to VAR-04
- **PRD Requirements**: FR-27, FR-25
- **External**: CONTRACT-002 revision (the design system's variants member), CONTRACT-001 revision (variant token names), CONTRACT-003 (theme selection and reset); FEAT-001 (each shared design system's choices)

## Out of Scope

- Brand-selectable variants (ADR-022, rejected).
- Variants that need different markup or behaviour (a different pattern under ADR-020).
- Which variant each shared design system chooses (recorded in its design system file).
- Comparing variants in the builder (US-032).
