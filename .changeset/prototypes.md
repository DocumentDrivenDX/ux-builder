---
"@ux-builder/ui": minor
"@ux-builder/create-app": minor
---

`ux-builder-blueprint prototype --explore` writes a disposable, clickable prototype under `prototype/<name>/` (each screen, state and size class, with a prototype banner, a state and size switcher and every action linked), optionally once per `--design-system`; `--archive <name>` puts one away. The new lint rule `ux-builder/no-prototype-import` (on in the recommended config and in new apps) keeps app code from importing prototypes. Wireframes can render in any theme.
