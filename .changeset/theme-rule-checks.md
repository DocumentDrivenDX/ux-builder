---
"@ux-builder/ui": minor
---

Ten of the proposed theme and colour rules get an automated check, a new `theme` kind of check that measures a theme's resolved tokens in each appearance: `color.red-reserved`, `theme.focus-ring`, `theme.small-text-floor`, `theme.contrast-margin`, `theme.text-tiers`, `theme.structure-accent-distinct`, `theme.surface-separation`, `theme.dark-appearance`, `theme.weights` and `theme.families-limited`. They stay proposed and keep their review check for what a theme's tokens cannot show; the token-level lint checks they were waiting for leave their planned checks. `npm run theme-rules` runs them on every theme, original and vk- alike, and reports what each one finds; what the themes did when the checks arrived is recorded in a baseline that can only shrink.
