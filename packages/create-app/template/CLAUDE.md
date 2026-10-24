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

## Designing

To design or redesign the app's experience with your agent, start the
guided design loop: in Claude Code, type `/ux-builder-design` (the skill is
in `.claude/skills/ux-builder-design/`), or ask the agent to design
something. The guide keeps its state in `.ux-builder/design-state.json` and
its documents in `docs/ux-builder/`; `npx ux-builder-design status` shows where it
stands. It works without the MCP server.

The standing objective: design the minimum viable interaction that lets the
intended user accomplish the intended outcome successfully, confidently and
efficiently; prefer eliminating interactions to adding features. Before
designing a requested feature, ask: what user goal does it support? Is it
necessary? Could an existing interaction reach the same goal? Could the
system do the task for the user? Would it increase cognitive load? Is there
a simpler interaction model? Every addition (a destination, screen, modal,
required input or step) needs a decision with five answers: goal, without,
simplest, assumptions and validation (`npx ux-builder-trace decide --kind
addition`).

## Screens

Plan screens before building them. The app's destinations and screens are
described in `docs/ux-builder/blueprint/app.blueprint.json`: add a screen there first, choosing its
pattern from the recipes in the guidance (or the MCP tool `list_recipes`),
and run `npm run check:blueprint` until it reports no errors. Then build each
screen from its pattern (`@ux-builder/ui/patterns`) inside a `Page`, within
the app's `AppShell`, and run lint and the audit.

__EPISODE_GUIDE__
