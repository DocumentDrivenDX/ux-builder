---
"@ux-builder/tokens": minor
"@ux-builder/ui": minor
---

vk-synaptiq takes Atlas's look: neutral greys and Iron text in light; Blackwood, Shadow and Iron with Sky in dark; Lava
for errors; Sky primary fills, Arctic highlights and titles, and an Agave scale; wider spacing, pill controls, a
major-second type scale from a 20px body, 20px card corners and edgeless fields.

Four optional brand colour roles, each defaulting to what the SDK drew before, so other brands look the same:
color.primary-fill and color.on-primary-fill (the primary button and a chosen segment), color.highlight and
color.sequential; and page-header.title-fg, the page title's colour.

A "synaptiq" icon set: on a theme whose icon.set is "synaptiq" (vk-synaptiq), the shared names draw in the Synaptiq
brand's icons, filled in the text colour. Every icon of the brand library (581, brand/synaptiq/icons) draws by its
number, <Icon name="syn-60-031" />, in any theme; Icon loads the library on first use. @ux-builder/ui/icons/synaptiq
exports it for apps that want it in the bundle from the start.
