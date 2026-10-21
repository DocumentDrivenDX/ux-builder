---
"@ux-builder/ui": patch
---

The interaction rules and the blueprint check agree with FEAT-008 (AR-2026-10-21, B1 to B7).

- `nav.compact-destinations` applies at the compact size class only, as the audit's check below 600 px does. An app that supports medium but not compact may have more than five destinations.
- A new rule, `view.states`: every screen of an embedded view declares its empty, loading and error states, whatever its pattern. In a view it reports instead of `screen.states`.
- `checkBlueprint` orders findings by path, then rule, in plain string order on every platform. It used locale order for the rule.
- CONTRACT-005 now lists the `getRecipe`, `rules`, `recipes` and `limits` exports. `CHECKS` and `nearestPattern` are internal.
