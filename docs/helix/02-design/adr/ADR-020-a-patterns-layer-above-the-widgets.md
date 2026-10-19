---
ddx:
  id: ADR-020
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: ADR-011
    - kind: informed_by
      to: ADR-012
    - kind: informed_by
      to: ADR-013
    - kind: informed_by
      to: ADR-016
    - kind: informed_by
      to: screen-pattern-inventory
    - kind: informs
      to: ADR-021
    - kind: informs
      to: ADR-022
    - kind: informs
      to: FEAT-006
    - kind: informs
      to: FEAT-004
---

# ADR-020: A patterns layer above the widgets — layout, navigation and screen patterns in `@ux-builder/ui`

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-18 | **Accepted** 2026-10-18 | Operator; harness team as owner | ADR-011, ADR-012, ADR-013, ADR-016, ADR-021, ADR-022, FEAT-004, FEAT-006, `00-discover/screen-pattern-inventory.md` | Medium |

## Context

| Aspect | Description |
|--------|-------------|
| Problem | Apps on the SDK get basic widgets but build every screen's layout, navigation, list, form and dashboard structure themselves. Screens differ between apps, states (empty, error, loading) are skipped, responsive behaviour is reinvented per app, and AI coding agents have no screen-level building blocks to compose. |
| Current State | `@ux-builder/ui` 0.6.0: Button, Field, Choice, ChoicePicker, DataTable, Notice, StatusPill, Toast, Loading, ThemeProvider, icons, Logo. No layout primitives, navigation, dialogs or screen patterns. ADR-011 records that the billing-review app "has built its own table and navigation layer". |
| Requirements | Vision: apps look and behave like the client "without anyone hard-coding a colour, a font or a widget". PRD FR-17 (apps get widgets from the SDK), FR-21 (agents read what widgets exist). Operator request 2026-10-18: higher-order widgets — list views, forms, wizards — for complete transactional and reporting apps, responsive from desktop to smartphone, based on best practices. |
| Decision Drivers | (1) The same screen problems are solved per app today. (2) Usability comes mostly from structure and states, which basic widgets do not carry. (3) Agents build screens faster and more consistently from named patterns. (4) Constraints that oppose growth: the PRD non-goal "Not every component of Material, Fluent or Carbon", ADR-011's admission-by-need rule, and ADR-011's statement that "the package supplies widgets, not views". |

## Decision

We will add a **patterns layer** to `@ux-builder/ui`, exported from a new entry
point `@ux-builder/ui/patterns`, in three tiers:

1. **Layout primitives** — stack, cluster, grid, page, split view.
2. **Navigation and regions** — primary navigation, local navigation,
   breadcrumbs, action menus, account/workspace menus, bulk action bar, page
   header, toolbar/filter bar, filter panel, label/value list, activity
   timeline, number tile, chart container, state panels, pagination,
   confirmation dialog.
3. **Screen patterns** — the P0 set in the inventory (§8): app shell, error
   pages, collection list, list with detail panel, record detail, full-page
   form, quick create/edit, dashboard, report viewer, settings.

A pattern is a **composition of SDK widgets with layout, interaction and
states, and no product data or domain logic**. It takes content through slots
(children and named render props), never through a configuration object that
describes the screen. Data fetching, routing and permissions stay in the app.

Patterns follow ADR-016 unchanged: framework-free `.piq-*` CSS reading tokens,
React components own behaviour and markup only, and the markup is the
contract a second binding follows.

**Admission rule for patterns** (extends ADR-011's rule for widgets): a
pattern enters the package when **two consumers** (the harness, an embedded
product, or an app built from the starter) need it, or when one consumer needs
it and the inventory marks it P0. Each pattern records its consumers in its
story. P1 and P2 patterns in the inventory wait for that evidence.

**Quality bar** for every pattern: keyboard and ARIA behaviour per the WAI-ARIA
Authoring Practices; WCAG 2.2 AA including reflow at 320 px, target size and
focus-not-obscured; every applicable state (empty, loading, error, no
permission, partial) built in; responsive per ADR-021; a story per state;
listed in `catalogue.json` and served by `@ux-builder/mcp` with its slots and
states.

**Key Points**: Compositions, not views | Slots, not configuration | Admitted by evidence | States and accessibility are part of the pattern

## Alternatives

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| **Stay at basic widgets; publish screen recipes as docs** | No new surface to own; keeps ADR-011 as written | Every app re-implements layout, states and responsiveness; recipes drift and agents still assemble screens by hand; the billing-review app's private layer stays | Rejected: leaves the problem the operator raised unsolved |
| **Adopt a third-party pattern library (e.g. a headless kit plus our CSS)** | Mature keyboard and focus behaviour | Its markup and names become our contract; conflicts with ADR-016's framework-free markup contract and ADR-011's protocol-neutral package; heavy for embedded products | Rejected for now, as in ADR-011; individual behaviours (focus trap, positioning) may be borrowed as internal dependencies |
| **Configuration-driven screens (JSON describes a list or form; the SDK renders it)** | Very fast for simple CRUD; easy for agents to emit | Breaks as soon as a screen differs from the schema; becomes a page builder (a PRD non-goal); domain logic leaks into the SDK | Rejected |
| **A separate package `@ux-builder/patterns`** | Independent release cadence | Version skew with `@ux-builder/ui` widgets it composes; two installs for every app | Rejected for now; split if the patterns' release cadence diverges |
| **Patterns layer inside `@ux-builder/ui`, slot-based, admitted by evidence (selected)** | One install; widgets and patterns always match; apps keep control of data and domain; consistent states and responsiveness everywhere | A larger package to own; accessibility of complex patterns is real work; scope must be held by the admission rule | **Selected**: the smallest change that gives apps screen-level consistency without becoming a page builder |

## Consequences

| Type | Impact |
|------|--------|
| Positive | Apps and agents compose screens from named, tested patterns; empty/error/loading states and responsive behaviour are consistent across products; the billing-review app can drop its private table and navigation layer; the audit can check patterns once rather than every app's screens. |
| Negative | The package grows by roughly 30 exported parts; dialogs, menus, comboboxes and grids carry real keyboard and focus logic that must be tested; patterns become a public interface under semver, so slot names must be chosen carefully before 1.0 of the entry point. |
| Neutral | Widgets stay as they are; patterns depend on them, never the reverse. Themes are unaffected: patterns read the same role tokens. |

## Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Scope grows into a general design system nobody can own (ADR-011's risk) | M | M | Admission rule above; P1/P2 wait for consumer evidence; inventory is the ceiling until revised |
| Patterns too rigid, so apps fork them | M | H | Slots for every content area; layout primitives exported so apps can build the rare custom screen from the same parts |
| Accessibility regressions in complex widgets | M | H | APG keyboard tests per pattern in `packages/ui/test`; audit run per pattern story |
| Embedded products need patterns that work inside a narrow iframe | H | M | ADR-021: patterns adapt to their container, not the screen |
| The P0 need is assumed, not evidenced, for some patterns | M | L | Provisional: P0 membership comes from the inventory and ADR-011's billing-review app evidence; confirm with that app and the harness port before building P0 items beyond the shell, collection list, form and record detail |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| The billing-review app and one starter-built app use the shell, collection list and form patterns with no copied layout CSS | A consumer forks or copies a pattern's CSS to get the behaviour it needs |
| Every pattern story passes the audit in every theme × appearance × size class | A pattern needs per-theme code |
| Agents using `@ux-builder/mcp` build a list + detail + form screen from patterns alone | Agents routinely hand-build layouts the patterns should cover |

## Supersession

- **Supersedes**: None
- **Superseded by**: None
- **Amended on acceptance** (PRD evolve pass, 2026-10-18): the PRD non-goal on component coverage (patterns
  are admitted by the rule above, not by matching another catalogue) and the
  note in ADR-011's Consequences that "the package supplies widgets, not
  views" (the package supplies widgets and screen patterns; products still
  own their views' content, data and domain logic). Both through an evolve
  pass; ADR-011 is not edited.

## Concern Impact

- **Concern selection**: none changed.
- **Practice override**: none. Extends `a11y-wcag-aa` (`docs/helix/01-frame/concerns.md`):
  keyboard and screen-reader behaviour, already owned by the widgets, is owned
  by each pattern too.

## References

- `docs/helix/00-discover/screen-pattern-inventory.md` — the inventory, P0 set and best-practice sources
- `docs/helix/01-frame/prd.md` — Non-Goals; FR-17, FR-21
- ADR-011 — widget layer and admission rule; ADR-016 — React + framework-free CSS
- ADR-021 — responsive layout model; ADR-022 — variants per design system
- FEAT-006 — screen patterns feature specification
- W3C WAI-ARIA Authoring Practices Guide; W3C WCAG 2.2

## Review Checklist

- [x] Context names a specific problem
- [x] Decision statement is actionable
- [x] At least two alternatives were evaluated
- [x] Each alternative has concrete pros and cons
- [x] Selected option's rationale explains why it wins over the best alternative
- [x] Consequences include both positive and negative impacts
- [x] Negative consequences have documented mitigations
- [x] Risks are specific with probability and impact assessments
- [x] Validation section defines how we'll know if the decision was right
- [x] Review triggers define conditions for reconsidering the decision
- [x] Concern impact section is complete
- [x] ADR is consistent with governing feature spec and PRD requirements — the PRD evolve pass of 2026-10-18 reworded the non-goal and added FR-25 to FR-27
