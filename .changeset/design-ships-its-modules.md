---
"@ux-builder/design": patch
---

The package ships every module it imports. 1.1.0 left `scope.mjs`, `finish.mjs`, `batch.mjs` and `stepproto.mjs` out of the published files, so importing `@ux-builder/design` or running `ux-builder-design` failed with `ERR_MODULE_NOT_FOUND`. `npm run check` now packs each package and fails when a shipped module imports a file the package does not ship.
