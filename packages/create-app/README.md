# @ux-builder/create-app

Starts a new React + Vite app that is on ux-builder from its first commit.

```sh
npm create @ux-builder/app my-app -- --theme databricks
cd my-app && npm install && npm run dev
```

| Option | |
|---|---|
| `--theme <name>` | The theme to start on: any theme in `@ux-builder/tokens` (`databricks`, `praxis`, `praxis-material`, `praxis-fluentui`, `praxis-carbon`, `praxis-v2-databricks`, `synaptiq`, `ux-builder-databricks`, `plain`). Default `plain` |
| `--name <name>` | The package name. Default: the directory's name |
| `--blueprint <file>` | Start from this plan of the app's screens instead of the starter's. A plan with an error (`ux-builder-blueprint check`) is refused, with each error, and nothing is written |
| `--helix-version <tag>` | Start on this HELIX release instead of the latest. If it cannot be fetched and verified, nothing is written |
| `--helix-offline` | Use the HELIX bundled with this starter; no network request |
| `--no-helix` | Leave HELIX out: no marker, documents or skill |

## What the app has

- **HELIX**, the latest release when the app is created: its skill and
  catalogue in `.claude/skills/helix/` (with `HELIX-VERSION.json`: version,
  source, digest), the `.helix.yml` marker, and the starter set of HELIX
  documents in `docs/helix/`, drafted from that release's templates: product
  vision, PRD, concerns, FEAT-001 and US-001 for the starter screen,
  `DESIGN.md`, the test plan and STP-001. What the starter knows (name,
  theme, stack, the screen's criteria, design choices, checks) is filled in;
  the product's purpose, users, goals and metrics are yours to write. The
  package is verified against GitHub's SHA-256 digest; offline, the HELIX
  bundled with the starter is used, and the app records why.
- `ux-assessment.yml` for the UX assessment (`npm run assess:validate`), and
  `e2e/starter.spec.js`, a Playwright test of the starter screen that cites
  US-001's criteria (`npm run test:e2e`).

- `src/main.jsx`: every theme's CSS and fonts and `@ux-builder/ui/ui.css`,
  imported once; `ThemeProvider` (`appearance="system"`) and `ToastProvider`.
- `src/App.jsx`: a page built from SDK widgets and role tokens only, with a
  theme and appearance switcher, the theme's `Logo` in the header, its
  favicon on the tab, and a busy button.
- `npm run lint`: stylelint and ESLint with `ux-builder/no-hard-coded-values`,
  `ux-builder/no-foreign-ui` and `ux-builder/no-inline-svg`.
- `npm run audit`: builds, serves and audits the app in every theme and
  appearance with `@ux-builder/audit` (run `npx playwright install chromium`
  once); the report is in `audit-report/`.
- `app.blueprint.json`: the plan of the app's destinations and screens, and
  `npm run check:blueprint`, which checks it against the interaction rules.
- `.github/workflows/ci.yml`: `npm ci`, the blueprint check, lint and the audit on every push,
  with the report as an artifact.
- `CLAUDE.md` and `AGENTS.md`
  pointing at the SDK's guidance, and the Claude Code skill `ux-builder-ui`,
  installed into `.claude/skills/` by `npm install`.

The new app pins the exact SDK versions npm installed with the starter: the
newest within the starter's ranges (`@ux-builder/tokens` ^1.4.1, `@ux-builder/ui`
^0.6.0, `@ux-builder/audit` ^0.1.0). Upgrade them together afterwards. If
`npm create` gives an older version than expected, npx has reused a cached
starter: `npm create @ux-builder/app@latest`.
