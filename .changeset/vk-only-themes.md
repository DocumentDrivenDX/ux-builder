---
"@ux-builder/tokens": major
"@ux-builder/ui": minor
---

On the vk/adjustments branch, only the vk- themes remain: vk-databricks, vk-plain, vk-praxis, vk-praxis-carbon, vk-praxis-fluentui, vk-praxis-material and vk-synaptiq. The original themes, vk-ux-builder-databricks, vk-praxis-v2-databricks, vk-img-8593-databricks and the brands only they used are removed; the SDK's defaults (wireframes, prototypes, create-app, lint, Storybook, the site) now name vk- themes. The vk- themes on a shared design system sit on vk- copies of it (vk-databricks, vk-material, vk-fluent, vk-carbon), so their shape and spacing can change without touching the shared ones. A theme's icon set now comes from its design system's icon.set token (manifest iconSet), so a renamed copy keeps its set.
