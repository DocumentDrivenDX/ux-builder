---
ddx:
  id: CONTRACT-002
  type: contract
  status: draft
  links:
    - kind: informed_by
      to: ADR-018
    - kind: informed_by
      to: FEAT-001
    - kind: informed_by
      to: ADR-013
    - kind: informed_by
      to: ADR-017
    - kind: informed_by
      to: CONTRACT-001
    - kind: informed_by
      to: ADR-022
    - kind: informs
      to: FEAT-006
---

# Contract

**Contract ID**: CONTRACT-002 — Brand and design system files
**Type**: schema
**Version**: v1
**Status**: accepted — v1 accepted by the operator 2026-10-06, including the `color.on-accent` addition (bead `ux-builder-739039c8`); the Amendment below (theme files, ADR-018) accepted by the operator 2026-10-06 (bead `ux-builder-22865f72`). Sections it changes are marked *[Amended — ADR-018]*. A second amendment (pattern variants, ADR-022; 2026-10-18) is marked *[Amended 2026-10-18 — ADR-022]*; shipped in `@ux-builder/tokens` 1.5.0.
**Related**: ADR-018 (themes are what apps select), ADR-013 (theme = brand × design system), ADR-017 (brand fonts), CONTRACT-001 (token names), FEAT-001 (THEME-01 to THEME-08), FEAT-002 (generation settings), FEAT-003 (the brand builder writes brand files)

## Purpose

Defines the two files every theme is composed from (ADR-013): a **brand
file** (identity: palette per appearance, artwork, optional fonts, generation
settings) and a **design system file** (anatomy: type, shape, elevation,
space, widget metrics, default fonts). The composer (bead 0.4), the palette
engine (FEAT-002) and the brand builder (FEAT-003) read and write these
files and nothing else.

Machine-readable schemas:

| File | Schema |
|------|--------|
| `*.brand.json` | `tokens/schema/brand.schema.json` |
| `*.design-system.json` | `tokens/schema/design-system.schema.json` |
| Font declaration (used by both) | `tokens/schema/font.schema.json` |

`npm run schemas` (`tools/validate-schemas.mjs`) validates the schemas, the
examples in `tokens/schema/examples/`, and the rules below; `npm run check`
runs it.

## Scope and Boundaries

- In scope: the shape of both files, the font declaration, how a brand and a
  design system compose into a theme, and the build errors that enforce it.
- Out of scope: how an app selects a theme (data attributes, theme
  identifiers) — a follow-up contract with bead 0.4; the palette engine's
  setting names and ranges (SD-001, FEAT-002); token names (CONTRACT-001).
- Owning system or team: `@ux-builder/tokens` (this repository).

## Normative Surface

Token values follow the W3C Design Tokens Format (DTCG): a token is an object
with `$value` and optional `$description` and `$type`; a reference is
`{path}` with a CONTRACT-001 path, e.g. `{color.accent}`.

### Brand file

| Element | Type / Shape | Required | Rules | Notes |
|---------|---------------|----------|-------|-------|
| `name` | string | yes | MUST match `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, ≤ 40 chars, unique among brands | Used in theme identifiers |
| `title` | string | yes | Human-readable name | Shown in the gallery and builder |
| `appearances` | object with `light` and/or `dark` | yes | At least one. A theme is built only for the appearances the brand defines. | |
| `appearances.<ap>.color` | group of colour tokens | yes | MUST set `ground`, `surface`, `surface-sunken`, `text-strong`, `text`, `text-muted`, `text-subtle`, `structure`, `accent`, `on-accent`, `border`; MAY set `ground-recessed`. Values MUST be `#rgb` or `#rrggbb`. No other keys. | `on-accent` is new, see below |
| `appearances.<ap>.state` | group of colour tokens | yes | MUST set `live`, `limited`, `purchasing`, `evaluation`, `closed`; hex only | |
| `appearances.<ap>.brand` | group | yes | MUST set `logo-paint` (hex). MAY set `logo-image`, `mark-image`, `favicon` as paths (`.svg`, `.png`, `.webp`) relative to the brand file, and `logo-bg`, `logo-mask`, `mark-bg`, `mark-mask`, `logo-aspect`, `logo-height`, `logo-height-sm`. | Harness only (CONTRACT-001 brand tier) |
| `fonts` | object | no | MAY override `display`, `heading`, `body`, `mono`, each a font declaration. A role left out comes from the design system. | ADR-017 |
| `generation` | object | no | Present when the palette engine produced the palette: `engine` (semver), `strategy`, `settings` (name → number, string or boolean), optional `logo` (`path`, `sha256`) and `extracted` (hex list). | FEAT-002 FR-12 |

A brand file MUST NOT contain any other key: no shapes, sizes, spacing or
widget tokens (ADR-013).

### Design system file

| Element | Type / Shape | Required | Rules | Notes |
|---------|---------------|----------|-------|-------|
| `name` | string | yes | Same pattern as a brand name; unique among design systems | |
| `title` | string | yes | | |
| `source` | object | yes | `system` required; `version` and `url` (https) optional | Provenance, e.g. Carbon v11 |
| `fonts` | object | yes | MUST declare `display`, `heading`, `body`, `mono` | The defaults a brand may override |
| `tokens` | groups | yes | Group names MUST be role categories `font-size`, `font-weight`, `line-height`, `letter-spacing`, `space`, `size`, `radius`, `border`, `shadow`, `focus`, `state-layer`, or components `button`, `pill`, `badge`, `field`, `check`, `switch`, `menu`, `choice-picker`, `card`, `notice`, `toast`, `progress`, `spinner`, `skeleton` (added 2026-10-08, US-021), `table`, `icon`, `nav`, `tabs`, `page-header` (added 2026-10-18, ADR-022). MUST NOT contain `color`, `state`, `brand`, `font` or `palette`, nor any `size.breakpoint-*` token *[Amended 2026-10-18]*. | Token names per CONTRACT-001 |
| `variants` *[Amended 2026-10-18 — ADR-022]* | object: variant point → variant name | no | Each key MUST be a variant point defined under *Variants* below; each value MUST be one of that point's variants. A point not named takes its default. | e.g. `{ "navigation": "rail", "tabs": "underlined" }`; cite the system's guidance in the file's `$description` |
| `appearances.<ap>` | groups | no | Per-appearance overrides of `tokens`, same group rules | e.g. Fluent's stronger dark shadows |
| Any `$value` | string or number | — | MUST NOT contain a literal hex colour. A colour MUST be a reference to a role (`{color.*}`, `{state.*}`), `transparent`, or a `color-mix()` of references. `rgba()` is allowed only in shadows. | Keeps brand colour out of anatomy |
| Any reference | `{path}` | — | MUST name a brand role (`color.*`, `state.*`), a font role (`font.*`), or a token of the same design system | Checked by `npm run schemas` |

### Theme file *[Amended — ADR-018]*

A theme is one brand plus an anatomy. Files live at
`tokens/themes/<name>.theme.json`, schema `tokens/schema/theme.schema.json`.

| Element | Type / Shape | Required | Rules | Notes |
|---------|---------------|----------|-------|-------|
| `name` | string | yes | Same pattern as a brand name; unique among themes; MUST equal the file name | The `data-theme` value (CONTRACT-003) |
| `title` | string | yes | | Shown in the gallery, Storybook and builder |
| `brand` | brand `name` | yes | MUST name an existing brand | |
| `designSystem` | shared design system `name` | exactly one of `designSystem`, `anatomy` | MUST name an existing shared design system | e.g. `praxis-carbon` → `carbon` |
| `anatomy` | object | exactly one of `designSystem`, `anatomy` | The same shape and rules as a design system file's `source`, `fonts`, `tokens`, `appearances` and, since 2026-10-18, `variants` (no literal colours; references as for a design system) | The theme's own anatomy, e.g. `praxis`, `plain`, `synaptiq` |
| `default` | `light` \| `dark` | no | MUST be an appearance the brand defines | The appearance used when `data-appearance` is absent; if omitted, `dark` when the brand has it, else `light` |

**Shared design systems** are only `material`, `fluent` and `carbon`. Praxis
and Plain are themes with their own anatomy; their brands stay brands.

**Composition** (below) applies unchanged with *S* = the named shared design
system or the theme's `anatomy`. A theme is built for every appearance its
brand defines.

### Font declaration

| Element | Type / Shape | Required | Rules |
|---------|---------------|----------|-------|
| `family` | string | yes | The CSS family name |
| `fallback` | string[] | yes | At least one; SHOULD end in a generic family |
| `source` | `bundled` \| `google` \| `client-hosted` \| `system` | yes | ADR-017 |
| `license` | `OFL-1.1` \| `Apache-2.0` | if `source` is `bundled` | Only these licences may ship in an SDK package |
| `url` | https URL | if `source` is `client-hosted` | The stylesheet declaring the font |
| `weights` | integers 100–900, multiples of 100 | no | Weights to load |

### Variants *[Amended 2026-10-18 — ADR-022]*

A **variant point** is defined by one file,
`tokens/variants/<point>.variants.json`, schema
`tokens/schema/variants.schema.json`. The file belongs to the pattern that
reads the point; the token build reads it.

| Element | Type / Shape | Required | Rules | Notes |
|---------|---------------|----------|-------|-------|
| `point` | string | yes | Kebab-case; MUST equal the file name's `<point>` | |
| `title` | string | yes | | Shown in the catalogue and builder |
| `default` | variant name | yes | MUST name one of `variants` | Also the `ui.css` fallback values |
| `variants` | object: name → variant | yes | 2 or 3 entries; names kebab-case | ADR-022 rule 4 |
| `variants.<name>.title` | string | yes | | |
| `variants.<name>.tokens` | groups | yes | MUST contain only CONTRACT-001 component tokens whose "Variant point" is this point; every variant of a point MUST set the same set of tokens; values follow the design system file's rules (no literal colour) | Token values only (ADR-022 rule 1) |

Initial variant points:

| Point | Variants (default first) | Tokens |
|-------|--------------------------|--------|
| `navigation` | `side-menu`, `rail` | `nav.*` |
| `tabs` | `underlined`, `enclosed` | `tabs.*` |
| `page-header` | `large`, `compact` | `page-header.*` |
| `table` | `ruled`, `banded` | `table.row-stripe-bg`, `table.row-border` |

A brand file MUST NOT contain `variants` (brands are identity only, ADR-013).

### Composition

A theme for brand *B*, design system *S* and appearance *A* is built in this
order; a later step overrides an earlier one for the same token:

0. For each variant point, the `tokens` of the variant *S*.`variants` names,
   else of the point's default *[Amended 2026-10-18 — ADR-022]*; then the
   `size.breakpoint-*` constants (CONTRACT-001)
1. *S*.`tokens` (so a design system can fine-tune one token of its variant)
2. *S*.`appearances`.*A*
3. Font roles `font.display|heading|body|mono` from *B*.`fonts`, else
   *S*.`fonts`, rendered as `family, fallback…`
4. *B*.`appearances`.*A* (`color`, `state`, `brand`)
5. Derived: if *B* sets no `color.ground-recessed`, it equals `color.ground`

References resolve after step 5. A theme is built only if *B* defines *A*.

### Addition to CONTRACT-001: `color.on-accent`

One role is added to the accepted name map: **`color.on-accent`** (CSS
`--piq-color-on-accent`), the colour of text and counts drawn on the accent.
Today it exists only as the literal value of `--badge-fg` (`#1F1E1D` in
Praxis dark, `#FFFFFF` in the light themes), which a design system may not
hold. Design systems set `badge.fg` to `{color.on-accent}`. No current name
changes; `--badge-fg` still maps to `badge.fg`.

## Precedence and Compatibility

- Versioning: each file names its schema in `$schema`. Adding an optional
  field is a minor change to the schema; adding a required field or removing
  one is a major change.
- Ordering or precedence: as in Composition, above.
- Backward-compatibility rules: brand files written by a minor schema
  version MUST validate against later minor versions of the same major.
- Deprecation rules: a field is deprecated for one major version before
  removal, and the validator warns on it.

## Error Semantics

| Condition | Error / Outcome | Retry | Recovery Expectation |
|-----------|------------------|-------|----------------------|
| A file fails its schema | Build fails, listing each path and message | no | Fix the file |
| A design system holds a literal hex colour | Build fails at that token | no | Refer to a role |
| A reference names nothing a brand, a font role or the design system defines | Build fails listing the reference | no | Fix the reference or add the role by contract change |
| A brand's artwork path does not exist | Build fails naming the path | no | Add the file or fix the path |
| A `bundled` font has no `license`, or one not allowed | Build fails | no | Use `google`, `client-hosted` or `system`, or an allowed licence |
| Two brands, or two design systems, share a `name` | Build fails | no | Rename one |
| *[Amended — ADR-018]* A theme names a missing brand or shared design system, has both or neither of `designSystem` and `anatomy`, or a `default` its brand lacks | Build fails naming the theme | no | Fix the theme file |
| A composed theme fails the contrast gate | Build fails (FEAT-001 THEME-08) | no | Change the brand's colours |
| *[Amended 2026-10-18]* A design system or anatomy names an unknown variant point or variant | Build fails naming the file, point and value | no | Use a defined point and variant |
| *[Amended 2026-10-18]* A variants file's variants set different tokens, set a token of another point, have fewer than 2 or more than 3 entries, or a `default` not among them | Build fails naming the file | no | Fix the variants file |
| *[Amended 2026-10-18]* A brand file contains `variants`, or any file sets a `size.breakpoint-*` token | Build fails naming the file | no | Remove it |

## Examples

The real files are full, valid examples: `tokens/brands/*.brand.json` (Praxis,
Plain, Synaptiq, Databricks), `tokens/design-systems/*.design-system.json`
(Material, Fluent, Carbon) and `tokens/themes/*.theme.json` (the 0.x
themes, Synaptiq and others) *[Amended — ADR-018]*.
`tokens/schema/examples/acme.brand.json` is an invented light-only brand with a
font override and generation settings, exercising the optional parts.

```json
{
  "$schema": "../brand.schema.json",
  "name": "acme",
  "title": "Acme Legal",
  "appearances": {
    "light": {
      "color": { "accent": { "$value": "#B4442C" }, "on-accent": { "$value": "#FFFFFF" }, "…": {} },
      "state": { "live": { "$value": "#2F6B45" }, "…": {} },
      "brand": { "logo-paint": { "$value": "#1F3A5F" } }
    }
  },
  "fonts": { "body": { "family": "Inter", "fallback": ["system-ui", "sans-serif"], "source": "google" } },
  "generation": { "engine": "0.1.0", "extracted": ["#B4442C", "#1F3A5F"], "strategy": "muted", "settings": { "hueShift": -6, "chromaScale": 0.8 } }
}
```

## Non-Normative Notes

- Files live at `tokens/brands/<name>.brand.json` and
  `tokens/design-systems/<name>.design-system.json`; artwork lives under
  `brand/`, referred to relatively from each brand file.
- Files live at `tokens/themes/<name>.theme.json` too *[Amended — ADR-018]*.
  How apps select a theme is CONTRACT-003.
- The design system's `fonts` replace the font-family tokens of today's
  `type` group; the composer emits `font.*` roles from them.
- *[Amended 2026-10-18]* Proposed initial variant choices, each to be confirmed
  against the system's own documentation when its file is updated (US-030):
  Material — `navigation: rail`, `tabs: underlined`; Carbon — `navigation:
  side-menu`, `tabs: underlined` (Carbon's line tabs; its contained tabs map
  to `enclosed`), `table: ruled`; Fluent — `navigation: side-menu`,
  `tabs: underlined`. Points not listed take the default until a source is
  cited.

## Validation Checklist

- [x] Normative fields and rules are explicit.
- [x] Compatibility and precedence rules are explicit.
- [x] Error handling is explicit.
- [x] At least one executable test can be derived from this contract (`npm run schemas`: examples validate, five forbidden cases rejected).
- [x] Non-normative notes cannot be mistaken for contract requirements.
- [x] Operator review, including the `color.on-accent` addition to CONTRACT-001 (accepted 2026-10-06).
- [x] Operator review of the Amendment (theme files; shared design systems material, fluent, carbon and, since, databricks) — ADR-018, accepted 2026-10-06.
- [x] `npm run schemas` rejects a theme with both or neither of `designSystem` and `anatomy`, and a literal colour in a theme's anatomy.
- [x] *[Amended 2026-10-18]* `npm run schemas` validates `tokens/layout.json` and `tokens/variants/*.variants.json`; the composer rejects the variant errors above (`tools/__tests__/variants.test.mjs`).
