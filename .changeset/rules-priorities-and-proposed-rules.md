---
"@ux-builder/ui": minor
---

The interaction rules grow from 107 to 299. 192 proposed rules (marked `status: "proposed"`, reviewed until their planned checks are built) cover forms, input, text, trust and dark patterns, data display, search, media, notifications, AI and agents, the guided session, and the theme review's findings. Every rule now has a priority from P0 (Gate) to P6 (Refinement), and may name the rules it depends on and the rules it takes precedence over; `rules.json` describes the levels and the order that settles a clash, and the rules check fails a missing rule, a dependency cycle or a rule that takes precedence over a higher-priority one.
