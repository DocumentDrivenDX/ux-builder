---
"@ux-builder/tokens": minor
---

Diagram and data-visualization tokens in every theme and appearance (FEAT-017; US-112, US-113). The new tokens add nothing to existing names or values:

- Status: `--piq-color-status-positive`, `-caution`, `-negative`, `-info`, each with a `-subtle` fill. Each status colour clears 4.5:1 as text on the ground and a card, and 3:1 as a mark on its own fill.
- Series: `--piq-color-series-1` … `-8`. These are blue, orange, aqua, yellow, magenta, green, violet and red, in a fixed colour-vision-safe order. Each clears 3:1 on the ground, a card and the deepest region.
- Diagrams: `--piq-color-diagram-region-1` … `-3` (tints of the ground), `--piq-color-diagram-edge`, `-edge-strong` and `-edge-muted`, and `--piq-color-lifecycle-placeholder`, `-decided` and `-unknown`.
- Shape: `--piq-size-diagram-stroke`, `--piq-size-diagram-stroke-strong` and `--piq-radius-diagram-node`, set per design system. Carbon draws square nodes with 1px strokes, Fluent 4px corners, Material 12px, and Databricks 8px.
- A brand may set its own status or series colour per appearance (`appearances.<ap>.color.status-*`, `series-*`). Otherwise it gets the SDK's defaults from `tokens/dataviz.json`.
- `npm run contrast` checks the new pairings in every theme, appearance and preview pair. It also checks that neighbouring series stay at least 8 ΔE apart under simulated protanopia and deuteranopia, and that the region tints deepen from the ground.
