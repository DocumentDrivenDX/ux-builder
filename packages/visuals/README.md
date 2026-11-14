# @ux-builder/visuals

Draw a `umf.visual` document (one picture described as data: umf-visual's CONTRACT-083) in any
ux-builder theme. You get SVG for pages, Mermaid for Markdown readers, a plate (a first map of
a codebase, with its walkthrough) and a stepped presentation. No browser, network or randomness
at render time: the same document and theme give the same bytes.

It draws every kind and form of `umf.visual` 1.0: `flow` (network, pipeline, zoned, lanes),
`sequence` (lifelines, ladder), `state` (machine, lifecycle), `structure` (entities, tree, stack,
nested), `timeline` (milestones, roadmap, history), `comparison` (matrix, quadrant, before-after)
and `metric` (stat, bar, line, meter). In a React app, `<Visual>` draws one in the app's theme.

## Use

```sh
npm install @ux-builder/visuals
```

```js
import { render, check, createTheme, loadTheme } from "@ux-builder/visuals/node";

const { content, layout, text, warnings } = await render(document, {
  theme: "praxis",          // a theme name (Node), or a resolved theme object anywhere
  appearance: "both",       // "light" | "dark" | "both": CSS variables that follow the page
  output: "svg",            // "svg" | "mermaid" | "plate" | "presentation"
});
const findings = check(layout, { theme: createTheme(loadTheme("praxis", "both"), "both") });
```

In the browser (or any bundler), import from `@ux-builder/visuals` and pass the resolved theme
JSON from `@ux-builder/tokens/resolved/<theme>.<appearance>.json`.

A batch, in one process:

```sh
npx ux-builder-visuals render docs/visuals/*.json --theme praxis --appearance both \
  --output all --out site/visuals --check --report
```

It writes `<id>.svg`, `<id>.mmd`, `<id>.plate.html` and `<id>.presentation.html` (for visuals with
steps), plus `<id>.layout.json` with `--report`. For a stack, nested, comparison or metric visual,
which Mermaid has no diagram for, the portable form is a Markdown table, `<id>.md`. It prints a JSON summary and exits 1 when a
document is refused or, with `--check`, a drawing fails its quality checks.

In a React app:

```jsx
import { Visual } from "@ux-builder/visuals/react";

<Visual doc={document} />   // inside the app's ThemeProvider
```

It reads the theme from the page (the `--piq-*` values around it), so it needs no theme name,
and draws once: a switch of theme or appearance restyles it through its CSS variables. Screen
readers get one image named by the title and described by the takeaway, and the text equivalent
sits in a "Text version" disclosure under it. The lint's `no-inline-svg` and the audit treat it as
the SDK's; both report a diagram an app draws as its own `<svg>`.

## What a page gets

- `role="img"` named by its `<title>` and described by its `<desc>`, and a text equivalent (`text`, Markdown) to place
  in a collapsed block under the figure.
- One `<g>` per item, `id="<visual>--<item>"`, with `data-role`, `data-status`, `data-kind`
  and `data-steps`: pages and the player address items by the document's own ids.
- Colours, strokes and radii from the theme's role tokens (CONTRACT-001), never literals.

## Checks

`check(layout)` reports text outside its box, edges through nodes or labels, overlapping labels,
crossings over the form's budget, text under 12 px, and contrast under 4.5:1 (text) or 3:1
(lines), in both appearances for `both`.

## Where things come from

- Each `umf.visual` schema the renderer reads (1.0.0 and 1.1.0) and the test fixtures are a pinned
  copy of umf-visual's (`schema/PINNED.json`); `node scripts/pin-umf-visual.mjs <umf-visual checkout> <commit>` moves the pin.
- Layout: elkjs 0.12.0 (EPL-2.0 OR GPL-3.0-or-later, used unmodified; ADR-042). Zoned
  (ported from HELIX documentor's `deploy.py`), sequence and lifecycle layouts are our own.
- Text is measured from tables extracted from `@ux-builder/tokens`' fonts
  (`npm run metrics`). A theme whose font is not shipped (a system stack, Segoe UI) is measured
  with the widest shipped body font, and the render warns `FONT_STAND_IN`.

Design: FEAT-019, ADR-042, CONTRACT-009 and SD-007 under `docs/helix/`.
