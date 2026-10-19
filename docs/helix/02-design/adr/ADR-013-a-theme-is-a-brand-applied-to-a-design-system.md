---
ddx:
  id: ADR-013
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: ADR-011
    - kind: informs
      to: FEAT-001
---

# ADR-013: A theme is a brand applied to a design system

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-05 | Accepted | Operator | FEAT-001 (FR-1–FR-7), FEAT-002, FEAT-003, ADR-011 | High |

## Context

| Aspect | Description |
|--------|-------------|
| Problem | A client brand must be shown in several design systems (Praxis, Material 3, Fluent 2, Carbon), and the brand builder must preview any brand in any of them. Today each theme is a hand-made pairing of one brand and one system. |
| Current State | Five themes. `praxis`, `plain` are token files ported from the platform. `praxis-material`, `praxis-fluentui`, `praxis-carbon` come from three generators (`tools/gen-praxis-*.mjs`), each copying Praxis's colours and adding one system's type, shape and widget tokens. |
| Requirements | FR-1–FR-4, FR-7 (PRD); THEME-07: no combination-specific code. |
| Decision Drivers | The number of themes is brands × systems; per-combination generators grow with it. The brand builder needs composition at run time. The three generators already separate colour from anatomy, only by convention. |

## Decision

We will treat a theme as the composition of two independent inputs, and
generate every theme from them:

- **Brand** — identity only: a palette per appearance, logo artwork and mark,
  optional font overrides (ADR-017), and the settings that generated the
  palette (FEAT-002).
- **Design system** — anatomy only: type scale, shape, elevation, density,
  widget tokens and default fonts. It names roles, never brand colours.

One build step composes every brand × design system × appearance, runs the
contrast gate on each, and publishes only combinations that pass. Today's
themes are re-expressed as brands (`praxis`, `plain`) and design
systems (`praxis`, `material`, `fluent`, `carbon`); `praxis-material` becomes
Praxis × Material, with no visible change.

**Key Points**: Brand = identity, design system = anatomy | One composer, no
per-combination code | Every combination contrast-checked | Brands may
override fonts, not shapes

## Alternatives

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| Keep one generator per brand × system | Nothing to refactor; each theme fully hand-tunable | Work grows with brands × systems; the brand builder cannot preview a new brand without new code | Rejected: does not scale past a few brands |
| Brand-only themes, one fixed design system | Simplest; one dimension | Drops the operator's requirement to choose design systems per brand | Rejected: contradicts the PRD |
| Brands may override anything, including shapes | Maximum flexibility | Brand files become design systems; anatomy fidelity to Material/Fluent/Carbon is lost; review of a brand becomes a design review | Rejected: operator limited overrides to fonts (2026-10-05) |
| **Brand × design system composition (chosen)** | Linear growth; previews any pairing; anatomy stays faithful; the existing generators already work this way in spirit | A refactor of the token build; theme names change shape (brand + system) | **Selected**: the only option that makes the brand builder's preview and new client brands cost no code |

## Consequences

| Type | Impact |
|------|--------|
| Positive | A new brand costs one file; every system is available to it. The brand builder previews any pairing. The contrast gate covers every combination automatically. |
| Negative | The token build is restructured; the three `gen-praxis-*` generators are replaced. Theme identifiers change from one name to a brand + system pair, which consumers must learn. |
| Neutral | Widget CSS is unchanged: it already reads tokens only (`@ux-builder/ui`). |

## Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| A brand looks wrong in one system (e.g. a pale accent on Carbon's inverse surfaces) | Medium | Medium | The gate catches unreadable pairings; the brand builder previews each system before saving |
| Existing themes shift during re-expression | Low | High | FEAT-001's THEME-09: resolved-JSON diff must be empty except new aliases |
| Theme naming confuses consumers | Medium | Low | Keep today's names as aliases of their brand × system pairs |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| A new brand renders in all four systems with 0 lines of generator code | A brand needs combination-specific code |
| Existing themes reproduced with an empty diff | Any visible change to an existing theme |

## Supersession

- **Supersedes**: None. Refines ADR-011's token layer, which had one theme
  axis.
- **Superseded by**: None

## Concern Impact

- **Concern selection**: No change.
- **`a11y-wcag-aa`**: the gate runs per combination rather than per theme file.

## References

- PRD — `docs/helix/01-frame/prd.md` (Theme composition)
- FEAT-001 — `docs/helix/01-frame/features/FEAT-001-brand-by-design-system-themes.md`
- `tools/gen-praxis-material.mjs`, `tools/gen-praxis-fluentui.mjs`, `tools/gen-praxis-carbon.mjs`
