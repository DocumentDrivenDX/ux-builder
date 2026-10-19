---
ddx:
  id: ADR-022
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: ADR-011
    - kind: informed_by
      to: ADR-013
    - kind: informed_by
      to: ADR-016
    - kind: informed_by
      to: ADR-020
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: CONTRACT-002
    - kind: informed_by
      to: CONTRACT-003
    - kind: informs
      to: FEAT-006
---

# ADR-022: Pattern variants are named token bundles, chosen by the design system

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-18 | **Accepted** 2026-10-18 | Operator; harness team as owner | ADR-011, ADR-013, ADR-016, ADR-020, ADR-021, CONTRACT-002, CONTRACT-003, FEAT-006 | Medium |

## Context

| Aspect | Description |
|--------|-------------|
| Problem | ADR-020's patterns share one structure across design systems, but Material, Carbon and Fluent have codified conventions that differ beyond what today's tokens express: an icon rail or a labelled side menu, underlined or enclosed tabs, a large or compact page header, ruled or banded tables. Without a model for these differences, either every design system gets the same conventions (losing what makes it that system) or each gets its own implementation (four times the code and testing, and screens that rearrange when the theme changes). |
| Current State | A design system is anatomy only (ADR-013, PRD FR-2): token groups in `tokens/design-systems/*.design-system.json` (CONTRACT-002), with per-widget groups such as `table`, `menu` and `field`. Every design system renders the same markup. The build emits each theme as custom properties under `[data-theme="T"]` (CONTRACT-003). A theme inside another theme must never show the outer theme's values; CONTRACT-003 resets unset tokens to `initial` for exactly this reason (US-022). No component reads the theme (ADR-011). |
| Requirements | Operator request 2026-10-18: patterns should apply each design system's codified best practices. Theme and appearance switch at run time (US-011). Apps select themes either with `ThemeProvider` or with `data-theme` on `<html>` (CONTRACT-003), so a mechanism that needs the provider fails for half the apps. |
| Decision Drivers | (1) Nested themes: only inherited custom properties resolve to the nearest theme; selector-based rules such as `[data-theme="T"] .piq-tabs` match every descendant, including an inner theme's. (2) No runtime: variants must work with plain `data-theme`. (3) Theme switching must not move content a user relies on. (4) The set of variants must stay small enough to test in every theme × appearance × size class. |

## Decision

We will model a design system's conventions as **variants**: at a fixed set of
**variant points** a pattern defines (for example `navigation`, `tabs`,
`page-header`, `table`), a **variant** is a named bundle of token values. The
design system file names one variant per variant point; the token build
expands that name into the bundle's token values for every theme on that
design system. Patterns implement all of their variants **with one markup and
CSS that reads those tokens**.

Rules:

1. **A variant is token values only.** Every difference between variants of a
   point must be expressible through custom properties the pattern's CSS reads
   (sizes, borders, backgrounds, `display`, `grid-template-areas`,
   `flex-direction`, visibility of labels). A difference that needs different
   markup or behaviour is not a variant; it is a different pattern and goes
   through ADR-020's admission rule.
2. **Look, not content or order.** A variant may change how a pattern looks.
   It may not add or remove information or actions, and visual order must
   follow DOM order (WCAG 1.3.2, 2.4.3). Switching theme therefore never moves
   or hides what a user relies on.
3. **Owned by the pattern, chosen by the design system.** Each pattern
   defines its variant points, the variants at each point, the tokens each
   variant sets, and a default. A shared design system or a theme's own
   `anatomy` names a variant per point, with the source it follows (as token
   `$description`s already cite their source). A brand cannot choose variants:
   brands are identity only (ADR-013).
4. **Small set.** A variant point is added only when at least two design
   systems the SDK themes follow different documented conventions there. Each
   point has at most three variants.
5. **Defaults.** A design system that names no variant at a point gets the
   pattern's default. Existing design systems and themes keep building
   unchanged.

The design system file gains an optional `variants` member (a CONTRACT-002
revision); the variant tokens are new CONTRACT-001 names. Both contracts carry
the exact surface; this ADR fixes the model.

**Key Points**: One markup, token-driven variants | Design system chooses, brand cannot | Look changes, content and order do not | Works with plain `data-theme` and nested themes

## Alternatives

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| **No variants: one convention for every design system** | Smallest surface; nothing new to test | Carbon, Material and Fluent themes look like one system with different colours; contradicts the operator's request | Rejected |
| **Separate pattern implementations per design system** | Each system matched exactly | Four implementations to build and keep accessible; switching theme rearranges screens; apps' tests change with the theme | Rejected (ADR-020 already rejects per-system screens) |
| **`ThemeProvider` sets `data-*` attributes from the theme's variants; CSS selects on them** | Arbitrary CSS per variant | Fails for apps using `data-theme` on `<html>` without the provider (CONTRACT-003 allows both); makes the provider read theme data, against ADR-011's "no component reads the theme" | Rejected |
| **Build nests per-theme variant CSS under `[data-theme="T"]`** | No runtime; arbitrary CSS per variant | Descendant selectors leak into nested themes (the failure US-022 fixed for tokens); fixing it needs `@scope` with a lower boundary, which not every supported browser ships | Rejected |
| **CSS container style queries on a variant custom property** | Arbitrary CSS per variant; nearest-theme resolution | Not supported in every browser the SDK supports at the time of writing | Rejected for now; revisit when supported everywhere, as it would lift rule 1 |
| **Brand-selectable variants** | Brand owners pick conventions in the builder | Mixes anatomy into identity, against ADR-013; multiplies combinations to contrast-check and audit | Rejected |
| **Named token bundles chosen by the design system (selected)** | Uses the existing token pipeline; resolves to the nearest theme; no runtime; switching theme is safe; the variant set is enumerable for the catalogue, builder and audit | Limits variants to what tokens can express; some conventions cannot be matched exactly | **Selected**: the only option that works with plain `data-theme`, nested themes and run-time switching without new runtime code |

## Consequences

| Type | Impact |
|------|--------|
| Positive | Each design system keeps its recognisable conventions on shared, tested markup; variants appear in `catalogue.json` and through `@ux-builder/mcp`; the builder can label and preview a design system's variants; nested themes stay correct by construction. |
| Negative | Pattern CSS is written against variant tokens, which is harder to author than plain CSS; some documented conventions (those needing different markup) are not matched; CONTRACT-001 and CONTRACT-002 grow; every variant multiplies audit coverage. |
| Neutral | Density, type scale, radius and elevation stay ordinary design-system tokens, not variants. A future design system adds variant names, not code. |

## Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| A convention a stakeholder expects cannot be expressed in tokens | M | M | Record it as a known difference in the design system file's description; if two consumers need it, propose a separate pattern under ADR-020 |
| Variant tokens make pattern CSS hard to maintain | M | M | At most three variants per point; one story per variant; the lint rule already rejects hard-coded values |
| Variant points multiply over time | M | M | Rule 4: a point needs two design systems with documented, differing conventions; the inventory and FEAT-006 list the initial points |
| A variant changes perceived order through grid areas | L | H | Rule 2; audit checks that tab order follows visual order in every variant |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| Each shared design system's theme is recognisable on the P0 screens (operator review of the builder previews) | Reviewers cannot tell Carbon, Material and Fluent apart on the same screen |
| Every variant story passes the audit in every theme × appearance × size class, and inside a nested theme | A variant needs per-theme selectors or runtime code to render |
| No variant point has more than three variants after the P0 set ships | A fourth variant is requested for a point |

## Supersession

- **Supersedes**: None
- **Superseded by**: None

## Concern Impact

- **Concern selection**: none changed.
- **Practice override**: none. Rule 2 applies `a11y-wcag-aa`
  (`docs/helix/01-frame/concerns.md`) to variants: meaningful sequence and
  focus order hold in every variant.

## References

- ADR-013 — a theme is a brand applied to a design system; ADR-011 — no component reads the theme
- ADR-020 — patterns layer; ADR-021 — container-based responsiveness
- CONTRACT-002 — design system and theme files; CONTRACT-003 — attributes, emitted CSS, nested-theme reset
- `docs/helix/00-discover/screen-pattern-inventory.md` — candidate variant points
- W3C WCAG 2.2 (1.3.2 Meaningful Sequence, 2.4.3 Focus Order)

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
- [x] ADR is consistent with governing feature spec and PRD requirements
