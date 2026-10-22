# __APP_NAME__

This app is built on the AI-UI SDK (`@ux-builder/ui`, `@ux-builder/tokens`), theme
`__THEME__`. Before writing any UI, read `node_modules/@ux-builder/ui/AGENTS.md`
(also installed as the Claude Code skill `ux-builder-ui`). In short: use the
SDK's widgets, style with `--piq-*` role tokens, never hard-code colours,
fonts or radii, and run `npm run lint`, then `npm run audit` (the running app
in every theme; fix every error it reports).

## Modalities

__MODALITY_GUIDE__

The app starts as an empty shell for its modalities, with no sample data:
build your own screens in it.

## Screens

Plan screens before building them. The app's destinations and screens are
described in `app.blueprint.json`: add a screen there first, choosing its
pattern from the recipes in the guidance (or the MCP tool `list_recipes`),
and run `npm run check:blueprint` until it reports no errors. Then build each
screen from its pattern (`@ux-builder/ui/patterns`) inside a `Page`, within
the app's `AppShell`, and run lint and the audit.

__EPISODE_GUIDE__
