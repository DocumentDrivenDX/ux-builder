---
"@ux-builder/audit": patch
---

Audit the app's own markup inside the SDK's frame and patterns. Anything inside a `.piq-*` element was trusted as the SDK's, so in an app built on `AppShell`, `Page`, `Stack`, `Card` or a screen pattern, as the guidance says to build, hard-coded colours, fonts, radii, hand-drawn icons and native controls went unreported, and their contrast failures counted as the SDK's warnings. An element inside the SDK is now the app's when it, or its markup up to the SDK element, has an inline style or a class of its own, or when it is a control, picture or icon. Also: `patterns.css` bundled by Lightning CSS (Vite), which merges a selector list into one `:is()`, is no longer reported as the app restyling a widget.
