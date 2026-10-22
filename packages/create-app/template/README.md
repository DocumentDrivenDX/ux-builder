# __APP_NAME__

A React app on the AI-UI SDK, theme `__THEME__`, for the modalities
__MODALITIES__ (`supports.modalities` in `app.blueprint.json`). It starts as
the empty shell for them: `src/App.jsx` frames it, with `src/Home.jsx` (the
responsive web app's Home screen) and `src/Assistant.jsx` (the conversation)
for the modalities that have them. There is no sample data; build your own
screens in it.

```sh
npm install
npm run dev     # http://localhost:5173
npm run check:blueprint  # the plan of the screens (app.blueprint.json) against the interaction rules
npm run lint    # no literal colours, fonts or radii; no other UI kits; no hand-drawn <svg>
npm run audit   # builds, then checks the running app in every theme (audit-report/index.html)
npm run build
```

`npm run audit` uses Playwright's Chromium: install it once with
`npx playwright install chromium`. It fails on an error; the report shows
each finding on a screenshot of the theme it was found in. CI
(`.github/workflows/ci.yml`) runs lint and the audit on every push.

- The theme, its fonts and the widgets' CSS are imported once in `src/main.jsx`.
- `ThemeProvider` sets the theme and appearance; the switcher (`src/ThemeSwitch.jsx`) shows
  every theme `@ux-builder/tokens` ships. To fix one theme, import only
  `@ux-builder/tokens/themes/<theme>.css` and `@ux-builder/tokens/fonts/<theme>.css`.
- Style your own markup with `--piq-*` role tokens (`src/App.css`).
- `app.blueprint.json` plans the app's destinations and screens; CI checks it
  with `ux-builder-blueprint check`. Add a screen there before building it.
- Coding agents: see `CLAUDE.md`; the SDK's skill is installed in
  `.claude/skills/ux-builder-ui` by `npm install`.
