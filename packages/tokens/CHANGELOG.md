# @ux-builder/tokens

## 2.0.0

### Major Changes

- 7d833cd: On the vk/adjustments branch, only the vk- themes remain: vk-databricks, vk-plain, vk-praxis, vk-praxis-carbon, vk-praxis-fluentui, vk-praxis-material and vk-synaptiq. The original themes, vk-ux-builder-databricks, vk-praxis-v2-databricks, vk-img-8593-databricks and the brands only they used are removed; the SDK's defaults (wireframes, prototypes, create-app, lint, Storybook, the site) now name vk- themes. The vk- themes on a shared design system sit on vk- copies of it (vk-databricks, vk-material, vk-fluent, vk-carbon), so their shape and spacing can change without touching the shared ones. A theme's icon set now comes from its design system's icon.set token (manifest iconSet), so a renamed copy keeps its set.

### Minor Changes

- b4678d0: The vk- themes stop using red for links, selection, focus and kickers, as color.red-reserved asks: the vk-praxis brand (vk-praxis, vk-praxis-carbon, vk-praxis-fluentui, vk-praxis-material) and vk-praxis-v2 take a blue accent, and vk-synaptiq's light appearance takes Arctic, deepened to read as text. Each new accent clears 4.7:1 on every ground and surface in its appearance. Red stays for errors, destructive actions, the Praxis logo and Synaptiq's critical status. The original themes are unchanged.
- 3383d93: Adds a vk- copy of every theme (10) and of the brand each one uses (7), so they can be adjusted on the vk/adjustments branch without changing the originals. Each copy starts identical to its original.

## 1.9.0

### Minor Changes

- 569c525: The `plain` theme has a dark appearance (ADR-043), so a guided prototype for a product used in dark rooms can show dark before any brand theme exists. It inverts plain's grays and blue and clears 4.5:1 in every pairing.

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
