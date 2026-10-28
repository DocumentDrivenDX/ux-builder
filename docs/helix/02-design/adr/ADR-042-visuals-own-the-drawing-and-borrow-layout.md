---
ddx:
  id: ADR-042
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: ADR-015
    - kind: informed_by
      to: ADR-023
    - kind: informs
      to: FEAT-019
    - kind: informs
      to: CONTRACT-009
    - kind: informs
      to: SD-007
---

# ADR-042: Visuals own the drawing and borrow layout: ELK, and font metrics extracted at build time

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-22 | **Accepted** 2026-10-22 (operator's visuals PRD §6, "own the vocabulary, the visual grammar, and the SVG; borrow the hard math") | Operator | ADR-015, ADR-023, FEAT-017, FEAT-019, CONTRACT-009 | Medium |

## Context

`@ux-builder/visuals` draws `umf.visual` documents (umf's CONTRACT-083) in a theme. The parts
that make every DocumentDrivenDX picture look like one family (the shapes for each role, label
placement, the SVG) must follow the theme's role tokens (ADR-015, FR-73) and be deterministic,
accessible and drawn without a browser. No existing library does that. Graph layout with
compound regions, partitions and orthogonal routing is hard and solved elsewhere. Boxes must fit
their text in the theme's own fonts, measured without a browser.

## Decision

1. **Own the drawing.** Our modules turn a document into a scene (positioned boxes, paths and
   text), write the SVG, emit Mermaid, and build the plate and the presentation. Every colour is
   a role token; nothing is hard-coded.
2. **Borrow graph layout from elkjs 0.12.0** (ELK layered and mrtree) for `flow` (network,
   pipeline), `state/machine`, `structure/entities` and `structure/tree`. `flow/zoned`,
   `flow/lanes`, `sequence` and `state/lifecycle` are our own arithmetic layouts. Lanes are
   ported from HELIX documentor's `field_guide.py` (amended 2026-10-26, the operator: "can we
   get the field guide generation to be much closer to the today version"): each lane's boxes
   stacked on one shared axis, the gaps sized by the labels crossing them, skips over the top
   and steps back under the bottom. Zoned is ported from HELIX documentor's `deploy.py` (amended 2026-10-26,
   the operator: "the deploy looks better in the today version"): ELK placed every tier's lines
   as one bundle, while `deploy.py` gives each line its own lane, orders each box's exits by
   where its lines go, and sends lines that skip a tier down a left corridor. elkjs is EPL-2.0 OR GPL-3.0-or-later. It ships as an unmodified
   dependency, never bundled or changed. EPL-2.0 is file-level copyleft and does not reach our
   files, the same reasoning as axe-core's MPL-2.0. It is listed in `licenses/exceptions.json`
   awaiting counsel (ADR-023 rule 7). If counsel refuses, the fallback is `@dagrejs/dagre`
   (MIT) for network and pipeline, with more of our own placement for compound states and
   field-level entity references; zoned and lanes are already our own and do not use ELK.
3. **Measure text with the theme's font files, through tables extracted at build time.** A
   build script reads each font `@ux-builder/tokens` ships with fontkit 2.0.4 (MIT, development
   only) and writes per-family, per-weight advance and kerning tables to `metrics/`. Rendering
   reads the tables only, so measurement is pure JavaScript and identical in Node and in the
   browser. A theme whose font is not shipped (system stacks, Segoe UI) is measured with a
   declared stand-in and the 4% padding the visuals PRD sets. The layout report names the
   stand-in.
4. **Resolve colours ourselves.** Resolved tokens may be `color-mix(in srgb, …)`. A standalone
   SVG gets the mixed hex; `appearance: both` writes `var(--piq-…, <hex>)`.

## Consequences

- No browser, network, worker thread or randomness at render time; ELK runs in process with a
  fixed seed, so output is byte-identical.
- ELK's layout is generic; zoned and lanes are our own placement, ported from documentor.
  The plate and the deployment view are compared with the hand-made references before they
  replace anything (visuals PRD M6).
- Font tables add a few hundred kilobytes to the package and must be rebuilt when the tokens
  package changes its fonts; a test fails when a shipped font has no table.

## Alternatives

| Option | Why not |
|---|---|
| dagre | No compound-aware orthogonal routing; unmaintained |
| Graphviz (WASM) | No control of port sides; spline-first look |
| D2 | A Go binary; its best layout engine is proprietary |
| Mermaid as the renderer | Layout cannot be controlled and it needs a browser; kept as an output |
| fontkit at render time | Parses fonts in every process and complicates the browser build; the tables give the same widths |
| Character-width estimates | What `deploy.py` does; overflows with real fonts |
