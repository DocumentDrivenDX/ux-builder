---
"@ux-builder/create-app": minor
"@ux-builder/design": minor
---

Design first, the app last (FEAT-018 GDL-81). `npm create @ux-builder/app <dir>` without `--modality` now asks nothing and writes a design folder: the guide, its skill and state, a starting blueprint and HELIX's skill, with no app code. The modality is asked during the design; when the design is ready the guide asks for the theme, pointing to the theme builder when no released theme carries the brand, and `npm create @ux-builder/app . -- --theme <name>` builds the app in that folder from the recorded modality and the designed blueprint, keeping every design document. `--modality` still makes the app at once; the starter no longer prompts for modalities. `ux-builder-design status` says what a design folder's build needs, and the glossary explains *theme*.
