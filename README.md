# ux-builder

**Turn a logo into a theme, and build apps that can't drift from it.**

ux-builder is an open-source UI SDK for AI-era apps. It holds a product's
whole look (its theme tokens, widgets, fonts, icons and brand artwork) in one
place. It also gives people and AI coding agents the tools to build apps that
never hard-code presentation:

- **Themes made from a brand.** A palette engine reads a logo and proposes
  palettes that already pass contrast. A local theme builder pairs a palette
  with a design system (Material 3, Fluent 2, Carbon, Databricks, or one of
  its own) and saves the result as a reviewable pull request.
- **Widgets that follow the theme.** React 19 components, plus framework-free
  CSS, cover forms, choices, tables, menus, tabs, sheets, notices, loading
  states, icons, the logo and the favicon. Every one is styled only through
  `--piq-*` role tokens.
- **Screen patterns.** An app shell, navigation, collection lists, record
  views, forms, wizards, grids, dashboards, reports and settings pages, built
  on layout primitives. They carry every state (empty, error, loading) and
  adapt to the width they are given, from a desktop window to a phone or a
  narrow embedded panel. Each design system picks its own conventions at a
  few variant points (navigation, page header, tabs, table).
- **Guardrails.** ESLint and Stylelint rules catch literal colours, fonts and
  radii. An audit drives the running app through every theme in light and dark
  and reports anything that isn't the theme's.
- **Built for coding agents.** Agent guidance (`AGENTS.md`) and a Claude Code
  skill are generated from the source, and an MCP server describes the SDK
  version an app actually has installed.
- **Generative UI bridges.** A bridge stylesheet per theme maps the theme onto
  shadcn/ui's variables, so AI Elements and assistant-ui chat components wear
  the app's theme and switch with it.
- **Licences checked.** Every third-party licence the packages depend on or
  ship is checked before release, and nothing the SDK ships reports usage.

The [project site](https://documentdrivendx.github.io/ux-builder/) wears the
`ux-builder-databricks` theme. It has a page for each theme
(`themes/?theme=<name>`: its logos, palette and CSS, and every widget, AI
component and screen pattern in it) and every widget in
[Storybook](https://documentdrivendx.github.io/ux-builder/storybook/). The
[theme list](https://documentdrivendx.github.io/ux-builder/themes/) links only
public themes; any other opens by its name. The site is rebuilt from `main` by
`.github/workflows/pages.yml`.

## Packages

| Package | Install as | What it gives an app |
|---|---|---|
| [`@ux-builder/tokens`](packages/tokens) | dependency | The themes as CSS, every token's value as JSON, the fonts, brand artwork, generative UI bridges |
| [`@ux-builder/ui`](packages/ui) | dependency | Widgets (React 19 and CSS), patterns, `ThemeProvider`, icons, `Logo`, favicon, lint rules, agent guidance |
| [`@ux-builder/create-app`](packages/create-app) | `npm create` | A new React + Vite app already on the SDK, with lint, the audit and CI |
| [`@ux-builder/audit`](packages/audit) | devDependency | `ux-builder-audit`: checks the running app in every theme and appearance |
| [`@ux-builder/mcp`](packages/mcp) | `npx` | The SDK for AI coding agents over MCP |

`@ux-builder/engine` (the palette engine) and the theme builder app are
private to this repository and are used to make new themes.

The packages are on the public npm registry. Installing them needs no token
and no registry configuration.

### Using each package

**`@ux-builder/tokens`: the themes.** Import one theme's CSS and fonts, then
select the theme on `<html>`:

```sh
npm install @ux-builder/tokens
```

```js
import "@ux-builder/tokens/themes/synaptiq.css";   // or themes.css for every theme
import "@ux-builder/tokens/fonts/synaptiq.css";    // or fonts.css
```

```html
<html data-theme="synaptiq" data-appearance="dark">
```

Style your own markup with the role tokens (`var(--piq-color-text)`,
`var(--piq-space-4)`). `resolved/<theme>.<appearance>.json` has every token's
final value, for code that can't read CSS, and `manifest.json` lists the
themes. See the [`tokens` README](packages/tokens/README.md).

**`@ux-builder/ui`: the widgets.** Install it beside the tokens, load its CSS
after the theme's, and wrap the app in `ThemeProvider`:

```sh
npm install @ux-builder/tokens @ux-builder/ui
```

```jsx
import "@ux-builder/tokens/themes/synaptiq.css";
import "@ux-builder/ui/ui.css";
import { Button, Logo, ThemeProvider } from "@ux-builder/ui";

<ThemeProvider theme="synaptiq" appearance="system">
  <Logo /> <Button variant="primary">Save</Button>
</ThemeProvider>
```

It also exports the patterns (`@ux-builder/ui/patterns`), icons
(`@ux-builder/ui/icons`), the ESLint and Stylelint rules, `catalogue.json`
and `AGENTS.md`. See the [`ui` README](packages/ui/README.md) and the
[Quick start](#quick-start).

**`@ux-builder/create-app`: a new app.** It scaffolds a React + Vite app that
is already on the SDK, with lint, the audit and CI:

```sh
npm create @ux-builder/app my-app -- --theme synaptiq   # --name sets the package name
```

See the [`create-app` README](packages/create-app/README.md).

**`@ux-builder/audit`: check the running app.** It switches the app through
every theme and appearance in Chromium, reports anything that isn't the
theme's, and exits 1 on an error:

```sh
npm install -D @ux-builder/audit
npx playwright install chromium   # once per machine
npx ux-builder-audit --serve "npm run preview -- --port 4173" http://localhost:4173/
```

You can also call it from code as `audit()` from `@ux-builder/audit`. See the
[`audit` README](packages/audit/README.md) for every option.

**`@ux-builder/mcp`: the SDK for AI coding agents.** An MCP server over stdio
that answers from the SDK version installed beside it: themes, widgets and
their props, tokens, icons and guidance.

```sh
claude mcp add ux-builder -- npx @ux-builder/mcp   # any MCP client: npx @ux-builder/mcp
```

See the [`mcp` README](packages/mcp/README.md).

The surface an app may rely on is specified in
[CONTRACT-004](docs/helix/02-design/contracts/CONTRACT-004-app-integration.md).
That covers entry points, props, the theme switch event, lint rules, audit
options and compatibility.

The screen patterns (`@ux-builder/ui/patterns`), layout and variant tokens are
built in this repository and ship in the first `@ux-builder/ui` release after
0.6.0, with the matching `@ux-builder/tokens` release (CONTRACT-004). Token names are specified in CONTRACT-001 and theme
selection in CONTRACT-003.

## Quick start

Node 20 or later, React 19.

**A new app:**

```sh
npm create @ux-builder/app my-app -- --theme databricks
cd my-app && npm install && npm run dev
```

The starter comes with:

- the theme's CSS and fonts;
- `ThemeProvider` with a theme and appearance switcher, plus the theme's logo
  and favicon;
- a page built only from SDK widgets;
- `npm run lint` and `npm run audit`, and a CI workflow that runs both;
- `CLAUDE.md`/`AGENTS.md` pointing at the SDK's guidance.

Without `--theme`, the app starts on `plain`.

**An existing React app:**

```sh
npm install @ux-builder/tokens @ux-builder/ui
npm install -D @ux-builder/audit eslint stylelint
```

```js
// At the entry point, once, before the app's own CSS:
import "@ux-builder/tokens/themes/databricks.css";   // or themes.css for every theme
import "@ux-builder/tokens/fonts/databricks.css";    // or fonts.css
import "@ux-builder/ui/ui.css";                      // always after the theme CSS
import "@ux-builder/ui/patterns.css";                // after ui.css, if you use the screen patterns
```

```jsx
import { ThemeProvider, ToastProvider } from "@ux-builder/ui";

<ThemeProvider theme="databricks" appearance="system" onChange={({ theme, appearance }) => save(theme, appearance)}>
  <ToastProvider><App /></ToastProvider>
</ThemeProvider>
```

The provider does not remember the user's choice. Store what `onChange`
gives you and pass it back as `theme` and `appearance`. `useTheme()` reads and
switches the theme anywhere below the provider.

**Without React,** the CSS works on its own markup. Set `data-theme` (and
optionally `data-appearance`) on `<html>`, and use the `.piq-*` class names
each component renders (see `catalogue.json` and Storybook).

**With a chat library** (AI Elements or assistant-ui), also import the theme's
bridge: `import "@ux-builder/tokens/bridges/shadcn/databricks.css";`. It follows
`data-theme` and `data-appearance`, with no `.dark` class.

**In an embedded view,** where a host hands the view a theme's resolved values
(ADR-011), pass them as `<ThemeProvider tokens={resolved.tokens}>`. No theme
stylesheet is needed.

## Themes

A **theme** is what an app selects (ADR-018). It is a **brand** (colours,
logo, fonts) on a **design system** (type, shape, elevation, every widget's
metrics).

| Theme | Brand | Design system | Appearances (default first) |
|---|---|---|---|
| `plain` | none: the control theme, system faces | own | light |
| `databricks` | Databricks | shared `databricks` | light, dark |
| `praxis` | Praxis | own: near-square controls, serif headings, rules over shadows | dark, light |
| `praxis-material` | Praxis | shared `material` | dark, light |
| `praxis-fluentui` | Praxis | shared `fluent` | dark, light |
| `praxis-carbon` | Praxis | shared `carbon` | dark, light |
| `praxis-v2-databricks` | Praxis V2, made in the theme builder | shared `databricks` | light, dark |
| `ux-builder-databricks` | UX Builder, made in the theme builder; the builder wears it | shared `databricks` | light, dark |
| `synaptiq` | Synaptiq | own: slab headings, Quicksand body, 3px corners, filled fields | light, dark |

| Shared design system | What it looks like |
|---|---|
| `material` | Material Design 3: Roboto, fully rounded 40dp buttons, 12dp cards, filled fields |
| `fluent` | Fluent 2: Segoe UI, 4px corners, 32px controls, outlined fields with a brand underline |
| `carbon` | Carbon v11: IBM Plex, square 48px buttons and tiles, bottom-ruled fields |
| `databricks` | Databricks AppKit UI: DM Sans and DM Mono, 36px controls at 8px radius |

Without a provider, select a theme with attributes:

```html
<html data-theme="praxis-carbon" data-appearance="light">
```

**Fonts ship with the SDK** (ADR-017). Roboto, IBM Plex, DM Sans and Mono,
Abril Fatface, Zilla Slab and Quicksand are bundled under OFL-1.1.
`fonts/<theme>.css` loads one theme's faces and `fonts.css` loads all of them.

### Adding a theme

Add `tokens/themes/<name>.theme.json` naming a brand and either a shared
`"designSystem"` or an inline `anatomy`. To add a brand, add
`tokens/brands/<name>.brand.json`. No code changes are needed. `npm run check`
composes the new files with everything else and fails on a schema error, an
unresolved reference or a contrast failure (every text role must clear 4.5:1).

Themes are unlisted on the project site unless the theme file says
`"public": true`. An unlisted theme's page still opens for anyone who enters
its name, and it still ships in `@ux-builder/tokens`, so unlisted is not
secret.

You can also generate a brand from a logo:

```sh
npm run brand -- logo.svg                                  # list palette options
npm run brand -- logo.svg --out tokens/brands/acme.brand.json --strategy muted --title "Acme" --design-system databricks
npm run gallery -- --brand tokens/brands/acme.brand.json   # preview on every design system
```

Or use the guided builder with `npm run builder`
(http://127.0.0.1:5180). It walks through six steps: upload a logo, pick
palettes, pick design systems, compare them on real widgets and screen
patterns in light and dark, save, and follow the steps to use the theme in an
app, including the chat library, if any. Each theme also has a page showing
its widgets, patterns and the AI components it dresses. Saving writes the brand
and theme files on a branch and opens a pull request with `gh`. Typed feedback
("more conservative, less orange") goes to an OpenAI model that turns it into
engine settings only (ADR-014). It reads `OPENAI_API_KEY`, and without a key
the sliders still work.

## Building the UI

Six rules, the same ones AI agents are given:

1. Use the SDK's widgets for buttons, fields, choices, tables, menus, tabs,
   breadcrumbs, sheets, notices, status pills, toasts, loaders, icons and the
   logo. Never build your own or bring another UI kit.
2. Style your own markup with `--piq-*` role tokens (`var(--piq-color-text)`,
   `var(--piq-space-4)`), chosen by role.
3. Never hard-code a colour, font family or radius, even one that matches the
   theme today.
4. Run lint and the audit, and fix what they report.
5. Select themes with `ThemeProvider` or `data-theme`. Never restyle per theme
   in app code.
6. Compose screens from `@ux-builder/ui/patterns` before writing any layout
   CSS: `AppShell` for the frame, with each screen inside a `Page`, which
   gives it the page gutter and width (`AppShell`'s content area and the
   screen patterns have none of their own; `ErrorScreen` excepted); the screen
   patterns (`CollectionList`, `RecordDetail`, `FormPage`, `Dashboard`,
   `SettingsPage` and others); and the layout primitives (`Stack`, `Cluster`,
   `Grid`, `Page`, `SplitView`) for the rest. Fill their slots; never fork or
   restyle a pattern.

Every component and prop is in `@ux-builder/ui/catalogue.json` and the
[`ui` README](packages/ui/README.md). `npm run storybook` shows each widget and
pattern in every theme.

### Lint

```js
// eslint.config.js
import uxBuilder from "@ux-builder/ui/eslint";
export default [{
  files: ["src/**/*.{js,jsx}"],
  plugins: { "ux-builder": uxBuilder },
  rules: {
    "ux-builder/no-hard-coded-values": ["error", { theme: "databricks" }],
    "ux-builder/no-foreign-ui": "error",
    "ux-builder/no-inline-svg": "error",
    "ux-builder/ai-neutral-voice": "warn",
  },
}];
```

```json
// .stylelintrc.json
{ "plugins": ["@ux-builder/ui/stylelint"],
  "rules": { "ux-builder/no-hard-coded-values": [true, { "theme": "databricks" }] } }
```

### Audit

```sh
npx playwright install chromium
npx ux-builder-audit --serve "npm run preview -- --port 4173" http://localhost:4173/ /settings
```

The audit switches the running app through every theme it loads, in light and
dark. It reports colours, fonts and radii that aren't the theme's,
hand-drawn icons and loaders, other UI kits, a favicon that doesn't follow the
theme, and text contrast. With `--width` (one per size class, for example
`--width 360 --width 1366`) it also checks reflow, target size and focus that
is hidden behind sticky content. It checks the interaction rules too: one
modal at a time, that a modal has a name, a way out and closes on Escape, one
primary button per region, navigation that suits the width, and readable line
lengths; each finding names its rule and sources. It writes `audit-report/index.html` with screenshots
and `audit-report/report.json`, and exits 1 on an error. See
[`packages/audit`](packages/audit/README.md) for the options.

### Interaction and screen rules

How an app's screens fit together and behave: navigation for the space
available, modals, safeguards on destructive actions, empty, loading and
error states, one primary action. The rules restate Apple's Human Interface
Guidelines, Material Design 3, WCAG 2.2 and the WAI-ARIA Authoring Practices
in ux-builder's own words, each with an ID and a link to its sources
(`guidelines/rules.json`). They apply by size class, input (touch or
pointer) and context (a whole app, or a view embedded in a host), never by
device.

An app describes its destinations and screens in `app.blueprint.json`, and
`ux-builder-blueprint check` (from `@ux-builder/ui`) checks the plan against
the rules before any screen is built. The audit checks the running app
against the same rules by ID. The loop, for a person or an agent: **plan**
the blueprint from the recipes, **check** it, **build** each screen from its
pattern, then **lint** and **audit**.

**A new app** starts with a blueprint, a `check:blueprint` script and a CI
step. Pass your own plan with
`npm create @ux-builder/app my-app -- --blueprint plan.json`; one with an
error is refused before anything is written.

**An existing app** adopts the rules in three steps:

```sh
npx ux-builder-blueprint init                     # writes app.blueprint.json: describe your screens
npx ux-builder-blueprint check app.blueprint.json # exits 1 on an error; add it to CI
npx ux-builder-audit --write-baseline audit-baseline.json http://localhost:4173/   # once
npx ux-builder-audit --baseline audit-baseline.json http://localhost:4173/         # in CI: only new findings count
```

Agents get the rules where they plan, over MCP: `get_rules`,
`list_recipes`, `get_recipe`, `get_blueprint_schema` and `check_blueprint`.

#### Flows, journeys and what they draft

A blueprint's screens can declare `actions` (where each leads), and its
`journeys` tie a HELIX story and its criteria to a path through them
(CONTRACT-005 *Flows and journeys*). From those, three commands draft and
draw; each reads `app.blueprint.json` unless given a file:

```sh
npx ux-builder-blueprint propose      # HELIX proposals as patches, in helix-proposals/; applies nothing
npx ux-builder-blueprint draw         # IA map, flow, journey and per-screen state diagrams: .mmd, .svg (and states-*.md), in blueprint-drawings/
npx ux-builder-blueprint wireframes   # each screen in each declared state at each size class: .html and .png, in blueprint-wireframes/
```

- **`propose`** needs the `.helix.yml` marker above the blueprint (exit 2
  without it). It reads the flow's documents and the installed HELIX's
  templates, and writes one patch per section: each journey's story
  *Walkthrough*, a Mermaid *Screen Flow* in the stories' solution design,
  the first journey's sequence diagram as architecture's *Data Flow*,
  `DESIGN.md`'s *Destinations by Size Class*, and *Journey Scenarios* in each
  story test plan. A document that does not exist yet is drafted from its
  template as a new file. HELIX governs: where a section already says
  something else, there is no patch, and `report.md` shows both texts.
  Review the patches, then `git apply` the ones you accept. It also drafts
  HELIX's UX types (FEAT-015 RPT-09): an *interaction-state-diagram* and a
  *wireframe* per screen, a *screen-flow* for the feature and a
  *user-journey-map* per journey. When the installed HELIX defines a type,
  each document is a patch like the rest; when it does not, `propose` says
  which types are missing and writes the documents under
  `helix-proposals/drafts/`, at the path HELIX would give them, from the
  templates proposed in `docs/proposals/helix-ux-artifact-types`.
- **`draw`** writes each diagram as Mermaid and as SVG. The SVG comes from
  the SDK's own small layered layout, so no Mermaid renderer or browser is
  needed; render the `.mmd` with Mermaid for its layout. Each screen also
  gets `states-<screen>.mmd`, a `stateDiagram-v2` with every state it
  declares (and any an action or journey step names) and the transitions
  between them: `state:` actions and journey steps first, then the SDK's
  defaults (opens loading; loading settles into ideal, empty or error;
  error retries), each listed in `states-<screen>.md` beside the state
  table of what the user sees, the action available and the announcement.
  A screen that declares no states is drawn in its ideal state only, and
  the notes (and the command's output) name the states it is missing.
- **`wireframes`** server-renders each screen's pattern with placeholder
  content in the neutral `plain` theme, inside `AppShell` with the app's
  destinations, and screenshots it at each supported size class with
  Playwright's Chromium (exit 2, HTML still written, without it). A pattern
  the catalogue lacks is a labelled box. Each declared state gets its own
  page, `<screen>.<state>.<size>.html`: the pattern draws the state itself
  where it can (its `status`, or no items); otherwise the page shows the
  pattern's heading with the SDK's `StatePanel` or `Skeleton`
  (`data-drawn-by="StatePanel"`).

The same blueprint and documents give the same files. Over MCP,
`propose_from_blueprint` returns the proposals and writes nothing.

ux-builder is not affiliated with or endorsed by Apple or Google. Human Interface Guidelines is a trademark of Apple Inc., and Material Design is a trademark of Google LLC.

### UX assessment

`ux-builder-audit assess` lets a coding agent assess a HELIX-governed app's UX
(FEAT-009). A `ux-assessment.yml` manifest binds the app's HELIX marker, flow
and catalogue. The commands trace each journey to its HELIX stories,
acceptance criteria and tests, record the app's tests and the audit as a
baseline, and inspect the exact page state the agent's browser reached, over
CDP. The skill `ux-builder-assess`, shipped in `@ux-builder/audit`, tells the
agent how to run them and write ranked, evidence-backed recommendations. The
assessment never changes the app's code or its HELIX documents. See
[`packages/audit`](packages/audit/README.md#ux-assessment).

### AI coding agents

- `node_modules/@ux-builder/ui/AGENTS.md`: the rules, set-up, and a
  reference of every component, prop, token, icon and theme.
- The Claude Code skill `ux-builder-ui`, which the starter installs. Elsewhere,
  run `cp -R node_modules/@ux-builder/ui/skill/ux-builder-ui .claude/skills/`.
- The MCP server: `claude mcp add ux-builder -- npx @ux-builder/mcp`.

## Developing

```sh
npm install
npm run build      # tokens/ -> packages/tokens/dist/, then packages/ui/dist/
npm test           # composer, gates, palette engine and builder API tests
npm run check      # schemas, lint, coverage, tests, build, licences, equivalence, contrast, gallery: what CI runs
npm run storybook  # Storybook for packages/ui on :6006
npm run builder    # the theme builder
npm run e2e        # the builder's UI suite and the starter end to end (Chromium)
```

```
tokens/          themes, brands, shared design systems, layout, variants, token names, JSON Schemas
brand/           brand artwork the brand files point at
packages/
  tokens/        @ux-builder/tokens: composes themes and bridges, builds dist/
  engine/        palette options from a logo (private)
  ui/            @ux-builder/ui: widgets, patterns, lint rules, generated guidance, Storybook
                 (ai/: AI Elements and assistant-ui previews, not published)
  create-app/    @ux-builder/create-app: the starter
  audit/         @ux-builder/audit: the running-app audit
  mcp/           @ux-builder/mcp: the MCP server
apps/theme-builder/   the guided theme builder
tools/           gates (contrast, equivalence, schemas, coverage, licences) and generators
docs/helix/      vision, PRD, features, user stories, ADRs, contracts, solution designs
```

Design docs follow the [HELIX](https://github.com/DocumentDrivenDX/helix)
method. The product vision is in `docs/helix/00-discover/product-vision.md` and
the PRD is in `docs/helix/01-frame/prd.md`. Every user-story acceptance
criterion is cited by a test (`@covers`), and `npm run coverage` enforces it.

Token files follow the W3C Design Tokens Community Group format (2025.10). A
token's path is its role (`color.structure`, `button.radius`), and its CSS
name (`--piq-color-structure`) comes from `tokens/names.json`.

Releases use [Changesets](https://github.com/changesets/changesets). Run
`npx changeset` in any pull request that changes what a consumer gets (see
`.changeset/README.md`).

### Learning from builds

Apps built with ux-builder keep an episode trace (FEAT-016, CONTRACT-007),
and their owners can export episodes as bundles (`ux-builder-trace export`).
Maintainers learn from those bundles with `tools/learn.mjs`
(`ux-builder-learn`):

1. **Collect bundles in the private learning store.** Put every `.tgz` an
   owner sends you, or the same unpacked, in a folder or private repository
   that Synaptiq controls, in any layout (by client is fine). The store must
   never be inside this repository: the tool refuses a store, or an output
   folder, under this checkout (ADR-035 rule 6). To honour a removal request,
   delete that client's bundles; the next report leaves them out.
2. **Write the report.**
   `npm run learn -- --store ~/ux-learning --out ~/ux-learning-out` writes
   `learn.md` and `learn.json`: each TRC-09 signal (a rule fetched and still
   broken, attempts to green, workarounds and hand-built UI, assessment
   findings the audit missed, regressions, repeated guidance) with counts,
   the episodes behind it, and its breakdown by modality and pattern. Apps
   appear only as hashes.
3. **File beads.** Add `--beads` to file one DDx bead (labels
   `feat:FEAT-016,learned`) per signal seen in at least 3 episodes across 2
   apps (`--threshold-episodes`, `--threshold-apps`). Beads carry only rule
   IDs, catalogue names, counts and a paraphrased lesson; `--dry-run` prints
   them instead. A signal already filed is not filed again.
4. **Make evaluation tasks.** `--evals` writes `evals/<episode>.json` for
   each finished episode with a recorded starting commit (goal, commit,
   modality, outcome to beat) and lists the ones skipped. Replay a task with
   an agent on the new SDK, record its result, then
   `node tools/learn.mjs replay-result --task <t> --result <r>` writes the
   two outcomes side by side, and
   `node tools/learn.mjs grade --tasks <dir> --results <dir>` reports each
   replay's share of components on SDK widgets and role tokens (US-014-AC4)
   and its matching patterns (US-031-AC5).

The header of `tools/learn.mjs` defines each signal, the result file and
the grade exactly.

### Publishing a release

Releases are automated by `.github/workflows/release.yml`, which runs on every
push to `main`:

1. It applies the pending changesets in `.changeset/` with
   `npm run version-packages` (versions, changelogs, `package-lock.json` and
   the catalogue) and commits that as **Version Packages**.
2. It runs `npm run check`, every gate including contrast, on the versioned
   tree. If a gate fails, nothing is pushed or published.
3. It pushes the Version Packages commit to `main`.
4. It runs `changeset publish`, which publishes each public package whose
   version isn't on npm yet, with provenance, then tags it and creates a
   GitHub release.

So merging a pull request with a changeset releases it; there is no second
pull request to merge (ADR-034). If a run fails or times out (120 minutes),
start it again from Actions → release → **Run workflow**: it publishes every
version on `main` that isn't on npm yet.

It publishes with [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers)
(OIDC), so no npm token is stored anywhere. That needs a one-time setting:
each public package (`@ux-builder/tokens`, `ui`, `audit`, `create-app`, `mcp`)
lists GitHub Actions, `DocumentDrivenDX/ux-builder`, workflow `release.yml` as
a trusted publisher on npmjs.com. A brand-new package has to
be published once by hand before a trusted publisher can be added to it.

The workflow pushes the Version Packages commit with its own token, so GitHub
starts no workflow for it; the release ran every gate on that commit already.

#### Publishing by hand

If the workflow can't publish, publish from a terminal. You need to be logged
in to npm (`npm login`) as a member of the `ux-builder` organization with
publish rights; npm asks you to approve each package with your passkey in the
browser. Then, from a clean, up-to-date `main`:

```sh
npm run version-packages   # applies the pending changesets: versions, changelogs, catalogue
npm run check              # every gate, including contrast against every theme
npx changeset publish      # publishes each public package whose version isn't on npm yet, then tags it
git push --follow-tags
```

`changeset publish` skips the private packages (`engine`, `theme-builder`)
and any version that is already on the registry, so it's safe to run again.

## Contributing

Issues and pull requests are welcome. Please run `npm run check` before
opening a pull request. Unless you say otherwise, any contribution you
intentionally submit for inclusion is dual licensed as below, without any
additional terms or conditions.

## License

Licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE))
- MIT license ([LICENSE-MIT](LICENSE-MIT))

at your option.

Third-party code and fonts bundled in the packages keep their own licences.
They are listed in each package's `THIRD-PARTY-NOTICES.md`, and
`npm run licences` checks them. Brand names and logos shown in the example
themes (Databricks, Praxis, Synaptiq) belong to their owners and are not
covered by this licence.
