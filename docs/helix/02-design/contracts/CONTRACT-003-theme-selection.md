---
ddx:
  id: CONTRACT-003
  type: contract
  status: draft
  links:
    - kind: informed_by
      to: FEAT-001
    - kind: informed_by
      to: ADR-013
    - kind: informed_by
      to: ADR-018
    - kind: informed_by
      to: CONTRACT-001
    - kind: informed_by
      to: CONTRACT-002
---

# Contract

**Contract ID**: CONTRACT-003 — Theme selection
**Type**: library (HTML attributes, CSS selectors and file names of `@ux-builder/tokens`)
**Version**: v2 (for `@ux-builder/tokens` 1.0.0)
**Status**: accepted — v1 accepted by the operator 2026-10-06 (bead `ux-builder-6594ea5b`); v2, amended by ADR-018, accepted 2026-10-06 (bead `ux-builder-22865f72`). Every section below except Scope is *[Amended — ADR-018]*; the v1 decisions are kept at the end for the record.
**Related**: ADR-018, ADR-013, CONTRACT-001, CONTRACT-002, FEAT-001 (THEME-07, THEME-09), ADR-011 (resolved values for embedded views), CONTRACT-004 (the theme provider, its window event, and the rest of what an app imports)

## Purpose

Defines how an app chooses a theme and an appearance, what CSS and JSON files
`@ux-builder/tokens` emits for them, and the preview surface tools use to show
any brand on any shared design system.

### Decisions *[Amended — ADR-018]*

1. **An app selects a theme.** It sets `data-theme="<name>"` and, optionally,
   `data-appearance` on an element (normally `<html>`). A theme is a brand
   plus a shared design system or its own anatomy (CONTRACT-002, Theme file).
   This reverses v1's deprecation of `data-theme`.
2. **The 0.x names are themes, not aliases.** `praxis`, `plain`
   carry their own anatomy; `praxis-material`, `praxis-fluentui`,
   `praxis-carbon` are the praxis brand on Material, Fluent and Carbon. They
   stay, with no removal planned.
3. **`data-appearance` is optional.** Each theme block is complete for its
   default appearance; the other appearance's block restores anything the
   default's anatomy overrode, so no mismatch is possible.
4. **Brand and design-system blocks are a preview surface.** `data-brand` and
   `data-design-system` stay, for the brand builder and the gallery to show a
   candidate brand on Material, Fluent or Carbon. Apps do not select them and
   they carry no compatibility promise beyond the tooling in this repository.

## Scope and Boundaries

- In scope: selection attributes and their values, emitted CSS selectors and
  specificity, file names, default appearances, the preview surface, errors.
- Out of scope: the token names (CONTRACT-001); the file formats
  (CONTRACT-002); how the harness hands resolved values to an embedded view
  (ADR-011, unchanged); the theme provider component and its `piq:set-theme`
  event (FEAT-004, CONTRACT-004).
- Owning system or team: `@ux-builder/tokens` (this repository).

## Normative Surface *[Amended — ADR-018]*

### Attributes

| Element | Type / Shape | Required | Rules | Notes |
|---------|---------------|----------|-------|-------|
| `data-theme` | theme `name` | yes | MUST name a theme the app has loaded | e.g. `praxis-carbon`, `synaptiq` |
| `data-appearance` | `light` \| `dark` | no | If set, MUST be resolved (never `auto`) and an appearance the theme's brand defines | Absent: the theme's `default` (Praxis themes dark; Plain, Synaptiq light) |
| `data-brand`, `data-design-system` | brand / shared design system `name` | preview only | Used together with `data-appearance` by tools; not for apps | See Preview surface |

### Emitted CSS

| Block | Selector | Specificity | Sets |
|-------|----------|-------------|------|
| Theme, default appearance | `[data-theme="T"]` | 0,1,0 | Every token for T's default appearance: anatomy, its default-appearance overrides, fonts, brand roles |
| Theme, other appearance | `[data-theme="T"][data-appearance="A"]` | 0,2,0 | The anatomy tokens the default's overrides changed (restored, then A's overrides), and the brand roles for A |

| Theme, unset tokens *[Added 2026-10-08, US-022]* | `[data-theme="T"]` | 0,1,0 | `initial` for every CONTRACT-001 token (and its alias) T does not set, so a theme inside another never shows the outer theme's widget tokens or artwork; the widget's `ui.css` fallback applies |

Token names are CONTRACT-001's `--piq-*` names; the 0.x aliases are declared
in the same blocks. No block depends on file load order. A theme MUST NOT
inherit a token from an outer theme: custom properties inherit, so the
starter's `<html data-theme>` showed Databricks's white cards inside a Praxis
dark provider until the reset (found by `@ux-builder/audit`, 2026-10-08).

### Files

| File | Contents |
|------|----------|
| `@ux-builder/tokens/themes/<T>.css` | T's blocks |
| `@ux-builder/tokens/themes.css` | Every theme |
| `@ux-builder/tokens/resolved/<T>.<A>.json` | Every token's final value for one theme and appearance, for embedded views (ADR-011): `{theme, appearance, brand, designSystem, tokens}` |
| `@ux-builder/tokens/manifest.json` | Themes (name, title, brand, design system, default, appearances), brands, shared design systems, preview pairs, every token name (`tokens`) |
| `@ux-builder/tokens/bridges/shadcn/<T>.css` | T mapped onto shadcn/ui's variables, which style AI Elements and assistant-ui's components (ADR-023). A block per appearance under `[data-theme="T"][data-theme][data-appearance="A"]`, the default one also under `[data-theme="T"][data-theme]:not([data-appearance])`, so the blocks outrank a library's `:root` and `.dark` defaults and T's own appearance blocks in any load order. Inside a themed element it gives the 0.x aliases `--accent`, `--border`, `--muted` and `--radius` shadcn's meanings. *[Added — ADR-023]* |

Every theme, in each appearance its brand defines, MUST pass the contrast gate,
and so MUST each of its bridges (the pairings each library draws).

### Preview surface

| File | Selector | Contents |
|------|----------|----------|
| `brands/<B>.css` | `[data-brand="B"][data-appearance="A"]` | B's colour, state and brand roles (and font overrides) |
| `design-systems/<S>.css` | `[data-design-system="S"]`, `…[data-appearance="A"]` | S's anatomy, S = `material`, `fluent`, `carbon` |
| `resolved/<B>.<S>.<A>.json` | — | Resolved values, with `"preview": true` |

Every brand × shared design system pair, in each appearance the brand defines,
is composed at build time and MUST pass the contrast gate, so a brand can be
judged on every system before it becomes a theme.

## Precedence and Compatibility *[Amended — ADR-018]*

- Versioning: ships in `@ux-builder/tokens` 1.0.0 with CONTRACT-001's names.
- Ordering or precedence: by specificity only; an appearance block > its
  theme's base block.
- Backward-compatibility rules: for each 0.x theme and appearance, the
  composed values MUST equal the 0.3.0 values (FEAT-001 THEME-09); the 0.x
  `data-theme` values and file names keep working, with no removal planned.
- Deprecation rules: none. `data-family` (set by the original harness prototype) is
  ignored, as it is today.

## Error Semantics *[Amended — ADR-018]*

| Condition | Error / Outcome | Retry | Recovery Expectation |
|-----------|------------------|-------|----------------------|
| A theme names a missing brand or shared design system | Build fails | no | Fix the theme file |
| A theme's `default` is an appearance its brand lacks | Build fails | no | Fix `default` |
| A theme or preview pair fails the contrast gate | Build fails naming the theme (or brand and design system), appearance and pairing | no | Fix the brand's colours |
| An app sets a `data-theme` it has not loaded | No tokens apply; widgets use their `ui.css` fallbacks | — | Import `themes/<T>.css` |
| An app sets `data-appearance` its theme's brand lacks | The default appearance applies | — | Set an appearance the brand defines |
| A composed value differs from 0.3.0 for a 0.x theme | Build fails (equivalence check) | no | Fix the theme, brand or design system file |

## Examples *[Amended — ADR-018]*

```html
<html data-theme="praxis-carbon" data-appearance="light">
<html data-theme="synaptiq">  <!-- light, its default -->
```

```js
import "@ux-builder/tokens/themes/synaptiq.css";
import "@ux-builder/ui/ui.css";
```

## Non-Normative Notes

- *[Amended — ADR-018]* The brand builder (FEAT-003) compares a
  palette on Material, Fluent and Carbon through the preview surface, then
  saves a theme file; integration is one import and one attribute.
- **v1 decisions, superseded by ADR-018** (kept for the record): apps were to
  set `data-brand` + `data-design-system` + a required `data-appearance`;
  praxis and plain were design systems; `data-theme` was an alias
  table to be removed in 2.0.0. None of this shipped in a release.

## Validation Checklist

- [x] Normative fields and rules are explicit.
- [x] Compatibility and precedence rules are explicit.
- [x] Error handling is explicit.
- [x] At least one executable test can be derived from this contract (equivalence of the 0.x themes; theme blocks restore defaults; `tools/__tests__/themes.test.mjs`).
- [x] Non-normative notes cannot be mistaken for contract requirements.
- [x] Operator review of the v1 decisions (accepted 2026-10-06).
- [x] Operator review of the amendment (ADR-018) — accepted 2026-10-06.
