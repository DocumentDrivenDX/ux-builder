---
ddx:
  id: SD-001
  type: solution-design
  status: draft
  links:
    - kind: informed_by
      to: FEAT-002
    - kind: informed_by
      to: ADR-014
    - kind: informed_by
      to: CONTRACT-002
    - kind: informed_by
      to: US-006
    - kind: informed_by
      to: US-007
    - kind: informed_by
      to: US-008
    - kind: informed_by
      to: US-009
    - kind: informs
      to: FEAT-003
---

# SD-001: Palette engine

**Feature**: FEAT-002 — Palette options generated from a logo
**Stories**: US-006, US-007, US-008, US-009
**Status**: Draft
**Owner**: Operator

## Summary

A new workspace, `@ux-builder/engine`, holds a deterministic, dependency-free ES
module that analyses an SVG or PNG logo, generates five named palette
strategies for light and dark, fits every option to the contrast gate by
moving lightness only, and returns each option with the settings that
produced it. It works in OKLCH. It runs in Node (the `npm run brand` command,
tests) and in the browser (the brand builder, FEAT-003) from one core; only
file reading and PNG inflation differ. It contains no model call: the
feedback interpreter (ADR-014) changes the settings defined here and nothing
else.

## Decisions

| # | Decision | Chosen | Rejected, and why |
|---|----------|--------|-------------------|
| D1 | Colour model | **OKLCH** (OKLab in polar form), implemented in the engine (≈ 80 lines) | **HCT / Material Color Utilities**: tonal palettes and a tone axis aligned with contrast, but it pulls in Material's opinions (fixed tone steps, its own harmonisation), is a dependency to keep in step, and its output is harder to explain in a brand file. **HSL** (as `theme_accent.py` uses): not perceptually uniform, so "keep hue, move lightness" drifts visibly and equal moves do not look equal. OKLCH is also what CSS and AppKit use. |
| D2 | Fitting axis | Move **OKLCH L only**, keeping H and C; reduce C only when the colour leaves the sRGB gamut | Moving chroma or hue to pass would change what the brand colour *is*; the existing themes record "hue kept" moves and the reviewers rely on it. |
| D3 | Contrast check | Reuse `tools/contrast.mjs` (`PAIRS`, `solid()`, 4.5:1) and compose each option with **every shared design system** through `packages/tokens/compose.mjs` | A second, engine-local list of pairings would drift from the build gate (US-008-AC1). Widget pairings (badge, toast, selected segment) depend on the design system, so a brand-only check is not enough. |
| D4 | Dependencies | **None at run time.** PNG decoding is ported from `theme_accent.py`; inflation uses `node:zlib` in Node and `DecompressionStream` in the browser | An image library adds weight to the brand builder and a supply-chain surface for a few hundred lines of code. |
| D5 | SVG handling | Read colours from the **text** of attributes and `style` values; never build a DOM, render, or resolve `href`s; a `data:image/png` is decoded as a PNG | In Node, rendering would need a rasteriser and execute more of the file than the security requirement allows; occurrence weighting is what `theme_accent.py` used successfully. *[Amended 2026-10-06]* The builder, which has a browser, draws the SVG as an `<img>` (no script runs) to a canvas and measures drawn area with `analysePixels()` (Extraction 3). |
| D6 | Determinism | Fixed iteration orders, no randomness, no locale or time inputs; every output colour is rounded to an 8-bit hex before it is compared or stored; goldens are generated and checked on the repo's Node LTS | Floating-point `Math.pow`/`Math.cbrt` may differ in the last bit across engines; rounding to hex makes a disagreement require a value exactly on a rounding boundary, and the browser builder re-validates any palette it saves through the Node build anyway. |

## Architecture

```
packages/engine/
  src/
    oklch.js        sRGB <-> OKLab <-> OKLCH, gamut mapping, ΔE_OK, hex I/O
    extract/
      svg.js        colour tokens from markup (fill, stroke, stop-color, color, style)
      png.js        decoder ported from theme_accent.py; inflate is injected
      analyse.js    identity filter, folding, ranking, monochrome detection
    generate/
      settings.js   the settings schema (below), clamping, defaults
      roles.js      role targets per appearance (below)
      strategies.js faithful, muted, vibrant, neutral-accent, two-colour
      states.js     status hues and harmonisation
      fit.js        compose with each design system, find failing pairings, move L
    index.js        analyse(), generate(), regenerate(), settingsSchema
  node.js           file reading, node:zlib, sha256 for the brand file
  browser.js        File/ArrayBuffer input, DecompressionStream
tools/brand.mjs     the CLI behind `npm run brand`
tests/fixtures/logos/        reference logos (≥ 10)
tests/fixtures/palettes/     golden options, one file per logo × strategy
```

### Public API

```js
analyse(bytes, { type? })            // -> { candidates: [{ hex, share, oklch }], monochrome, warnings }
generate(analysis, settings?)        // -> { options: [Option], clamped: [{ name, given, used }], warnings }
regenerate(brandFile, logoBytes)     // -> { identical: boolean, differences: [...] }
settingsSchema                       // JSON Schema for the settings; the interpreter's tool schema (ADR-014)

Option = {
  strategy,                           // "faithful" | "muted" | ...
  settings,                           // complete, clamped
  brand,                              // a CONTRACT-002 brand file body: appearances.light/dark, generation
  moves: [{ appearance, role, from, to, deltaL, flagged }],
}
```

## Extraction (US-006)

Ported from `tools/theme_accent.py`, with three changes:

1. **Identity filter in OKLCH**: a colour is a brand candidate when
   C ≥ 0.06 and 0.30 ≤ L ≤ 0.92. This replaces the HSL thresholds
   (chroma ≥ 0.20, lightness 0.18–0.92) with their perceptual equivalent and
   is calibrated against the same logos (`navy-wordmark.svg` must give the same top
   candidate, US-006-AC6).
2. **Folding** by OKLab distance with lightness counted at a quarter
   (< 0.05; each colour joins the first, most-covered cluster in range),
   instead of a 12-step RGB grid, so anti-aliased edges, gradient stops and
   shading of one colour fold into one candidate with summed share. Plain
   ΔE_OK < 0.04 left the Praxis mark's shaded red as four candidates.
3. **Shares**: in `analyse()`, SVG colours are weighted by occurrence in the
   markup and PNG colours by visible pixel area (alpha ≥ 128). Candidates
   below 5% share are dropped unless none reach it, then the largest three
   are kept (as `theme_accent.py`). *[Amended 2026-10-06]* `analysePixels()`
   takes RGBA pixels the caller has drawn (the builder draws SVGs to a
   canvas) and weights by drawn area with a 2% floor (`SHARE_BY_AREA`), since
   area finds a small but prominent mark that occurrence misses. The two
   paths can rank colours differently, so a brand file records the colours
   generation used (`generation.extracted`) and regeneration rebuilds the
   candidates from them rather than re-analysing (`regenerate()`); the logo's
   hash still catches a changed logo.

A large PNG is sampled on a regular stride to about 250 000 pixels (as
`theme_accent.py` does), so analysis stays well under the 2 s budget. A logo with no candidates is `monochrome: true`.

## Generation (US-007)

### Role targets

Every role in CONTRACT-002 is produced for both appearances. Neutrals take
the brand hue `H₀` (after `hueShift`) at a strategy chroma `Cₙ`
(× `neutralTint`); text tiers are fitted after placement.

| Role | Light L | Dark L | Chroma |
|------|---------|--------|--------|
| ground | `groundLight` (0.985) | `groundDark` (0.18) | Cₙ |
| ground-recessed | ground − 0.025 | ground − 0.03 | Cₙ |
| surface | 1.0 (white) | ground + 0.05 | Cₙ (light: 0) |
| surface-sunken | ground − 0.03 | ground + 0.09 | Cₙ |
| border | 0.90 | ground + 0.15 | Cₙ × 1.5 |
| text-strong | 0.20 | 0.98 | Cₙ × 2 |
| text | 0.26 | 0.94 | Cₙ × 2 |
| text-muted | 0.42 | 0.80 | Cₙ × 2 |
| text-subtle | 0.50 | 0.70 | Cₙ × 2 |
| structure | strategy | strategy | strategy |
| accent | strategy | strategy | strategy |
| on-accent | white or text-strong, whichever passes on structure *and* accent | same | — |
| logo-paint | top candidate, unchanged | same | — |

### Strategies

All five run by default; `strategies` narrows them. Each needs at least one
candidate except where noted.

| Strategy | Structure (buttons) | Accent (links, focus) | Neutrals Cₙ | Notes |
|----------|---------------------|------------------------|-------------|-------|
| `faithful` | brand colour | brand colour | 0.008 | The brand as it is, fitted. |
| `muted` | brand at C × 0.55, L 0.38 (light) / 0.75 (dark) | same | 0.005 | "Conservative": lower chroma, deeper buttons. |
| `vibrant` | brand at C × 1.2 (gamut-capped), L 0.48 (light) / 0.72 (dark) | same | 0.03 | A rich mid-tone and clearly brand-tinted grounds. Brand colours are usually near the gamut edge already, so "more chroma" alone was indistinguishable from `faithful` after fitting. |
| `neutral-accent` | ink: text colour | brand colour | 0.004 | Like Databricks: neutral buttons, brand as accent. |
| `two-colour` | first candidate | second candidate | 0.008 | Only when a second candidate is ≥ 30° away in hue; otherwise skipped and reported. |

Monochrome logos (US-007-AC6) run `faithful`, `muted` and `vibrant` on a
suggested brand colour at `suggestedHue` (C 0.14, L 0.55), plus
`neutral-accent` with that accent, and set a warning.

Two options are *distinct* (US-007-AC5) when their structure, accent or
ground differ by ΔE_OK ≥ 0.03 (0.05 rejected visibly different tinted grounds); a strategy whose output is not distinct from
an earlier one is dropped and reported, and the engine still guarantees ≥ 4
by adding `muted` and `vibrant` variants at `chromaScale` ± 0.25.

### Status colours (PAL-06)

| State | Base hue | Band | Light L | Dark L | C |
|-------|----------|------|---------|--------|---|
| live | 150° | 120–185° | 0.52 | 0.75 | 0.13 |
| limited | 75° | 55–95° | 0.55 | 0.82 | 0.13 |
| purchasing | 250° | 225–270° | 0.48 | 0.72 | 0.13 |
| evaluation | text-muted | — | — | — | — |
| closed | 27° | 10–40° | 0.52 | 0.70 | 0.18 |

Each base hue rotates toward `H₀` by `stateHarmony` × the shortest angular
distance, capped at 15° and clamped to its band. If a state lands within 25°
of the accent's hue it is pushed away until it is 25° clear, within its band.
States are then fitted (below) against `surface-sunken`, where pills sit.

## Fitting (US-008)

For each option, appearance and shared design system:

1. Compose the option's brand with the design system (`compose.mjs`,
   preview surface) and resolve every token.
   The pure half of `compose.mjs` lives in `packages/tokens/compose-core.mjs`
   (no file system, no schema validator) so this also runs in the browser.
2. Check every `PAIRS` entry with `contrast.mjs`. Stop when all pass.
3. For each failing pairing, trace the foreground through its references to
   a brand role; if that role may move it is the mover, else the background's
   role is (a filled button moves, not the label on it). Grounds and surfaces
   never move. Each mover goes to the nearest L (0.005 steps, down before up
   at equal distance), H and C kept and gamut-mapped, at which **every**
   pairing it takes part in passes, so fixing one pairing cannot break
   another.
4. Repeat from 1, at most 8 rounds; one role serving two pairings is fitted
   once to satisfy both (US-008 edge case).
5. If a role cannot pass at any L, the option is withheld with the role and
   pairing (US-008-AC5).

Every move is reported as `{ from, to, deltaL }` in OKLCH L points and written
into the token's `$description` in the style the existing brands use
("Brand #FF3621 moved −0.12 L (OKLCH, hue kept) to clear 4.5:1."). A move with
|ΔL| > **0.12** is `flagged` for review (PAL-08). That threshold is a
starting point, chosen so the existing hand-fitted moves (the largest is
Databricks' warning, about −0.20 L) would be flagged and routine ones would
not; revisit it after the first ten brands.

## Settings (US-009)

The complete settings schema. Every value is a number, string or boolean, as
the brand file's `generation.settings` requires. Out-of-range values are
clamped and reported (`clamped`); unknown names are rejected.

| Name | Type | Range | Default | Effect |
|------|------|-------|---------|--------|
| `strategies` | string | comma-separated subset of `faithful,muted,vibrant,neutral-accent,two-colour` | all five | Which strategies run. |
| `primaryCandidate` | integer | 0 – 2 (and < candidate count) | 0 | Which extracted colour is the brand colour. |
| `secondaryCandidate` | integer | −1 – 2 | −1 (auto: next candidate ≥ 30° away) | Accent source for `two-colour`. |
| `hueShift` | number (°) | −30 – 30 | 0 | Rotates the brand colour and the neutrals' tint. |
| `chromaScale` | number | 0.5 – 1.5 | 1.0 | Multiplies each strategy's brand chroma. |
| `neutralTint` | number | 0 – 2 | 1.0 | Multiplies each strategy's neutral chroma Cₙ; 0 gives pure greys. |
| `groundLight` | number (L) | 0.94 – 1.0 | 0.985 | Light page ground. |
| `groundDark` | number (L) | 0.10 – 0.26 | 0.18 | Dark page ground. |
| `stateHarmony` | number | 0 – 1 | 0.5 | How far status hues lean toward the brand (≤ 15°). |
| `minContrast` | number | 4.5 – 7 | 4.5 | Fitting floor; never below the gate. |
| `suggestedHue` | number (°) | 0 – 360 | 250 | Brand hue used only for monochrome logos. |
| `appearances` | string | `light,dark` \| `light` \| `dark` | `light,dark` | Which appearances to produce. |

The brand file records `generation.engine` (the engine's semver),
`generation.logo` (`path`, `sha256`), `generation.extracted` (candidate hexes),
`generation.strategy` and these settings. `regenerate()` refuses with a clear
message when the logo hash differs, and warns when the engine's major or minor
version differs from the one recorded.

ADR-014's interpreter receives `settingsSchema`, the current settings and the
options' values (never the logo, unless enabled), and returns setting changes
only. Example: "too orange, more conservative" → `hueShift: -12`,
`chromaScale: 0.75`, `strategies: "muted,neutral-accent"`.

## Testing

| Layer | What | Where |
|-------|------|-------|
| Unit | OKLCH round trips (sRGB → OKLCH → sRGB within 1/255); contrast parity with `tools/contrast.mjs`; clamping | `packages/engine/test/` |
| Golden | For each reference logo: `analyse()` output, and each strategy's option, stored as JSON. A change to any golden fails the test; updating goldens (`UPDATE_GOLDEN=1`) is a reviewed change (FEAT-002 Reliability) | `tests/fixtures/palettes/<logo>.<strategy>.json` |
| Property | Every option of every logo passes every `PAIRS` entry on every shared design system (US-008-AC1); two runs are byte-identical (US-009-AC1); regenerate round-trips (US-009-AC5) | same suite |
| Parity | `navy-wordmark.svg` top candidate equals `tools/theme_accent.py`'s (US-006-AC6) | runs Python when available, else a recorded value |
| Security | An SVG with `<script>`, event handlers and an external `href` analyses without executing or fetching anything | fixture `hostile.svg` |
| Performance | 1 MB PNG, four options, ≤ 2 s | timed test, skipped in CI if the runner is slow |

Reference logos (≥ 10): the Praxis PNGs in `brand/praxis/` and the Synaptiq
colour mark; plus synthetic fixtures made for the cases: two-colour,
gradient, pale yellow brand, green brand (collides with live), navy wordmark
plus bright symbol (`navy-wordmark.svg`, also the parity logo for
`theme_accent.py`), black-only, transparent anti-aliased PNG, PNG with an
opaque white background, and `hostile.svg`. No third-party logos are
committed.

Each test cites the acceptance criteria it covers (`@covers US-008-AC1`).

## Build order

1. `oklch.js`, contrast parity, settings schema (unit tests).
2. Extraction port and goldens (bead `ux-builder-29b06bfa`).
3. Roles, strategies, states and fitting; property tests (bead
   `ux-builder-44c8fba7`).
4. `regenerate()`, `tools/brand.mjs`, `npm run brand` (bead
   `ux-builder-b14ec03a`).
5. Gallery preview for a brand file (bead `ux-builder-433c8611`).

## Risks

| Risk | Mitigation |
|------|------------|
| Strategies look alike for some logos | Distinctness check (ΔE_OK ≥ 0.05) with variants to guarantee ≥ 4; review goldens visually in the gallery |
| Fitting loops between two pairings | One role fitted once against all its pairings; 8-round cap; withheld with a reason |
| OKLCH thresholds pick different candidates than `theme_accent.py` | Parity test on `navy-wordmark.svg`; calibrate on all reference logos before goldens are frozen |
| Browser and Node disagree on a rounding boundary | Saved brands are rebuilt and gated by the Node build in the review PR |

## Open questions

None blocking. The review threshold (0.12 L) and the role targets are
starting values to calibrate against the reference logos while building
step 3; changing them is a golden update, not a contract change.
