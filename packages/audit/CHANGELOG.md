# @ux-builder/audit

## 0.1.2

### Patch Changes

- 41fa7d6: Audit the app's own markup inside the SDK's frame and patterns. Anything inside a `.piq-*` element was trusted as the SDK's, so in an app built on `AppShell`, `Page`, `Stack`, `Card` or a screen pattern, as the guidance says to build, hard-coded colours, fonts, radii, hand-drawn icons and native controls went unreported, and their contrast failures counted as the SDK's warnings. An element inside the SDK is now the app's when it, or its markup up to the SDK element, has an inline style or a class of its own, or when it is a control, picture or icon. Also: `patterns.css` bundled by Lightning CSS (Vite), which merges a selector list into one `:is()`, is no longer reported as the app restyling a widget.
- Updated dependencies [9f52368]
  - @ux-builder/ui@0.6.3

## 0.1.1

### Patch Changes

- 7bee056: Fix the favicon for a theme whose mark a bundler inlines as a `data:` URI (Vite does for files under 4 KB, as with `ux-builder-databricks`): `ThemeProvider` cut the URI at its first quote or bracket, so the tab showed no icon or a broken one. The audit now reads the URI whole too, and checks the favicon on the provider's element rather than a `data-theme` that the app's `index.html` puts on `<html>`, as the starter does.
- Updated dependencies [7bee056]
- Updated dependencies [4803047]
  - @ux-builder/ui@0.6.2
  - @ux-builder/tokens@1.6.0
