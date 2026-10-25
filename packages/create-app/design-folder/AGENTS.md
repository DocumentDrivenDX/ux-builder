# __APP_NAME__

This folder holds the design of __APP_NAME__. There is no app yet: it is
built here when the design is ready.

## Designing

Start the guided design loop: in Claude Code, type `/ux-builder-design`
(the skill is in `.claude/skills/ux-builder-design/`), or ask the agent to
design something. The guide opens with an overview of its steps, keeps its
state in `.ux-builder/design-state.json` and its work in
`docs/ux-builder/`; `npx ux-builder-design status` shows where it stands.

The guide asks, during the design, which modalities (responsive web, chat,
hybrid chat) and screen sizes the app is for. When the design is ready it
asks for the theme: one of the released themes, or one made from the
brand in the theme builder. Then it builds the app in this folder:

    npm create @ux-builder/app@latest . -- --theme <name>

The design documents, the blueprint and the design state stay where they
are; the folder becomes a React + Vite app on the AI-UI SDK, planned by
the designed blueprint.

The standing objective: design the minimum viable interaction that lets the
intended user accomplish the intended outcome successfully, confidently and
efficiently; prefer eliminating interactions to adding features.
