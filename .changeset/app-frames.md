---
"@ux-builder/ui": minor
"@ux-builder/design": minor
"@ux-builder/create-app": minor
"@ux-builder/audit": minor
---

The app frame is the person's choice (US-162, ADR-041). AppShell takes `frame`: `screen` (the content alone), `top-bar` (no navigation), `top-nav` (destinations across the top, a bottom bar on phones) or `side-nav` (the default). The blueprint records it in `supports.frame` and `check` warns when it no longer fits the destinations; wireframes, prototypes and the built app are drawn in it; `ux-builder-design modality` asks for it with the modality and recommends one from the destinations; the audit judges it by outcome.
