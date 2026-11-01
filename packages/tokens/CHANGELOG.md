# @ux-builder/tokens

## 1.8.0

### Minor Changes

- 7f35781: Add the `img-8593-databricks` theme: the `img-8593` brand (made in the theme builder from the client's logo) on the databricks design system, light by default. Select it with `data-theme="img-8593-databricks"`. `@ux-builder/ui`'s catalogue and agent guidance list it.

## 1.7.0

### Minor Changes

- efac8f8: Diagram and data-visualization tokens in every theme and appearance (FEAT-017; US-112, US-113). The new tokens add nothing to existing names or values:
  
  - Status: `--piq-color-status-positive`, `-caution`, `-negative`, `-info`, each with a `-subtle` fill. Each status colour clears 4.5:1 as text on the ground and a card, and 3:1 as a mark on its own fill.
  - Series: `--piq-color-series-1` … `-8`. These are blue, orange, aqua, yellow, magenta, green, violet and red, in a fixed colour-vision-safe order. Each clears 3:1 on the ground, a card and the deepest region.
  - Diagrams: `--piq-color-diagram-region-1` … `-3` (tints of the ground), `--piq-color-diagram-edge`, `-edge-strong` and `-edge-muted`, and `--piq-color-lifecycle-placeholder`, `-decided` and `-unknown`.
  - Shape: `--piq-size-diagram-stroke`, `--piq-size-diagram-stroke-strong` and `--piq-radius-diagram-node`, set per design system. Carbon draws square nodes with 1px strokes, Fluent 4px corners, Material 12px, and Databricks 8px.
  - A brand may set its own status or series colour per appearance (`appearances.<ap>.color.status-*`, `series-*`). Otherwise it gets the SDK's defaults from `tokens/dataviz.json`.
  - `npm run contrast` checks the new pairings in every theme, appearance and preview pair. It also checks that neighbouring series stay at least 8 ΔE apart under simulated protanopia and deuteranopia, and that the region tints deepen from the ground.

## 1.6.0

### Minor Changes

- 4803047: Give the `synaptiq` brand its logo, mark and favicon, from the Synaptiq logo pack: the full-colour horizontal logo and logomark in light, the Apricot and white versions in dark. `<Logo />` now draws the artwork instead of a text wordmark, and `ThemeProvider` sets the butterfly mark as the tab icon.

## 1.5.0

### Minor Changes

- 9e12240: Add the `ux-builder-databricks` theme: the `ux-builder` brand (made in the theme builder from the client's logo) on the databricks design system, light by default. Select it with `data-theme="ux-builder-databricks"`. `@ux-builder/ui`'s catalogue and agent guidance list it.
