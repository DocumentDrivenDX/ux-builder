---
"@ux-builder/ui": minor
"@ux-builder/mcp": minor
---

`ux-builder-blueprint` drafts and draws from a blueprint's flow and journeys (FEAT-012, US-089, US-090):

- `ux-builder-blueprint propose` writes HELIX proposals as patches in `helix-proposals/`, and applies nothing. It drafts each journey's story *Walkthrough*, a Mermaid *Screen Flow* in the solution design, the first journey's sequence diagram as architecture's *Data Flow*, `DESIGN.md`'s *Destinations by Size Class*, and *Journey Scenarios* in each story test plan. Where HELIX already says something else, there is no patch, and `report.md` shows both texts. It needs the `.helix.yml` marker (exit 2 without it). Review the patches, then `git apply` the ones you accept.
- `ux-builder-blueprint draw` writes the IA map, the flow and each journey as Mermaid (`.mmd`) and SVG, in `blueprint-drawings/`.
- `ux-builder-blueprint wireframes` renders each screen's pattern with placeholder content in the `plain` theme, at each supported size class, as HTML and PNG, in `blueprint-wireframes/`. PNGs need `playwright` and its Chromium.
- `@ux-builder/mcp`: the new `propose_from_blueprint` tool returns the same proposals and writes nothing.
