# __APP_NAME__

The design of __APP_NAME__, made with the ux-builder guided design loop.
There is no app yet.

```sh
npm install
npx ux-builder-design status   # where the design stands
```

In Claude Code, type `/ux-builder-design` to start or resume the design.
The work is in `docs/ux-builder/`: the design documents, and the plan of the
app's screens in `docs/ux-builder/blueprint/app.blueprint.json`.

When the design is ready, the guide builds the app here, on the theme you
choose then:

```sh
npm create @ux-builder/app@latest . -- --theme <name>
```
