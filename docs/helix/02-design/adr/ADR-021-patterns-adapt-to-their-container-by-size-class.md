---
ddx:
  id: ADR-021
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: ADR-020
    - kind: informed_by
      to: ADR-012
    - kind: informed_by
      to: ADR-013
    - kind: informed_by
      to: CONTRACT-001
    - kind: informed_by
      to: screen-pattern-inventory
    - kind: informs
      to: FEAT-004
    - kind: informs
      to: FEAT-006
    - kind: informs
      to: ADR-022
---

# ADR-021: Patterns adapt to their container by size class; layout measures are tokens

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-18 | **Accepted** 2026-10-18 | Operator; harness team as owner | ADR-020, ADR-012, ADR-013, CONTRACT-001, `00-discover/screen-pattern-inventory.md` §6 | Medium |

## Context

| Aspect | Description |
|--------|-------------|
| Problem | ADR-020's patterns must work from wide desktops to smartphones. The same pattern also runs at widths unrelated to the screen: an embedded product's view is an iframe sized by the harness (ADR-012), and a list may sit in a side pane. The SDK has no responsive model, no breakpoints and no layout tokens. |
| Current State | `ui.css` has one media query (`prefers-reduced-motion`). Tokens cover colour, type, space, radius and widget metrics; nothing for widths, gutters, content max-widths or touch-target size. |
| Requirements | Operator request 2026-10-18: "support full desktop and smartphone resolutions", based on best practices. WCAG 2.2 AA: reflow at 320 CSS px (1.4.10), target size ≥ 24 px (2.5.8), orientation (1.3.4), focus not obscured by sticky UI (2.4.11). |
| Decision Drivers | Patterns must adapt correctly inside embeds and panes, not only on full screens; design systems differ in density (ADR-013) and must be able to differ in layout measures without app code; touch and mouse need different target sizes regardless of width. CSS custom properties cannot be used in media or container query conditions, so a breakpoint cannot vary by theme at run time. |

## Decision

We will make every pattern **adapt to the width of its container** using CSS
container queries, against **five size classes** taken from Material Design
3's window size classes. The boundaries are **fixed SDK constants**; the
layout measures are **design-system tokens**:

| Class | Width (CSS px) |
|---|---|
| compact | < 600 |
| medium | 600–839 |
| expanded | 840–1199 |
| large | 1200–1599 |
| extra-large | ≥ 1600 |

- **Patterns** declare `container-type: inline-size` on their root and switch
  layout with `@container` queries at the size-class boundaries.
- **The app shell alone** uses viewport media queries, because navigation
  placement (bottom bar, rail, side nav) depends on the window.
- **Input type** is separate from width: `@media (pointer: coarse)` raises
  targets to the touch-target token (44 px); `@media (hover: none)` removes
  hover-only affordances.
- **Boundaries are constants**, written into `ui.css`'s queries and published
  as read-only tokens so scripts, the catalogue and the audit use the same
  values. No design system or theme sets them.
- **Layout measures are tokens** (named under CONTRACT-001's rules in a
  revision of that contract): page gutter per class, content max-widths
  (reading, form, page) and the touch-target minimum. Values default per
  design system and are not brand-specific.

> Corrected 2026-10-18, before PR 50 merged: the first draft made the
> boundaries per-design-system tokens. CSS does not allow `var()` in a
> `@media` or `@container` condition, so they are constants; the measures
> used inside the queries remain tokens.
- No user-agent or device detection.
- Full-height layouts use `dvh` and respect `env(safe-area-inset-*)`; layout
  CSS uses logical properties (`inline-start`, not `left`).

The adaptation of each pattern per class is specified in the inventory §6.3
and becomes acceptance criteria in each pattern's story.

**Key Points**: Container, not viewport | Five M3 size classes, fixed | Layout measures are tokens | Touch is an input query, not a width

## Alternatives

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| **Viewport media queries everywhere** | Familiar; simplest CSS | A pattern in a 480 px iframe or side pane on a wide screen gets the desktop layout; embedded views (ADR-012) break | Rejected |
| **Carbon's breakpoints (320/672/1056/1312/1584)** | Already one of our themed design systems | Tied to Carbon's 16-column grid; would favour one design system over the others ADR-013 treats equally | Rejected: boundaries cannot vary per design system (see the correction above), and one set must serve all |
| **Fluid layouts only, no breakpoints (intrinsic CSS: `auto-fit`, `clamp`)** | No thresholds to maintain | Cannot express structural changes such as table → cards or two panes → one pane with Back | Rejected as the only tool; used inside patterns where it suffices |
| **JavaScript measuring (ResizeObserver) to switch layouts** | Works anywhere | Layout depends on script; flashes on first render; ADR-016 keeps styling in CSS | Rejected; allowed only where behaviour must change (e.g. focus management when a pane collapses) |
| **Container queries + M3 size classes as tokens (selected)** | Correct inside embeds and panes; device-agnostic published classes; layout measures adjustable per design system | Two mechanisms (container for patterns, viewport for the shell); container queries need a sized ancestor | **Selected**: the only option that behaves correctly in the harness's iframes without app code |

## Consequences

| Type | Impact |
|------|--------|
| Positive | A pattern behaves the same in a phone, a narrow embed or a side pane; design systems can tune layout without changing `ui.css`; touch targets are right on touch devices at every width. |
| Negative | Token contract grows (CONTRACT-001 revision); `container-type` on pattern roots creates containment that can affect intrinsic sizing, so each pattern must be tested at each class; the audit must add viewport sizes. |
| Neutral | Existing widgets keep their current CSS; they gain container behaviour only where a pattern needs it. |

## Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Containment changes intrinsic sizing (e.g. a pattern collapses to zero width in a flex parent) | M | M | Patterns set an explicit inline size behaviour; a story per class catches it |
| Fixed size-class boundaries do not suit a design system | L | L | Gutters, content widths and target sizes are per-design-system tokens; boundaries change only by an SDK release, for every design system at once |
| Audit coverage multiplies (themes × appearances × classes) | H | M | Audit one representative width per class (e.g. 360, 720, 1024, 1366, 1920) and only on pattern stories |
| Browsers without container query support | L | L | Supported by all evergreen browsers since 2023; the compact layout is the unqueried default, so unsupported browsers get a usable single-column layout |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| Every pattern story passes the audit at one width per size class with no horizontal page scroll at 320 px | A pattern needs a viewport query or script to lay out correctly |
| An embedded product's view in a harness iframe shows the compact/medium layout without product code | An embed needs app-side overrides for its width |

## Supersession

- **Supersedes**: None
- **Superseded by**: None

## Concern Impact

- **Concern selection**: none changed.
- **Practice override**: none. Adds responsive and target-size requirements
  that `a11y-wcag-aa` (`docs/helix/01-frame/concerns.md`) already implies.

## References

- `docs/helix/00-discover/screen-pattern-inventory.md` §6 — requirements, size classes, per-pattern adaptation
- ADR-020 — the patterns layer; ADR-012 — embedded views in harness iframes; ADR-013 — design systems own density
- CONTRACT-001 — token names
- Material Design 3, window size classes; W3C WCAG 2.2 (1.3.4, 1.4.10, 2.4.11, 2.5.8); CSS Containment Module Level 3

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
