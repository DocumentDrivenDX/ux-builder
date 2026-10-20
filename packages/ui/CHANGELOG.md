# @ux-builder/ui

## 0.6.2

### Patch Changes

- 7bee056: Fix the favicon for a theme whose mark a bundler inlines as a `data:` URI (Vite does for files under 4 KB, as with `ux-builder-databricks`): `ThemeProvider` cut the URI at its first quote or bracket, so the tab showed no icon or a broken one. The audit now reads the URI whole too, and checks the favicon on the provider's element rather than a `data-theme` that the app's `index.html` puts on `<html>`, as the starter does.
- Updated dependencies [4803047]
  - @ux-builder/tokens@1.6.0

## 0.6.1

### Patch Changes

- 9e12240: Add the `ux-builder-databricks` theme: the `ux-builder` brand (made in the theme builder from the client's logo) on the databricks design system, light by default. Select it with `data-theme="ux-builder-databricks"`. `@ux-builder/ui`'s catalogue and agent guidance list it.
- Updated dependencies [9e12240]
  - @ux-builder/tokens@1.5.0
