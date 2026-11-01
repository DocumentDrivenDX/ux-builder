---
"@ux-builder/design": minor
"@ux-builder/ui": minor
"@ux-builder/audit": minor
---

A prototype ends every guided step (US-170, ADR-043). `ux-builder-design prototype --step` draws the current step's prototype in `docs/ux-builder/prototypes/step-<n>/`, assuming the modality, size classes, input types, frame, theme (`plain`) and appearance the person has not chosen yet and recording each as an assumption, instead of refusing. `--check` serves the prototype locally, runs the UI audit on every page (its own toolbar left out) and the deterministic heuristics, and writes `check-<round>.json`; from step 5 it asks for the journey walk too. Wireframes and exploratory prototypes take an appearance; the audit exports `serveFolder`; `resolveAppearance` takes the themes to resolve against.
