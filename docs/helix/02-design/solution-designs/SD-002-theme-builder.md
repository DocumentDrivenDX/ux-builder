---
ddx:
  id: SD-002
  type: solution-design
  status: draft
  links:
    - kind: informed_by
      to: FEAT-003
    - kind: informed_by
      to: ADR-014
    - kind: informed_by
      to: ADR-018
    - kind: informed_by
      to: ADR-019
    - kind: informed_by
      to: SD-001
    - kind: informed_by
      to: US-015
    - kind: informed_by
      to: US-016
    - kind: informed_by
      to: US-017
    - kind: informed_by
      to: US-018
    - kind: informed_by
      to: US-019
---

# SD-002: Theme builder

**Feature**: FEAT-003 — Guided brand builder
**Stories**: US-015 (core flow), US-016 to US-019
**Status**: Draft
**Depends on**: ADR-019 (accepted): runs locally, the OpenAI key on the developer's machine

## Summary

`apps/theme-builder` is a React 19 app on `@ux-builder/ui` with a small local
API, both served by one Node process (`npm run builder`). The palette engine
runs in the browser; the API only does what a browser must not: hold the
OpenAI key and write to the repository. It replaces the prototype
(`prototypes/theme-builder/`), whose flow it keeps.

## Architecture

```
apps/theme-builder/
  server.mjs           Node: Vite in middleware mode + the API below
  api/
    context.mjs        GET  /api/context   shared design systems, existing names, model availability
    theme.mjs          GET  /api/theme     one saved theme, composed from tokens/ (US-020)
    feedback.mjs       POST /api/feedback  feedback -> setting changes + explanation (OpenAI, or mock)
    save.mjs           POST /api/save      brand + theme files, branch, commit, PR
    artwork.mjs        frames an uploaded logo to its drawn bounds for save (US-019-AC5)
    key.mjs            the OpenAI key, server only (ADR-019)
  src/
    App.jsx            the six steps and session state
    steps/             Upload, Palettes, Systems, Compare, Save, Use; ViewToggle (light/dark)
    preview/Preview.jsx  one option on one design system, on real widgets
    preview/Screens.jsx  the screen patterns in a preview cell (AppShell adapt="container")
    preview/compose.js option brand x design system -> resolved custom properties
    model.js, theme.js the builder's copy and its own theme (ux-builder-databricks)
    Themes.jsx         "Your themes" (US-020)
    themepage/         one page per theme: tokens, widgets, bridges (US-020)
    home/, microsite/  the public site's home page and section pages
  test/                API unit tests and story tests (node:test)
  e2e/builder/         Playwright: the core flow (US-015) and each step
  e2e/client/          Playwright: a client app on a saved theme
```

| Concern | Where | How |
|---------|-------|-----|
| Logo analysis, options, fitting, regeneration | Browser | `@ux-builder/engine/browser` (SD-001), with the shared design systems from `/api/context` |
| Previews | Browser | `composeOn` + `resolveAll` from `compose-core.mjs` give each cell its resolved tokens; `<ThemeProvider tokens>` sets them on the cell, so `ui.css` styles real widgets; `Icon set={designSystem}`; `@ux-builder/tokens/fonts.css` |
| Feedback | Server | OpenAI via `openai` (chat completions, forced function call), key from `OPENAI_API_KEY` or Keychain `openai-api-key` |
| Saving | Server | Validates, writes files under `BUILDER_ROOT` (the repo), then `git` + `gh` |

## Steps

The prototype (`prototypes/theme-builder/`, approved by the operator) was the
starting specification for the screens: same six steps, copy and layout. It is
superseded: the stories (US-015..US-020) and this design now govern the builder. The operator
kept three additions on 2026-10-06: the settings sliders, opening a pull
request on save, and flagged colour moves. Round history, side-by-side
pinning and a full-size view were removed.

The builder itself wears one of the SDK's own themes, `ux-builder-databricks`
(operator, 2026-10-19; `praxis-v2-databricks`, and `synaptiq`, before), with the SDK's AppearanceSwitch in
the header: light, auto and dark as icons (auto follows the system setting;
the choice is remembered in the browser). Operator, 2026-10-06.

"Your themes" is a view of its own (`?view=themes`), shown in place of the
steps, which stay mounted so nothing done in them is lost; Back to the
builder returns to them. It lists every theme, each a link to its own page,
`?theme=<name>` (US-020-AC5 to AC9). The page wears the theme, with its own
appearance switch, and a menu on the left: its brand (logos, mark, favicon,
palette), its CSS for light, dark and auto, and every widget and screen
pattern in the SDK's catalogue. Each of those renders from the SDK's own
Storybook story (the builder imports the story files; it resolves
`@ux-builder/ui` to the package's source so the stories and the page share one
copy of each component), with a link to that story in Storybook, in the
same theme and appearance (`STORYBOOK_URL`, default
`http://localhost:6006`). Storybook offers every built theme in each of its
appearances; a theme saved since the last build has a page but not yet a
Storybook theme.

The theme pages are also published, static, on GitHub Pages
(`themes/?theme=<name>`, `tools/build-pages.mjs`): the same front end built
with `VITE_STATIC`, reading each theme's `GET /api/theme` answer and the theme
list from files written at build time, with its Storybook links going to the
Storybook published beside it. In place of the builder's steps, which need
the local server (ADR-019), that build shows the list of themes: only those
whose theme file says `"public": true`, with a box to open any other by name. It keeps
component names when minifying, since stories are matched to widgets by name.

1. **Upload logo**: two columns. Drop or choose an SVG/PNG, or "Use the
   sample logo"; optional dark-background version; Replace. The brand colours
   found are listed as chips with an everyday name and their share
   ("Navy · 94%"). An SVG is measured by drawn area (drawn as an `<img>` onto
   a canvas, so no script runs; `analysePixels`); a PNG by its pixels.
   "Suggest palettes".
2. **Pick palettes**: the engine's options as cards (name, AA badge, swatch
   strip, one-line note, flagged moves, a light + dark preview on neutral
   widgets), multi-select with "Add to compare". Light + dark / Light / Dark
   toggle, round number, count. **Feedback lives here**; a new round says
   what changed and that selections carried over. The settings sliders sit
   under the feedback box.
3. **Pick design systems**: a card per shared design system showing the
   first chosen palette in that system, with its blurb, icon set and fonts.
   "Compare N combinations".
4. **Compare**: the chosen palettes × the chosen systems, each cell in light
   and dark on that system's real widgets and icons; "Choose this theme";
   a sticky footer with the chosen theme and "Save this theme".
5. **Save theme**: light and dark previews; the theme name prefilled as
   `<brand>-<design system>`; a summary (palette and brand, design system,
   icons, fonts, appearances, contrast). Saving stores the palette as brand
   `<brand>` and the theme as `<brand>-<design system>`, and opens a pull
   request.
6. **Use in your app**: framework tabs (React + Vite, Next.js, plain HTML);
   eight tasks to tick off (nine with a chat library), each with why, file names and copyable code
   filled in for this theme; progress; the theme's preview; files you'll
   touch; a prompt to paste into Claude Code.

## Session state and history

A round is `{ settings, options, explanation }`; the screen shows the current
round's number. Selections carry over to the next round by strategy. The
session is lost on reload.

## Feedback (ADR-014, US-018)

`POST /api/feedback { feedback, settings, options: [{ label, strategy,
light: { structure, accent, ground }, dark: {…} }] }`

The server asks the model to call one function, `adjust_settings`, whose input
schema is SD-001's `settingsSchema` with every property optional, plus a
required `explanation` (one sentence, plain language). It returns `{ changes,
explanation, clamped }` after `normalise()` validates and clamps the
changes; unknown keys are dropped and reported. The browser merges the
changes into the current settings and regenerates. The logo never leaves the
browser (US-018-AC6).

- Model: `gpt-5.4-mini` (overridable with `BUILDER_MODEL`); 15 of 15 regression phrases move the expected setting (`npm run test:model`, 2026-10-06).
  `BUILDER_MODEL=mock` uses deterministic phrase rules, for tests and
  offline use.
- No key or an error: `/api/context` reports `model: false`; the feedback
  box is disabled with the reason, and the settings panel still works
  (US-018-AC5).

## Saving (US-019, ADR-019)

`POST /api/save { name, designSystem, option, logo: { filename, base64,
frame? }, darkLogo?, mark? }`

`mark` (*[Added 2026-10-07]*) has the same shape; it is framed to a square
around its drawing (an SVG's `viewBox`; a PNG cropped square by the browser),
stored as `brand/<brand>/mark.<ext>`, and set as the brand's `mark-image`
and `favicon` in every appearance.

`frame` is `{ bounds: { x, y, w, h } }`, where the logo draws as fractions
of the image, measured in the browser on a canvas (the SVG drawn as an
`<img>`) when the logo loads; a PNG with margins also carries
`frame.base64`, the browser's crop at full size (*[Added 2026-10-07]*).

1. Validate the theme name (CONTRACT-002 pattern); derive the brand name by
   dropping a `-<design system>` suffix; refuse a theme or brand name already
   in use (US-019-AC1).
2. Write the logo to `brand/<name>/<filename>`, the brand file to
   `tokens/brands/<name>.brand.json` (the option's palette, its generation
   block with the logo's path and hash, `logo-image` pointing at the
   artwork) and `tokens/themes/<name>.theme.json`; validate both with the
   build's own `load()` before anything is committed. When the drawing
   has margins, `logo-image` points at a framed copy
   (`brand/<name>/logo-framed.<ext>`: an SVG's root `viewBox`, `width` and
   `height` set to the bounds plus 2%, its artwork unchanged; a PNG's
   checked crop) and `logo-aspect` is set; the upload stays as the
   generation source. A dark-background logo is stored framed. A changeset
   (`.changeset/theme-<name>.md`: `@ux-builder/tokens` minor, `@ux-builder/ui`
   patch for the catalogue) is written with them (*[Added 2026-10-07]*).
3. `BUILDER_REVIEW=pr` (default): `git switch -c theme/<name>`, commit,
   push, `gh pr create` with a body listing the files, the strategy, the
   flagged moves and how to preview (`npm run gallery -- --brand <name>`).
   `BUILDER_REVIEW=files`: stop after writing (tests, or a developer who
   commits by hand).
4. Return the files, the branch and the PR URL.

## Your themes (US-020) *[Added 2026-10-07]*

`GET /api/theme?name=<theme>` composes the theme from `tokens/` on each
request (`load()` and `resolvedJson()`, as the build does), so a theme saved
since start previews. Per appearance it returns the resolved `--piq-*`
tokens without `url()` values, the brand's colour and state roles, and its
logo, mark and favicon as `data:` URLs read from under `brand/`. The panel
draws each appearance in a `ThemeProvider` given those tokens, with the
preview's widgets (`Specimen`) in the theme's icon set.

## The site's Reference and Proof pages *[Added 2026-10-21]*

The public site (`src/microsite/`, built by `tools/build-pages.mjs`)
follows HELIX's `product-microsite-ia`: Reference is exact lookup and Proof
is the project's own record, and both are generated from the repository
when the site is built or served, so they cannot drift from what ships.
Browser-readable sources come through `src/microsite/sources.js`; anything
only Node can read comes through `apps/theme-builder/microsite-data.mjs`,
which `vite.shared.mjs` serves as the virtual module
`virtual:microsite-data`.

| Page (`?p=`) | Generated from |
|------|----------------|
| `reference/packages` | Each public package's `package.json` `exports` and `bin`, with a one-line note per entry point (`NOTES`) |
| `reference/components`, `screen-patterns`, `ai-components` | The catalogue and the vendored AI components list |
| `reference/cli` | `create-app`'s and `ux-builder-audit`'s header and `parseArgs` options; the audit's `RULES`; `assess`'s header and `--help`; `ux-builder-blueprint --help`; every MCP tool from `createServer` listed over an in-memory MCP client |
| `reference/rules` | The catalogue's `interaction.rules`, filterable by family, AI role and check kind |
| `reference/adaptive-cards` | CONTRACT-004 *Adaptive Cards* (element mapping, high-impact marker), checked against the renderer's `ELEMENTS` and `ACTIONS`; a live `AdaptiveCard` |
| `proof/decisions`, `features`, `releases` | The ADRs, feature specs, contracts and changelogs |
| `proof/traceability` | `tools/check-coverage.mjs` `coverage()`: counts, by feature and story, the excepted criteria with reasons; the alignment reviews |
| `proof/sources` | Every distinct source the rules cite with its licence (`LICENCES` says what each allows); ADR-025's *Amendment* (counsel's review waived for release, bead `ux-builder-78483e2c`); the disclaimer from `AGENTS.md` |
| `proof/live` | Links to the theme pages and Storybook |

`test/microsite-data.test.mjs` fails when an option, command, MCP tool,
export, licence or card element is missing from the generated data;
`e2e/builder/microsite-reference.spec.mjs` visits the pages and checks
their counts against the source.

## Public site: Why, Start, Concepts and home *[Added 2026-10-21]*

The site (`src/home/`, `src/microsite/`, HELIX concern
`product-microsite-ia`) is brought up to what ui 0.7.0, audit 0.2.0, mcp
0.4.0 and create-app 0.5.0 ship (FEAT-007 to FEAT-012). Reference and Proof
are planned separately.

| Section | Page (`?p=`) | Says |
|---------|--------------|------|
| Why | `why/problem` | Six ideas (adds plan, check, assess); what it is not: not an AI runtime or model provider, though it ships `@ux-builder/ui/assistant` and `@ux-builder/ui/adaptive-cards` with adapters; not proof of usability |
| Why | `why/audience` | Adds app owners and UX reviewers (the assessment) |
| Why | `why/roadmap` | Now: FEAT-001 to FEAT-012 except FEAT-005. Next and Later are generated at build time from `.ddx/beads.jsonl` (`roadmap.js`): Next is open build items outside FEAT-005 and the site; Later is the FEAT-005 epic's open items |
| Start | `start/new-app` | Adds HELIX: what the starter installs and drafts, the docs-first order of work, `ux-assessment.yml`, `e2e/starter.spec.js`, `--helix-version`, `--helix-offline`, `--no-helix` |
| Start | `start/assess` (new) | The manifest, `assess init`/`validate`, the `ux-builder-assess` skill's stages, walkthroughs, the normal, error-prone and risky scenarios and never-approve, the report; the theme builder's own `ux-assessment.yml` as the example |
| Start | `start/microsoft-agents` (new) | Adaptive Cards from Copilot, Teams and Bot Framework agents in the app's theme; the high-impact marker; `checkCard` and MCP `check_card`, run live on a draft card; what is not supported |
| Start | `start/agents`, `start/ci` | The MCP tools for blueprints, cards and the assessment; the audit's AI checks and `ai-neutral-voice` |
| Concepts | `concepts/generative-ui` | Three routes: the SDK's own assistant (live Conversation), bridges for AI Elements and assistant-ui, embedded views |
| Concepts | `concepts/ai-agent-experience` (new) | AI roles per screen, rule families (counted from the catalogue), the `data-piq-ai` markers, approvals, hybrid chat; live Conversation, ApprovalCard, inline Wizard and AdaptiveCard |
| Concepts | `concepts/flows-journeys` (new) | Tree to graph, the flow and journey checks (live on a sample), propose into HELIX as patches, draw and wireframes |
| Home | — | Hero counts from the catalogue; the AI section shows the SDK's assistant with an Adaptive Card (AI Elements behind a switch); a fourth guard (the AI checks); a Plan, check, build, assess strip linking the pages above; the footer names Apple, Google and Microsoft as not affiliated |

The live demos (`microsite/demos.jsx`) import the SDK's components from
source, with the stories' sample data. The flow SVG and two wireframes come
from `microsite/diagrams/review.blueprint.json` by the blueprint's own `draw`
and `wireframes` code (`tools/gen-site-diagrams.mjs`), checked in; the test
`tools/__tests__/built/site-diagrams.test.mjs` regenerates them and fails if
they differ. Every page that cites a guideline carries one affiliation
paragraph naming Apple, Google (including PAIR) and Microsoft. The builder's
e2e `e2e/builder/microsite.spec.mjs` visits the new pages and runs the demos.

## Security

- The API listens on `127.0.0.1` only.
- The key is read server-side and never serialised to a response.
- Uploaded SVGs are drawn only as `<img>` and parsed by the engine as text
  (SD-001 D5); the stored copy is the uploaded bytes.
- `name` is validated before it is used in any path or git command; git and
  gh are run with argument arrays, never a shell string.

## Testing

| Layer | What | Where |
|-------|------|-------|
| API unit | feedback: tool output validated, clamped, unknown keys dropped, explanation returned, model down -> clear error; save: name rules, uniqueness, schema-valid files, files mode writes nothing else | `apps/theme-builder/test/` |
| Component | a cell renders the widgets with the composed tokens; the integration step's exact strings | same, happy-dom |
| E2E (US-015) | upload `navy-wordmark.svg`, tick Carbon and Fluent, switch dark, feedback "more conservative" (mock model), choose, save (files mode, temporary copy of the repo), integration step | `apps/theme-builder/e2e/`, Playwright |
| Live model (on demand) | 15 phrases map to the expected setting direction | `npm run test:model`, needs a key |

## Deviations to note

- BB-14 asks for a gallery in the review. The PR links the command and CI's
  gallery artifact rather than committing a generated HTML file.
