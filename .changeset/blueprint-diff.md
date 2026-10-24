---
"@ux-builder/ui": minor
---

`ux-builder-blueprint check --diff <base>` reports the complexity a change adds per journey (screens, steps, required inputs and decisions added and removed) and warns, with the new rule `simplicity.delta-decided`, when a journey grows with no recorded decision naming the addition. Journey steps may declare `inputs` (`required`, `inferable`), `decision` and `system`. `complexityDelta`, `deltaFindings`, `journeyLoad` and `stepKey` are exported from `@ux-builder/ui/blueprint`.
