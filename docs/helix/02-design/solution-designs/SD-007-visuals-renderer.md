---
ddx:
  id: SD-007
  type: solution-design
  status: draft
  links:
    - kind: informed_by
      to: FEAT-019
    - kind: informed_by
      to: ADR-042
    - kind: informed_by
      to: CONTRACT-009
---

# SD-007: Visuals renderer

## Shape

One pipeline, the same for every kind:

```
document ──validate──▶ visual ──layout(kind/form)──▶ scene ──┬─ svg/        ─▶ SVG
                         │                                  ├─ report      ─▶ layout report ─▶ check
                         │                                  ├─ plate/      ─▶ HTML
                         │                                  └─ presentation ─▶ HTML (+ player)
                         └──────────────── mermaid/ ─────────────────────────▶ Mermaid
```

A **scene** is the only thing layouts produce and writers consume: positioned `boxes` (region,
node, participant, state, entity, lifeline), `paths` (edges, messages, transitions, references,
with a style and markers), `texts` (each owned by a box or a path) and `badges` (step numbers),
all in pixels, plus each element's document id and its role, status and kind. Writers never
lay out; layouts never choose colours.

## Modules (`packages/visuals/src/`)

| Module | Does |
|---|---|
| `schema/validate.mjs` | Ajv over the pinned umf schema, then the resolution checks a renderer needs (form in kind, ids resolve), mirroring umf's codes |
| `theme/theme.mjs` | Reads a resolved theme; `color-mix(in srgb)` to hex; role and status to token names; `var()` with fallback for `both` |
| `theme/contrast.mjs` | WCAG relative luminance and contrast |
| `measure/measure.mjs` | Text width from `metrics/*.json` (advances and kerning) for the theme's first shipped font, or the stand-in; wraps detail text |
| `layout/elk.mjs` | Builds ELK graphs (sizes, ports, partitions, compound groups) and reads back positions and edge sections |
| `layout/flow.mjs` | network and pipeline, with ELK; routes zoned and lanes to their own modules |
| `layout/lanes.mjs` | lanes, our own placement ported from `field_guide.py`: lane boxes stacked on one axis, gaps sized by the labels crossing them, fans in nested corridors, skips over the top and steps back under the bottom (a step back to the next lane crosses the gap), labels wrapped to stay in their lane and moved to a clear run when one would sit on a line. The spine (from the first lane, the node in each lane that passes the flow on, the best connected when several do) sits on the axis and runs straight, the rest of its lane stacked below it, or above when it sends or takes a line under the bottom; a lane the flow does not pass through stays a centred stack. The lane holding the own part is shaded. Without steps the visual is a system map, not a field guide (HELIX's solution overview): the spine's lines are the heavy path, a lone own part is filled with the accent, a person is a figure with no box, and a legend names the line weights and roles drawn |
| `layout/zoned.mjs` | zoned, our own placement ported from `deploy.py`: tier bands, a lane per line in each gap, a left corridor for lines that skip a tier, "what · why" tags above the lines. Beyond `deploy.py`: a zone that only sends lines sits just above the first tier it reaches; zones and boxes are ordered by where their lines go; connected neighbours join side to side, in one zone or at the facing ends of two zones in a tier (the zones drawn together, the gap between them sized by the tag); a zone's `detail` is a caption along its bottom, sliding clear of lines; lines end in accent heads, as `deploy.py` draws them; a corridor line into the bottom tier runs under it and enters from below; lanes nest (fewest crossings, then nesting, by exhaustive search for nine lanes or fewer) |
| `layout/sequence.mjs` | lifelines and ladder: arithmetic columns and rows |
| `layout/state.mjs` | machine (ELK), lifecycle (main path on one row, others below) |
| `layout/structure.mjs` | entities (ELK with a port per field), tree (ELK mrtree) |
| `layout/blocks.mjs` *(M4)* | stack (bands in structure.layers order, alternating the first two region tints, parts in wrapping rows) and nested (containers in the region tint of their depth, children packed in rows) |
| `layout/timeline.mjs` *(M4)* | milestones (one axis; a day's events share a dot; label blocks on alternating levels where they clear), roadmap (lanes of spans in the lane's series colour, built solid and the rest dashed outlines, columns as wide as the longest word), history (a dated list; the narrow fallback below 560 px) |
| `layout/comparison.mjs` *(M4)* | matrix (a table; ratings as filled and empty circles with words, support as tick, cross or half circle with words; the chosen column under an accent rule with its reason), quadrant (rated axes named at both ends; points inset from the frame; names placed clear of other points and names), before-after (two panels, changed rows barred in the accent and labelled) |
| `layout/metric.mjs` *(M4)* | stat (the figure, its change in a status colour with a drawn arrow, a sparkline), bar (horizontal bars), line (gridlines, end labels for four series or fewer, else a legend), meter (track and fill toward the target); one series in the accent, several in the series colours; every number and label body text |
| `layout/chart.mjs` *(M4)* | numbers in their format and unit, ISO dates as UTC days, readable ticks. No d3: the scales are linear and dates whole days, so these few functions replace d3-scale and d3-shape (visuals PRD §6.2) without a dependency |
| `tables.mjs` *(M4)* | the rows behind the remaining kinds, for the text equivalent and the Markdown portable form |
| `svg/write.mjs` | Scene to SVG: shapes per role, markers per edge kind, rounded orthogonal paths, a11y, stable ids, fixed attribute order |
| `report.mjs`, `check.mjs` | Layout report from the scene; CONTRACT-009's checks on geometry |
| `mermaid/emit.mjs` | Mermaid per kind with `%%{init}%%` from the theme; for timelines a `timeline`, or a `gantt` for a roadmap on dates (a roadmap on named periods has no dates for a gantt); a Markdown table for the kinds Mermaid has none for |
| `plate.mjs`, `presentation.mjs`, `player/player.js` | Offline HTML; the player moves between steps and animates the viewBox |
| `render.mjs` | `render()` and `renderAll()` |

`node.mjs` adds theme loading by name from `@ux-builder/tokens`; `cli.mjs` is the command.
`scripts/build-metrics.mjs` extracts font tables with fontkit (development only);
`scripts/build-types.mjs` writes `index.d.ts` from the pinned schema.

## Visual grammar (shared by every layout)

- Node: rounded rectangle (`--piq-radius-diagram-node`), surface fill, border stroke
  (`--piq-size-diagram-stroke`); name bold, detail muted and wrapped below. `own`: accent
  outline, strong stroke. `actor`: a head-and-shoulders mark top-left. `store`: a cylinder
  cap. `document`: a folded corner. `external`/`platform`: sunken fill.
- Status: `placeholder` lifecycle-placeholder fill; `decided` dashed outline and
  lifecycle-decided fill; `unknown` dashed, muted text, lifecycle-unknown fill.
- Edges: orthogonal with rounded corners; `action` strong stroke, `data` edge, `control`
  dashed, `return` dashed muted; filled arrowheads (open for async). Labels sit on a ground-
  coloured chip on the line.
- Groups: region tints by depth (`diagram-region-1…3`), label top-left in muted bold.
- Steps: a numbered accent circle on each focused item; `emphasis: muted` items are drawn at
  lower opacity.

## Testing

Golden SVGs for every graph fixture in two themes; determinism (render twice); `check` clean
for every fixture in every theme and appearance; refusal codes; Mermaid shape; plate and
presentation offline (no `http`); CLI end to end; pinned-schema drift; metrics coverage for
every shipped font.
