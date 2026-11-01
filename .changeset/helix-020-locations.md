---
"@ux-builder/ui": patch
---

`ux-builder-blueprint propose` fills every placeholder in HELIX 0.20's document locations (`{n}`, `{nn}`, `{feature}`, `{view}` as well as `{id}`, `{name}`, `{screen}`), so journey maps and wireframes get real file names and each view its own file; a location left with a placeholder is reported and not written. `finish` had written journey maps as `UJM-{n}-….md` and every wireframe to one path.
