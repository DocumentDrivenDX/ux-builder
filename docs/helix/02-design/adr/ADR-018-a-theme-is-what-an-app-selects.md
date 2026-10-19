---
ddx:
  id: ADR-018
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: ADR-013
    - kind: informed_by
      to: CONTRACT-002
    - kind: informed_by
      to: CONTRACT-003
    - kind: informs
      to: FEAT-001
    - kind: informs
      to: FEAT-003
---

# ADR-018: A theme is what an app selects; praxis and plain are themes, not design systems

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-06 | Accepted | Operator | ADR-013, CONTRACT-002, CONTRACT-003, FEAT-001, FEAT-003 | High |

## Context

| Aspect | Description |
|--------|-------------|
| Problem | CONTRACT-003 (accepted 2026-10-06) made apps select a brand and a design system separately (`data-brand`, `data-design-system`) and deprecated `data-theme`. To reproduce the 0.x themes it turned praxis and plain into design systems. The operator clarified on 2026-10-06 that praxis and plain were always meant to be themes, and that the brand builder saves a theme (brand + design system), not a brand. |
| Current State | Two brands; five design systems (praxis, plain, material, fluent, carbon); `tokens/aliases.json` maps the 0.x names to brand × design system pairs; apps would set `data-brand` + `data-design-system` + `data-appearance`. |
| Requirements | Apps and the brand builder speak of themes; the 0.x themes keep exactly their 0.3.0 values (FEAT-001 THEME-09); any brand can still be previewed on any shared design system (FEAT-003). |
| Decision Drivers | A theme is the unit people approve, name and integrate. Praxis and Plain have anatomy nobody else should select as a "design system". Two attributes that must agree are one more thing an app can get wrong. |

## Decision

We will make the **theme** the unit an app selects, with `data-theme="<name>"`
and an optional, resolved `data-appearance` (`light` | `dark`):

- **A theme is one brand plus an anatomy.** The anatomy is either a **shared
  design system** (`material`, `fluent`, `carbon`), named by `designSystem`, or
  the **theme's own**, held inline as `anatomy` (the same fonts, tokens and
  appearances a design system file holds). Theme files live in
  `tokens/themes/<name>.theme.json` (schema `tokens/schema/theme.schema.json`).
- **praxis and plain stop being design systems.** Their anatomy moves
  into their theme files; their brands stay brands. Only material, fluent and
  carbon remain shared design systems.
- **The 0.x names are real themes**, not aliases: `praxis`,
  `plain` (own anatomy) and `praxis-material`, `praxis-fluentui`,
  `praxis-carbon` (the praxis brand on a shared design system).
  `tokens/aliases.json` is removed.
- **`data-theme` is the contract, not deprecated.** This reverses CONTRACT-003's
  decision to deprecate it (see CONTRACT-003, Amendment).
- **Brand × shared design system blocks stay, as a preview surface only**
  (`data-brand`, `data-design-system`): the brand builder and the gallery use
  them to show a candidate brand on Material, Fluent or Carbon before it is a
  theme. Apps do not select them.
- **A new theme, `synaptiq`,** is the Synaptiq brand on its own anatomy,
  reverse-engineered from synaptiq.ai and the Synaptiq Design System.

**Key Points**: Apps select themes | Theme = brand + shared or own anatomy |
Only material, fluent, carbon are shared | data-theme stays | Brand × design
system pairs are previews

## Alternatives

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| Keep CONTRACT-003 as accepted (brand and design system selected separately) | Already built; any pairing at run time | Contradicts the operator's model; "plain design system" is not a thing anyone chooses; two attributes to keep in step | Rejected by the operator's clarification |
| Themes only as brand × shared design system; praxis and plain become a fourth "classic" design system | One shape for every theme | Their anatomies differ in most of the 58 tokens, so it would be separate systems again under another name | Rejected |
| **Theme = brand + shared or own anatomy (chosen)** | Matches how themes are named, reviewed and integrated; one attribute; keeps 0.x values exactly; previews still possible | Two theme shapes; amends two accepted contracts | **Selected** |

## Consequences

| Type | Impact |
|------|--------|
| Positive | One attribute selects a theme; the 0.x names keep working unchanged and are no longer slated for removal; the brand builder saves a theme file; adding a theme is one file. |
| Negative | CONTRACT-002 and CONTRACT-003 are amended after acceptance; the README's 1.x guidance to set `data-brand` + `data-design-system` changes before any release shipped it. |
| Neutral | Token names (CONTRACT-001) and values are unchanged; the resolved file names `resolved/<theme>.<appearance>.json` are unchanged. |

## Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Apps or tools copy the preview attributes and treat them as the contract | Medium | Low | They are documented as a preview surface; the package README and Theme Builder's integration step use `data-theme` only |
| A theme's own anatomy drifts from the shared systems' widget coverage | Medium | Low | Widget tokens fall back in `ui.css`; the contrast gate checks every theme |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| The 0.x themes resolve to their 0.3.0 values (`npm run verify`) | Any change to a 0.x theme's values |
| An app integrates a new theme with one CSS import and one attribute | Integration needs a second attribute |

## Supersession

- **Supersedes**: CONTRACT-003's deprecation of `data-theme` and its requirement
  of `data-brand` + `data-design-system`; ADR-013's separate praxis and plain design systems as
  recorded in FEAT-001 THEME-09. ADR-013's split of brand from anatomy stands.
- **Superseded by**: None

## Concern Impact

- No concern impact.

## References

- CONTRACT-002 — Amendment (theme files)
- CONTRACT-003 — Amendment (theme selection)
- `tokens/themes/*.theme.json`, `tokens/schema/theme.schema.json`
- Synaptiq sources: https://www.synaptiq.ai (HubSpot theme CSS read 2026-10-06), the Synaptiq Design System
