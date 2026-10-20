---
"@ux-builder/create-app": patch
---

Fix `npm create @ux-builder/app` doing nothing: run through npm's symlinked bin, the starter exited without writing the app or printing anything. It now scaffolds the app as documented.
