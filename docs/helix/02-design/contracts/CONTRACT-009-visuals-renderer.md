---
ddx:
  id: CONTRACT-009
  type: contract
  status: draft
  links:
    - kind: informed_by
      to: FEAT-019
    - kind: informed_by
      to: ADR-042
    - kind: informed_by
      to: CONTRACT-001
---

# Contract

**Contract ID**: CONTRACT-009 — Visuals renderer
**Type**: library API, command and output formats (`@ux-builder/visuals`, `ux-builder-visuals`)
**Version**: v1 (`@ux-builder/visuals` 0.1.0)
**Status**: draft — 2026-10-22, with ADR-042
**Related**: FEAT-019, ADR-042, CONTRACT-001 (token names), umf-visual CONTRACT-083 (`umf.visual` 1.0.0 and 1.1.0, DocumentDrivenDX/umf-visual)

## Purpose

Defines how a producer turns a `umf.visual` document into SVG, Mermaid, a plate or a
presentation in a ux-builder theme, what the output looks like to a page that embeds it, and
how a drawing is checked.

## Scope and Boundaries

In 0.1.0: `flow` (network, pipeline, zoned, lanes), `sequence` (lifelines, ladder), `state`
(machine, lifecycle), `structure/entities` and `structure/tree`. *[Amended 2026-10-26: M4]* From
0.2.0, every form of `umf.visual` 1.0: also `structure/stack` and `structure/nested`, `timeline`
(milestones, roadmap, history), `comparison` (matrix, quadrant, before-after) and `metric` (stat,
bar, line, meter); `VISUAL_UNSUPPORTED` remains for a form a later minor version of umf.visual
adds. The renderer does not produce documents, check evidence, or decide when to draw.

## Normative Surface

### Input

A UMF document whose vocabulary `umf.visual` is version `1.x`; another major is
`VISUAL_VERSION`. The package carries a pinned copy of each `umf.visual` payload schema
(`schema/umf-visual-<version>.schema.json`, 1.0.0 and 1.1.0, with `schema/PINNED.json` naming the
umf-visual commit and each digest). A document is checked against the newest pinned version not
newer than the one it declares, so a 1.0.0 document using a 1.1.0 field is incomplete, and a
later 1.x minor is read as the newest pinned one with its additions unknown. *[Amended 2026-10-30:
US-169]* For 1.1.0's entity references, a field id the entity lacks, `field` and `fieldId` naming
different fields, or a multiplicity whose bounds are reversed or contradict its cardinality is
`VISUAL_INVALID`. A multiplicity no crow's foot states is written beside the end of its line; the
Mermaid `erDiagram` takes the nearest crow's foot and carries the exact notation in the label.
A document that fails it, names a form outside its kind, or has an id that does not resolve is
refused with `VISUAL_INVALID` and its diagnostics, as is a `flow/zoned` visual with a node outside
every group or a root group without a tier (umf's `VISUAL_FORM_RULE`). Unknown fields make a document incomplete,
and it is refused with `VISUAL_INCOMPLETE` unless `allowIncomplete: true`, which draws the known
content and warns.

### API

```js
import { render, check, renderAll } from "@ux-builder/visuals";      // any runtime
import { render, loadTheme } from "@ux-builder/visuals/node";         // Node: themes by name

const { content, format, warnings, layout, text } = await render(document, {
  theme,                 // a resolved theme object ({ theme, appearance, tokens }); in /node also a theme name
  appearance: "light",   // "light" | "dark" | "both"
  output: "svg",         // "svg" | "mermaid" | "plate" | "presentation"
  width: 1280,           // the column it must fit; below a form's minimum it falls back (sequence → ladder; milestones, roadmap → history)
  allowIncomplete: false,
});
const findings = check(layout, { theme });   // [] when the drawing meets the quality bar
```

`render` returns a promise. `content` is the output text; `format` says what it is (`svg`,
`mermaid`, `markdown`, `html`); `text` is the text equivalent (Markdown: the parts and
connections; messages, states and transitions; a timeline's entries in order; a table of every
value for comparison and metric); `layout` is the layout report; `warnings` are `{code, message}`.

The portable form (`output: "mermaid"`) is Mermaid for the graph kinds, a `timeline` for
milestones and history and for a roadmap on named periods, and a `gantt` for a roadmap on dates.
For `structure/stack`, `structure/nested`, `comparison` and `metric`, which Mermaid has no
diagram for, it is a Markdown table (`format: "markdown"`), and the command writes it as
`<id>.md`. `portableIsTable(visual)` says which.

`appearance: "both"` needs both appearances (`/node` loads them; otherwise pass `theme` as
`{ light, dark }`). Colours are written as `var(--piq-…, <light value>)`, so an inline SVG
follows the page. `light` and `dark` write resolved hex values for a standalone file.
`color-mix(in srgb, …)` values are mixed to hex.

### SVG

- Root: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" width="W" height="H"
  role="img" aria-labelledby="ID-title" aria-describedby="ID-desc" class="uxb-visual uxb-visual--KIND-FORM"
  data-visual="ID">`, then `<title id="ID-title">` (the title, or the question) and
  `<desc id="ID-desc">` (the takeaway, or the question).
- Each drawn item is a `<g>` with `id="ID--ITEM"` (the document's ids), a class for what it is
  (`uxb-node`, `uxb-group`, `uxb-edge`, `uxb-participant`, `uxb-message`, `uxb-state`,
  `uxb-transition`, `uxb-entity`, `uxb-reference`) and its role, status and kind as
  `data-role`, `data-status` and `data-kind`. Items a step focuses carry
  `data-steps="s1 s3"`.
- Every colour, stroke width and radius comes from CONTRACT-001 tokens; fonts are the theme's
  `--piq-font-body` stack. No external reference (`href` to a URL, `@import`, remote font).
- Bytes are deterministic: attributes in a fixed order, numbers rounded to 2 decimals, no
  timestamps or random ids.

### Layout report

```json
{ "width": 0, "height": 0, "form": "flow/network", "font": { "family": "DM Sans", "standIn": false, "intended": "Segoe UI" },
  "boxes": [{ "id": "", "kind": "node|group|band|participant|note|row|state|entity|label", "x": 0, "y": 0, "width": 0, "height": 0 }],
  "texts": [{ "id": "", "z": 0, "text": "", "box": "", "x": 0, "y": 0, "width": 0, "height": 0, "size": 14 }],
  "edges": [{ "id": "", "z": 0, "from": "", "to": "", "points": [[0, 0]], "label": "" }],
  "colors": [{ "id": "", "kind": "text|line", "fg": "piq-…", "bg": "piq-…" }] }
```

`z` is paint order: higher is drawn later, on top.

### Checks (`check`)

| Code | Fails when |
|---|---|
| `TEXT_OVERFLOW` | A text's box extends outside the box that owns it |
| `EDGE_THROUGH_NODE` | An edge segment crosses a node box other than its own ends |
| `EDGE_THROUGH_LABEL` | An edge segment is drawn over another edge's label or a region's header (a line painted beneath an opaque label, as zoned tags are, hides nothing and passes) |
| `LABEL_OVERLAP` | Two edge labels overlap |
| `CROSSINGS` | Edge crossings exceed the form's budget (`network` 2, `pipeline` 0, `lanes` 0) |
| `TEXT_TOO_SMALL` | Text is under 12 px at native size (24 px on a 1920-wide presentation) |
| `CONTRAST` | A text pair is under 4.5:1 or a line under 3:1 in the theme |

### Command

```
ux-builder-visuals render <doc.json>… --theme <name> [--appearance light|dark|both]
    [--output svg|mermaid|plate|presentation|all] [--width <px>] [--out <dir>] [--check] [--report]
```

One process renders every document. A second document with an id already rendered is refused
(`VISUAL_DUPLICATE_ID`) rather than overwriting the first one's files. An unknown theme or
appearance, or a `--width` that is not a positive number, prints the usage and exits 2. Each output is written to
`<out>/<visual id>.{svg,mmd,plate.html,presentation.html}`; `--report` adds
`<id>.layout.json`. A JSON summary goes to stdout. Exit 1 when a document is refused, or
when `--check` finds a failure.

### Step marks

A step is marked on each item it focuses. Steps without `when` are numbered 1, 2, 3… in order;
a step with `when` (umf.visual CONTRACT-083) gets a pill of words instead: its `tag`, or its
preset's words (THROUGHOUT, BEFORE, AFTER, IN THE BACKGROUND, SCHEDULED, ON FAILURE, IF NEEDED),
in upper case. The text equivalent lists the numbered steps, then the others led by those words
in sentence case; the presentation titles them the same way.

### Mermaid, plate and presentation

- **Mermaid**: `flowchart` (subgraphs for groups), `sequenceDiagram`, `stateDiagram-v2`,
  `erDiagram`, `flowchart TD` for a tree, each opened with `%%{init: {"theme":"base",
  "themeVariables": {…}}}%%` from the theme's tokens, then `%% id: <visual id>`.
- **Plate**: one offline HTML page composed as HELIX documentor's field guide page: an eyebrow
  (the own part's name), the title as headline with the takeaway beneath and a stamp (audience,
  source file, part count); the SVG on a card; a legend of what the drawing uses; the steps as a
  numbered list ("Follow a request"), each led by its focused line's `why` when it has one, then
  each step with a `when` as a paragraph led by when it happens ("Throughout: …");
  beside them the omissions and the source ("Sources and limits"); the text equivalent.
- **Presentation**: one offline HTML page with the SVG, the step's title and caption, and a
  player (`@ux-builder/visuals/player`) that moves between steps with buttons and the arrow
  keys and glides the view to each step's focus (no motion when the reader prefers reduced
  motion). Requires steps (`VISUAL_NO_STEPS`).

## Precedence and Compatibility

Adding a kind, a form or an output is a minor version. Changing an id scheme, a class name or
a report field is a major version: pages and checks depend on them.

## Error Semantics

`render` rejects with an `Error` whose `code` is `VISUAL_VERSION`, `VISUAL_INVALID`,
`VISUAL_INCOMPLETE`, `VISUAL_UNSUPPORTED` or `VISUAL_NO_STEPS`, and whose `diagnostics` list
the problems. Warnings never reject: `FONT_STAND_IN`, `NARROW_FALLBACK`, `INCOMPLETE`.

## Examples

The test fixtures are umf's `fixtures/visual/` documents of the graph kinds, copied with their
pin; golden SVGs live beside the tests.

## Non-Normative Notes

The layout engines and the font tables are ADR-042. 0.2.0 adds the remaining kinds (above) and
the React widget.

## Validation Checklist

- [x] Every refusal and warning has a code.
- [x] Output ids and classes are stable and documented.
- [x] The determinism and offline rules are testable.
