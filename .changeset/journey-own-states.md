---
"@ux-builder/ui": patch
---

A journey step may name a state of the screen's own (such as `already-used`), as long as the screen declares it; the blueprint check now understands `anyOf` in its schema, so a badly named state (not lowercase with dashes) is refused instead of passing unchecked. Found in VIP List session 3.
