# @ux-builder/create-app

Starts a new React + Vite app that is on ux-builder from its first commit,
or, design first, a folder for the guided design that becomes the app when
the design is ready.

## Design first, the app last

```sh
npm create @ux-builder/app@latest trip-planner
cd trip-planner && npm install
```

Without `--modality` (or `--blueprint`) the starter asks nothing and writes a
design folder: `@ux-builder/design` and its skill, an empty design state, a
starting blueprint in `docs/ux-builder/blueprint/`, HELIX's skill and marker,
and no app code. In Claude Code, type `/ux-builder-design`. The guide asks for
the modality during the design (`ux-builder-design modality`) and, when the
design is ready, for the theme: one of the released themes below, or one made
from the brand in the theme builder (`npm run builder` in a clone of this
repository; saving a theme opens a pull request, and it can be used once it is
released in `@ux-builder/tokens`). Then it builds the app in the same folder:

```sh
npm create @ux-builder/app@latest . -- --theme databricks
```

The build uses the recorded modalities and the designed blueprint, keeps
`docs/`, `.ux-builder/` and the skills, keeps `package.json`'s name and adds
the app's scripts and dependencies, writes HELIX's starter documents where none
exists, and records the build in the design state. It writes nothing, and says
why, when the modality is not recorded, a `--modality` given differs from it,
`--blueprint` is given, the blueprint has an error, or a file it did not write
is in the way. Without `--theme` it asks in a terminal and exits 1 listing the
themes without one.

A starter HELIX document is written only where the design has none: one whose
`ddx.id` (under any file name) or role (a feature spec, a story, a story test
plan) the design already has is left out, and the build lists each one left
out and why; the starter's test then cites none of the design's criteria.

When the blueprint has journeys, the app opens on them rather than on an empty
Home (`journey-app.mjs`): a route per screen in `src/screens/`, each with its
title, purpose and content in the blueprint's order and sample data made from
the blueprint (no network); the journeys' actions lead from step to step; the
blueprint's dialogs and sheets open; each screen has its loading, empty, error
(with a retry that recovers) and other states, and a warning, and a `blocked`
state, where a task or step cites a business rule. `?state=<name>` forces a
state on any screen; the prototype toolbar (`npm run dev`, or `?prototype`)
forces one too, walks a journey and resets the sample data (kept in
`localStorage`). `e2e/journeys.spec.js` walks each journey, and the assessment
manifest names the blueprint's journeys. Each generated file starts with a
header naming the blueprint and its hash; after changing the blueprint,
`npm run prototype` (`npx @ux-builder/create-app --prototype .`) writes them
again, except a file edited by hand or not written by it, which it leaves and
lists. `--theme` without `--modality` in an empty folder exits 1:
the theme is chosen at the build.

## The app at once

```sh
npm create @ux-builder/app my-app -- --modality responsive-web --theme databricks
cd my-app && npm install && npm run dev
```

With `--modality` the app is made at once, for those modalities.

| Modality | The app starts as |
|---|---|
| `responsive-web` | An `AppShell` with one empty Home screen: its `StatePanel` says to frame the first feature in HELIX, then plan its screens in the blueprint |
| `chat` | A full-screen `Conversation` from `@ux-builder/ui/assistant`, empty, with its composer and AI disclosure |
| `hybrid-chat` | A `Conversation` whose replies draw Adaptive Card parts (`@ux-builder/ui/adaptive-cards`) |
| several | An `AppShell` whose destinations are Home and Assistant, each the shell of its modality |

There is no sample domain or data. Native `ios`, `android`, `macos` and
`windows` apps are future modalities and are refused.

| Option | |
|---|---|
| `--modality <list>` | The app's modalities, comma-separated (`responsive-web`, `chat`, `hybrid-chat`). Recorded in `docs/ux-builder/blueprint/app.blueprint.json` as `supports.modalities`, with the size classes and inputs they derive. An unknown or future one exits 1. Without it (and without `--blueprint`), a design folder |
| `--theme <name>` | The theme to start on: any theme in `@ux-builder/tokens` (`databricks`, `praxis`, `praxis-material`, `praxis-fluentui`, `praxis-carbon`, `praxis-v2-databricks`, `synaptiq`, `ux-builder-databricks`, `plain`). Default `plain`. In a design folder, the theme the app is built on |
| `--name <name>` | The package name. Default: the directory's name |
| `--blueprint <file>` | Start from this plan of the app's screens instead of the starter's. A plan with an error (`ux-builder-blueprint check`) is refused, with each error, and nothing is written. Its `supports.modalities` (or `responsive-web` when it names none) must agree with `--modality`, or the starter exits 1 naming both |
| `--helix-version <tag>` | Start on this HELIX release instead of the latest. If it cannot be fetched and verified, nothing is written |
| `--helix-offline` | Use the HELIX bundled with this starter; no network request. Not with `--helix-version` (refused, nothing written) |
| `--no-helix` | Leave HELIX out: no marker, documents, skill or `docs/ux-builder/ux-assessment.yml`. The app still gets `e2e/starter.spec.js` and `npm run test:e2e`, without `@covers` lines |
| `--mcp` | Also write `.mcp.json` for the ux-builder MCP server (`npx @ux-builder/mcp`). Optional: the skills and the guided design loop work without it (ADR-036) |

The HELIX request reads `GITHUB_TOKEN` (sent to GitHub's API as a bearer
token, never written) and honours `HTTPS_PROXY`, `HTTP_PROXY` and `NO_PROXY`
in either case. `UX_BUILDER_HELIX_API` replaces the release API's base
(default `https://api.github.com`), for a mirror or a test server. If the
latest release cannot be fetched, the bundled HELIX is used, and the app
records why. If the bundled copy is also unusable, the app is created
without HELIX, and the output says why.

## What the app has

- **HELIX**, the latest release when the app is created: its skill and
  catalogue in `.claude/skills/helix/` (with `HELIX-VERSION.json`: version,
  source, digest), the `.helix.yml` marker, and the starter set of HELIX
  documents in `docs/helix/`, drafted from that release's templates: product
  vision, PRD, concerns, FEAT-001 ("the app's shell for its modalities")
  and US-001 ("open the app and see where to start", one criterion per
  modality's shell and one for the theme switch), `DESIGN.md`, the test plan
  and STP-001. What the starter knows (name, theme, stack, the shell's
  criteria, design choices, checks) is filled in;
  the product's purpose, users, goals and metrics are yours to write. The
  package is verified against GitHub's SHA-256 digest; offline, the HELIX
  bundled with the starter is used, and the app records why.
- `docs/ux-builder/ux-assessment.yml` for the UX assessment (`npm run assess:validate`), and
  `e2e/starter.spec.js`, a Playwright test of the shell that cites
  US-001's criteria (`npm run test:e2e`).

- `src/main.jsx`: every theme's CSS and fonts, `@ux-builder/ui/ui.css` and
  `patterns.css`, imported once; `ThemeProvider` (`appearance="system"`) and
  `ToastProvider`.
- `src/App.jsx`: the shell for the modalities, with `src/Home.jsx` and
  `src/Assistant.jsx` as they need, built from SDK components and role tokens
  only; `src/ThemeSwitch.jsx`: the theme and appearance switcher and the
  theme's `Logo` in the header (its favicon is on the tab).
- `npm run lint`: stylelint and ESLint with `ux-builder/no-hard-coded-values`,
  `ux-builder/no-foreign-ui`, `ux-builder/no-inline-svg` and the warning
  `ux-builder/ai-neutral-voice`, run by `ux-builder-trace lint`, which
  records each run in the episode trace.
- **The episode trace** (`@ux-builder/trace`, FEAT-016): creating the app is
  its first episode, `.ux-builder/trace/E-<date>-create.jsonl`: `start`
  (trigger `create`; the agent and model from `--agent` and `--model`, else
  `UX_BUILDER_AGENT` and `UX_BUILDER_MODEL`, else Claude Code's; the SDK and
  HELIX versions), `created` (modalities, theme, options, files written, the
  blueprint's hash), the guidance written to `AGENTS.md`, the blueprint's
  check, then `change`, `outcome` and `end`. The app is not a git
  repository yet, so the change counts the files and names no commit.
  `.gitignore` ignores only `.ux-builder/trace/current`, and
  `.claude/settings.json` has a Claude Code session-end hook that attaches
  each session's transcript (`npx ux-builder-trace attach-transcript`).
  `AGENTS.md` asks the agent to open an episode for each change, record its
  decisions, add the `UX-Episode:` trailer to its commits and end it.
- `npm run audit`: builds, serves and audits the app in every theme and
  appearance with `@ux-builder/audit` (run `npx playwright install chromium`
  once); the report is in `docs/ux-builder/audit-report/`.
- `docs/ux-builder/blueprint/app.blueprint.json`: the plan of the app's destinations and screens, and
  `npm run check:blueprint`, which checks it against the interaction rules.
- `.github/workflows/ci.yml`: `npm ci`, the blueprint check, lint and the audit on every push,
  with the report as an artifact.
- `CLAUDE.md` and `AGENTS.md`
  pointing at the SDK's guidance and naming, for each of the app's
  modalities, the components to build with and the rule families that apply, and the Claude Code skill `ux-builder-ui`,
  installed into `.claude/skills/` by `npm install`.
- The guided design loop (FEAT-018): `@ux-builder/design` as a dev
  dependency, its skill in `.claude/skills/ux-builder-design/` (refreshed by
  `npm install`), and an empty design state, `.ux-builder/design-state.json`,
  starting at Define. `CLAUDE.md`, `AGENTS.md` and the Home screen say to
  start with `/ux-builder-design`.

The new app pins the exact SDK versions npm installed with the starter: the
newest within the starter's ranges (`@ux-builder/tokens` ^1.6.0, `@ux-builder/ui`
^0.6.2, `@ux-builder/audit` ^0.1.1). Upgrade them together afterwards. If
`npm create` gives an older version than expected, npx has reused a cached
starter: `npm create @ux-builder/app@latest`.

## Maintainer notes

- `helix/` holds the bundled HELIX. It is not in the repository. `npm pack`
  and `npm publish` write it through the `prepack` script, and you can write
  it by hand with `npm run bundle-helix [-- --tag vX.Y.Z]`
  (`scripts/bundle-helix.mjs`). The script fetches and verifies the latest
  release as a new app would, writes the package and `bundled.json`, and sets
  the HELIX version in `licenses/vendored.json`. The publish fails if the
  release cannot be fetched.
- Two surfaces are for tests and maintenance only, not supported options:
  `UX_BUILDER_HELIX_BUNDLE`, a directory read as the bundled HELIX, and
  `fetchRelease({ keepArchive })`.
- `npm test` never touches GitHub; it uses a local release server and proxy.
  `npm run test:e2e` fetches the real latest release and fails, saying so,
  when GitHub cannot be reached.
