---
ddx:
  id: CONTRACT-004
  type: contract
  status: accepted
  links:
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: FEAT-005
    - kind: informed_by
      to: ADR-011
    - kind: informed_by
      to: ADR-016
    - kind: informed_by
      to: CONTRACT-001
    - kind: informed_by
      to: CONTRACT-003
    - kind: informed_by
      to: ADR-020
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: ADR-022
    - kind: informs
      to: FEAT-006
    - kind: informed_by
      to: CONTRACT-005
    - kind: informed_by
      to: ADR-025
    - kind: informed_by
      to: CONTRACT-006
    - kind: informed_by
      to: ADR-026
    - kind: informed_by
      to: ADR-027
    - kind: informed_by
      to: FEAT-007
    - kind: informed_by
      to: ADR-023
---

# Contract

**Contract ID**: CONTRACT-004 — App integration
**Type**: library and CLI (the package entry points, React API, lint rules, audit command and MCP server an app builds on)
**Version**: v1 (current releases: `@ux-builder/tokens` 1.6.0, `@ux-builder/ui` 0.6.3, `@ux-builder/create-app` 0.4.2, `@ux-builder/audit` 0.1.2, `@ux-builder/mcp` 0.3.1; each amendment below names the release it is normative from)
**Status**: accepted — by the operator 2026-10-08, as written; matches the packages released that day. *Screen patterns* (below), an amendment of 2026-10-18 for FEAT-006 (ADR-020, ADR-021, ADR-022) accepted with those ADRs, shipped in `@ux-builder/ui` 0.6.0. The amendments for FEAT-008, FEAT-009 and FEAT-010 ship in `@ux-builder/ui` 0.7.0, `@ux-builder/audit` 0.2.0, `@ux-builder/mcp` 0.4.0 and `@ux-builder/create-app` 0.5.0. Amended 2026-10-23 by FEAT-018: see CONTRACT-008, *Amendment to CONTRACT-004*.
**Related**: FEAT-004 (SDK-01–18), FEAT-005 (DIST-01), CONTRACT-001 (token names), CONTRACT-003 (theme selection), ADR-011 (embedded views), ADR-016 (React first), ADR-017 (fonts)

## Purpose

Defines what a consuming app relies on: where the packages install from, which
files and exports it imports and in what order, the theme provider's API and
its window event, the lint rules, the audit command and its report, and the
MCP server. A client team builds against this contract and the generated
catalogue without reading the SDK's source.

## Scope and Boundaries

- In scope: the registry and access, package entry points, set-up order, the
  React API's names, `ThemeProvider` and `useTheme`, the `piq:set-theme`
  event, lint rule names and options, the `ux-builder-audit` command, options,
  exit codes and `report.json`, the starter command, the MCP tools, and the
  compatibility promise across all of them.
- Out of scope: token names and their aliases (CONTRACT-001); theme
  attributes, theme CSS and resolved files (CONTRACT-003); brand and design
  system file formats (CONTRACT-002); each widget's props, which are
  normative in the generated `@ux-builder/ui/catalogue.json` (SDK-13).
- Owning system or team: the harness team, in `DocumentDrivenDX/ux-builder`.

## Normative Surface

### Registry and access

| Element | Type / Shape | Required | Rules | Notes |
|---|---|---|---|---|
| Registry | the public npm registry (`https://registry.npmjs.org`) | yes | Every `@ux-builder/*` package an app installs is published there with `"access": "public"`; an app MUST NOT need a scope registry, `.npmrc` or token to install them | The starter writes no `.npmrc`; its `ci.yml` needs no secret |
| Runtime | Node | yes | 20 or later; React and React DOM 19 (peer of `@ux-builder/ui`) | ADR-016 |

### Entry points

| Package | Import | Contents |
|---|---|---|
| `@ux-builder/tokens` | `themes/<theme>.css`, `themes.css` | Theme CSS (CONTRACT-003) |
| | `fonts/<theme>.css`, `fonts.css` | `@font-face` for one theme's bundled faces, or all (ADR-017) |
| | `resolved/<theme>.<appearance>.json`, `manifest.json` | CONTRACT-003 |
| `@ux-builder/ui` | `.` | The React API below |
| | `ui.css` | Every widget's CSS (`.piq-*`) |
| | `icons` | One export per library icon, `icon<PascalName>`, and `ICON_LIBRARY_NAMES` |
| | `eslint`, `stylelint` | Lint plugins |
| | `catalogue.json`, `AGENTS.md`, `skill/ux-builder-ui/` | Generated agent guidance (SDK-12, SDK-13) |
| `@ux-builder/audit` | bin `ux-builder-audit`; `.` (`audit`, `RULES`, `VERSION`); `report` (`writeReports`, `html`, `summaryText`) | SDK-18 |
| `@ux-builder/create-app` | `npm create @ux-builder/app <dir> -- [--theme <name>] [--name <pkg>]` | SDK-08 |
| `@ux-builder/mcp` | bin over stdio (`npx @ux-builder/mcp`) | SDK-14 |

An app MUST NOT import any other path: files outside `exports` are not part
of the contract.

### Set-up order

An app MUST load, once and in this order, before its own CSS: the theme CSS
for every theme it offers, their fonts, then `@ux-builder/ui/ui.css`. An app
that offers one theme MAY import that theme's files only.

### React API (`@ux-builder/ui`)

| Export | Kind |
|---|---|
| `Button`, `TextField`, `TextArea`, `Select`, `Checkbox`, `Switch`, `RadioGroup`, `ChoicePicker`, `Card`, `Notice`, `StatusPill`, `STATES`, `DataTable`, `Toast`, `ToastProvider`, `useToast`, `ProgressBar`, `Spinner`, `Skeleton` | Widgets; props in `catalogue.json` |
| `ThemeProvider`, `useTheme`, `resolveAppearance` | Theme selection |
| `Icon`, `ICON_NAMES`, `registerIcons`, `iconSetFor`, `pickGlyph` | Icons |
| `Logo`, `brandTitleFor`, `Favicon`, `applyFavicon` | Brand |

`ThemeProvider` props:

| Prop | Type | Default | Rules |
|---|---|---|---|
| `theme` | theme name | — | MUST be a theme in `manifest.json` that the app loaded; unknown names warn in development |
| `appearance` | `light` \| `dark` \| `system` | `system` | `system` is resolved before first paint and followed |
| `tokens` | object (a resolved file's `tokens`) | — | Embedded views only (ADR-011): replaces `theme`; no stylesheet needed; `Logo` and the favicon draw nothing |
| `favicon` | boolean | `true` | Top-level provider only |
| `onChange` | `({ theme, appearance }) => void` | — | Called on every switch, including by the event; `appearance` is the preference (may be `system`). The provider does not persist; an app that remembers the choice stores it here |
| `as` | element type | `div` | The element that carries `data-theme` and `data-appearance` |

`useTheme()` returns `{ theme, appearance, preference, themes, setTheme, setAppearance }`; `appearance` is always `light` or `dark`. The nearest provider wins.

### Theme switch event

| Element | Shape | Rules |
|---|---|---|
| `piq:set-theme` | `window` `CustomEvent`, `detail: { theme?, appearance? }` | The top-level provider (no `tokens`, no parent provider) MUST switch to it exactly as `setTheme` / `setAppearance` would, and call `onChange`. Nested and embedded providers MUST ignore it. Apps MAY dispatch it; `@ux-builder/audit` does |

### Lint rules

| Rule | Plugin | Options | Reports |
|---|---|---|---|
| `ux-builder/no-hard-coded-values` | `@ux-builder/ui/eslint`, `@ux-builder/ui/stylelint` | `{ theme, allow: [{ value, file?, reason }] }` | Literal colours, font families and radii, naming the role token when the theme has one; an allow entry without `reason` |
| `ux-builder/no-foreign-ui` | ESLint | `{ allow: [package name] }` | Imports of other UI kits (Material UI, Ant Design, Chakra, Carbon React, Fluent UI, Mantine, Bootstrap, Blueprint, PrimeReact, Radix Themes), icon sets (lucide-react, react-icons, Heroicons, Phosphor, Tabler, Font Awesome) and loader libraries |
| `ux-builder/no-inline-svg` | ESLint | `{ allow: [className or id] }` | `<svg>` written in JSX |

### Audit command

`ux-builder-audit [options] <url> [<url or /path> …]`. A URL starting with `/` is
relative to the first full URL.

| Option | Shape | Default |
|---|---|---|
| `--theme <name>` | repeatable | every theme the page loads |
| `--appearance <light\|dark>` | repeatable | both |
| `--serve "<command>"` | shell command | none; started first, stopped after |
| `--wait <selector>` | CSS selector | none |
| `--ignore <selector>` | repeatable | none; `[data-audit-ignore]` is always ignored |
| `--off <check>` | repeatable, a check name below | none |
| `--no-contrast` | flag | contrast on |
| `--out <dir>` | path | `audit-report` |
| `--fail-on <error\|warning\|never>` | enum | `error` |
| `--json` | flag | summary text |

Checks: `token-colors`, `token-fonts`, `token-radii`, `token-overrides`,
`widget-overrides`, `sdk-widgets`, `foreign-components`, `outside-theme`,
`brand`, `fonts`, `contrast`, `theme-applied` (severities in
`packages/audit/README.md`).

| Exit code | Meaning |
|---|---|
| 0 | No finding at or above `--fail-on` |
| 1 | A finding at or above `--fail-on` |
| 2 | Usage error or the audit could not run (unknown option or check, no URL, Chromium missing, `--serve` exited or never answered) |

Outputs in `--out`: `report.json`, `index.html` (self-contained) and
`screens/<page>-<theme>-<appearance>.png`.

`report.json`:

| Field | Shape |
|---|---|
| `tool`, `version`, `generatedAt`, `urls`, `rules` | strings, ISO time, string[], check list |
| `runs[]` | `{ url, theme, appearance, mode: "event" \| "attributes", screenshot }` |
| `findings[]` | `{ id, url, rule, severity: "error" \| "warning" \| "info", selector, message, runs: ["<theme>/<appearance>"], property?, value?, owner?: "app" \| "sdk", everyTheme? }` |
| `summary` | `{ error, warning, info, byRule }` |

A finding's `id` matches the number drawn on the screenshots. Findings with
`owner: "sdk"` are the SDK's to fix and MUST NOT be errors.

### MCP server

Tools: `list_themes`, `get_theme`, `list_brands`, `list_design_systems`,
`list_widgets`, `get_widget`, `list_tokens`, `get_token`, `list_icons`,
`get_guidance`. Resources: `ux-builder://catalogue`, `ux-builder://guidance`. The
server MUST describe the `@ux-builder/ui` and `@ux-builder/tokens` installed beside
it.

## Screen patterns *[Amended 2026-10-18 — FEAT-006]*

Normative from `@ux-builder/ui` 0.6.0. Anything below not listed as shipped
becomes normative in the release whose changelog ships it; until then a name
may change only by amending this section. **Shipped** (in 0.6.0): the `patterns` and
`patterns.css` entry points; the widgets `Tabs`, `Sheet`, `Dialog`,
`MenuButton`, `Breadcrumbs`, `Pagination`, `DatePicker` and
`DateRangePicker` (native date inputs); the reporting patterns `StatTile`,
`ChartFrame` (the app draws the chart; the frame adds title, legend, states
and a data table), `Dashboard` and `ReportViewer`, and print styles; `SettingsPage`; the forms `FormPage`,
`FormSection`, `ErrorSummary`, `QuickEdit` and `ConfirmDialog` with the hooks
`useFormState` and `useUnsavedChangesWarning`; the layout primitives; `PrimaryNav`,
`WorkspaceSwitcher`, `AppShell` and `ErrorScreen`; the regions `PageHeader`,
`FilterBar`, `FilterPanel`, `FilterSection`, `StatePanel` and
`BulkActionBar`, `DescriptionList`, `Timeline` and `TabsSection` (selected
tab in the URL parameter `tab` by default); `RecordDetail` and `ListDetail`;
`CollectionList` with the `useListQuery` hook (list query in
the URL as `<key>.page`, `.size`, `.q`, `.f` and `.sort`); the helpers
`sizeClassOf`, `sizeAtLeast` and `useSizeClass`; and the catalogue's
`patterns[]` (with `tier` `primitive`, `navigation`, `region`, `screen` or
`helper`), `variants[]` and `sizeClasses[]`. *Shipped 2026-10-19 in 0.6.0 (FEAT-006
Extended screens, FEAT-004 SDK-19):* the widgets `Combobox` and `Tooltip`;
`Wizard`, `TaskList`, `ReviewConfirm`, `EditableGrid`, `WorkQueue`,
`ImportFlow`, `ExportDialog`, `Board`, `Calendar`, `Attachments`,
`DrillDown` with `useDrillPath` (levels in the URL parameter `drill`),
`PeriodComparison`, `PrintLayout`, `PivotTable`, `ReportBuilder`,
`Subscriptions`, `UsersAndRoles`, `PermissionsMatrix`, `AuditLog`,
`NotificationCentre`, `Integrations`, `ApiKeys`, `HomeScreen`,
`CommandPalette` and `ContextMenu`. The rest is planned.

### Entry points and set-up

| Package | Import | Contents |
|---|---|---|
| `@ux-builder/ui` | `.` (added widgets) | `Tabs`, `Dialog`, `Sheet`, `MenuButton`, `Breadcrumbs`, `Combobox`, `DatePicker`, `DateRangePicker`, `Tooltip`, `Pagination` |
| | `patterns` | The pattern React API below; no widget is exported twice |
| | `patterns.css` | Every pattern's CSS (`.piq-*`) |

Set-up order: as above, then `@ux-builder/ui/patterns.css` after `ui.css`. An
app that uses no pattern MUST NOT need `patterns` or `patterns.css`.

### Pattern React API (`@ux-builder/ui/patterns`)

| Exports | Tier (ADR-020) |
|---|---|
| `Stack`, `Cluster`, `Grid`, `Page`, `SplitView` | Layout primitives |
| `PrimaryNav`, `LocalNav`, `WorkspaceSwitcher`, `BulkActionBar` | Navigation and menus (with `MenuButton` and `Breadcrumbs` from `.`) |
| `PageHeader`, `FilterBar`, `FilterPanel`, `DescriptionList`, `Timeline`, `StatTile`, `ChartFrame`, `TabsSection`, `ConfirmDialog`, `StatePanel` | Regions (with `Pagination` from `.`) |
| `AppShell`, `ErrorScreen`, `CollectionList`, `ListDetail`, `RecordDetail`, `FormPage`, `QuickEdit`, `Dashboard`, `ReportViewer`, `SettingsPage` | Screens |

Props are normative in `catalogue.json`, as for widgets. Every pattern follows
these conventions:

| Convention | Rule |
|---|---|
| Slots | A content area is a prop named for its region (`header`, `toolbar`, `filters`, `actions`, `aside`, `footer`, `detail`, `empty`) taking React nodes; per-item content is a `render<Item>` function. A pattern MUST NOT take a configuration object that describes the screen |
| Status | A pattern that shows data takes `status`: `ready` \| `loading` \| `empty` \| `error` \| `forbidden` \| `partial` (default `ready`), and `onRetry` for `error`. Each status renders its `StatePanel` unless the matching slot replaces it |
| Controlled state | Selection, the open/closed state of dialogs and sheets, the selected tab and list queries (search, filters, sort, page) are controllable (`value` / `on<Name>Change` pairs); data is supplied by the app, never fetched |
| Responsiveness | A pattern's root establishes an inline-size container (ADR-021); size-class behaviour is automatic and has no prop. Only `AppShell` reads the viewport, unless given `adapt="container"` (shipped), which lays it out by the width of the element it is in, for previews and embeds; that element sets the height |
| Theme | No pattern reads the theme; variants arrive as tokens (ADR-022) |
| Class names | `.piq-<pattern-kebab>` and `.piq-<pattern-kebab>__<part>`; app CSS MUST NOT target them (as for widgets) |

### Catalogue, MCP and audit additions

| Surface | Addition |
|---|---|
| `catalogue.json` | *Shipped:* `patterns[]`: `{ name, type, tier, purpose, props[], import, source }` (as `widgets[]`, plus `tier`), and for each component pattern `slots[]`, `statuses[]`, `sizeClasses: { <size class>: text }`, `variantPoints[]`, `chooseWhen`, `insteadOf[]: { name, when }` from `packages/ui/src/patterns/patterns.meta.json`, which generation checks against the code; `variants[]`: `{ point, title, default, variants[]: { name, title, tokens[] }, chosenBy: { <design system>: <variant> } }`; `sizeClasses[]`: `{ name, minWidth }`; the rule directing agents to compose screens from patterns before writing layout CSS (AGT-01–03) |
| `@ux-builder/mcp` | *Shipped:* tools `list_patterns` (optional `tier`), `get_pattern` (`name`; the catalogue entry), `list_variants` |
| `ux-builder-audit` | *Shipped:* option `--width <px>` (repeatable, 200–4000; default: 1280 only, without the new checks); with it, checks `reflow` (page scrolls sideways at the width, naming the widest element), `target-size` (below `size.target-minimum`), `focus-obscured` (focused element entirely covered by sticky or fixed content). New checks report at `warning` for one minor release before they can be errors. Runs carry `width`; run labels in findings end `@<width>`; a finding inside a `data-preview` element carries `preview`. `@ux-builder/ui/patterns.css` counts as the SDK's own CSS |


- Versioning: semantic versions per package, released by Changesets with a
  changelog (DIST-01). Bumps follow `.changeset/README.md`: a value fix is a
  patch; an added token, widget, theme, check or rule is a minor; a renamed or
  removed token, export or prop, or a changed behaviour, is a major, after one
  major version with the old name kept.
- `@ux-builder/ui`, `@ux-builder/audit`, `@ux-builder/create-app` and `@ux-builder/mcp` are
  0.x: until 1.0 a minor MAY carry a breaking change, named in the changelog.
  Apps SHOULD depend on `~0.y.z` for these (the starter pins the exact versions npm resolves within its own ranges)
  and `^1.x` for `@ux-builder/tokens`.
- A minor of `@ux-builder/audit` or of the lint rules MAY add checks that report
  on an app that passed before. Apps upgrade deliberately, or turn a check off
  with `--off` / the rule's options until fixed.
- `@ux-builder/ui` requires the `@ux-builder/tokens` minor it was released with or
  later (its dependency range).
- Precedence: the nearest `ThemeProvider` wins; an app's own CSS loads after
  `ui.css` but MUST NOT target `.piq-*` classes or set `--piq-*` tokens
  (`widget-overrides`, `token-overrides`).

## Interaction rules and blueprint *[Amended 2026-10-20 — FEAT-008, ADR-025]*

Normative from `@ux-builder/ui` 0.7.0, `@ux-builder/audit` 0.2.0, `@ux-builder/mcp` 0.4.0
and `@ux-builder/create-app` 0.5.0. The formats are CONTRACT-005; this section lists where an app meets them.

| Surface | Addition |
|---|---|
| `@ux-builder/ui` entry points | `@ux-builder/ui/blueprint`: `rulesFor`, `checkBlueprint`, `blueprintSchema`, `findRecipes`, `getRecipe`, `skeleton`, `rules`, `recipes`, `limits` (CONTRACT-005; its `CHECKS` and `nearestPattern` are internal) |
| `@ux-builder/ui` command | `ux-builder-blueprint check <file> [--json]`, `ux-builder-blueprint init [--kind app\|view] [--out <file>]` (CONTRACT-005) |
| `catalogue.json` | `interaction`: `{ version, limits, rules[], recipes[], blueprintSchema }` (CONTRACT-005) |
| `AGENTS.md`, skill | An "Interaction and screen rules" section: every rule's ID and statement, and the plan → check → build → lint → audit loop |
| `@ux-builder/mcp` | Tools `get_rules` (`context?`, `sizeClasses?`, `inputs?`), `list_recipes` (`job?`, `kind?`), `get_recipe` (`id`), `get_blueprint_schema`, `check_blueprint` (`blueprint`); `get_guidance` includes the loop. `get_blueprint_schema` returns `{ schema, skeleton: { app, view } }`: the blueprint's JSON Schema and `skeleton("app")` and `skeleton("view")` |
| `ux-builder-audit` | Checks `one-modal`, `modal-contract`, `one-primary-action`, `nav-per-breakpoint` (with `--width`), `line-length`: warnings for their first minor release. Options `--write-baseline <file>` and `--baseline <file>` |
| `report.json` | A finding from these checks adds `ruleId` (the rule catalogue ID) and `sources[]` (`{ title, url }`); with `--baseline`, `summary` adds `baselined` and `resolved` (counts) and the report lists `resolved[]` |
| Baseline file | `{ tool: "ux-builder-audit", version, findings: [{ rule, url, selector, message?, runs }] }`, sorted by `rule`, `url`, `selector`, `message`. `selector` is `null` for a finding with no element; such a finding carries `message`, and a later finding matches it by `rule`, `url` and `message`. A finding with a selector carries no `message` and matches by `rule`, `url` and `selector` |
| `@ux-builder/create-app` | Writes `app.blueprint.json`, a `check:blueprint` script and a CI step; option `--blueprint <file>` |

## UX assessment *[Amended 2026-10-20 — FEAT-009, ADR-026]*

Normative from `@ux-builder/audit` 0.2.0 and `@ux-builder/mcp` 0.4.0. The formats are CONTRACT-006.

- `@ux-builder/audit` exports `inspect(page, options)` and
  `attach({ cdp, page })` beside `audit()`. `audit()` keeps its options,
  report and exit behaviour; it is implemented on `inspect()`, and its
  findings for the same pages are unchanged.
- The command gains `ux-builder-audit assess <subcommand>`: `init`,
  `validate`, `collect`, `baseline`, `plan`, `browser`, `reset`, `merge`,
  `inspect`, `validate-report`, `propose`, `check-writes`, `apply-check`,
  `report`, `compare` and `gate` (their options, records and exit codes are
  CONTRACT-006 "Command" and "Increments 2 and 3").
- The package ships the skill `skill/ux-builder-assess/SKILL.md` and the
  JSON Schemas under `schema/`.
- `@ux-builder/mcp`, run from an app's directory, reads that app's
  installed `@ux-builder/ui` catalogue before its own and names the version
  it served in its instructions.
- `@ux-builder/mcp` registers three tools when it can load the app's
  `@ux-builder/audit` (0.2.0 or later; without it, none of them):

  | Tool | Input | Returns |
  |---|---|---|
  | `get_assessment_skill` | none | The text of `skill/ux-builder-assess/SKILL.md` |
  | `validate_assessment_manifest` | `path`: the manifest | `{ valid, problems: [{ path, message }], helix: { flow, root, catalog, documents } \| null }`, as `assess validate`; a manifest that cannot be read is a tool error |
  | `validate_assessment_report` | `dir`: a run's directory | `{ valid, problems: [{ file, path, message }] }`, as `assess validate-report` |

  The tools only read and check; every stage that writes a record runs
  through the commands above.

## The starter on HELIX *[Amended 2026-10-21 — FEAT-010, ADR-027]*

Normative from `@ux-builder/create-app` 0.5.0.

| Option | Behaviour |
|---|---|
| (default) | Fetches the latest HELIX release's plugin package from GitHub, verifies it, installs `skills/helix/` at `.claude/skills/helix/`, and writes `.helix.yml` and the starter set (FEAT-010 HLA-01) |
| `--helix-version <tag>` | That release; exit 1 and nothing written if it cannot be fetched and verified |
| `--helix-offline` | The bundled HELIX; no network request |
| `--helix-offline` with `--helix-version` | Refused: exit 1, nothing written |
| `--no-helix` | No marker, documents, skill, `ux-assessment.yml` or `assess:validate` |

Every app gets `e2e/starter.spec.js` and the `test:e2e` script. On HELIX,
the test cites US-001's criteria with `@covers`, and the app also gets
`ux-assessment.yml` and the `assess:validate` script. Without HELIX
(`--no-helix`, or the fallback below), the test has no `@covers` lines,
since there is no US-001.

`HELIX-VERSION.json`: `{ version, tag, source, digest, fetchedAt, bundled,
reason? }`. When the fetch fails, the bundled HELIX is used and `reason`
says why. When the bundled HELIX is missing or fails its check as well, the
app is created without HELIX and exits 0. The output gives the reason and
says that no `HELIX-VERSION.json` was written.

Environment:

| Variable | Use |
|---|---|
| `GITHUB_TOKEN` | Sent as a bearer token to the API only; never written |
| `HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` (either case) | The requests go through the proxy (undici's `EnvHttpProxyAgent`) |
| `UX_BUILDER_HELIX_API` | The release API's base, default `https://api.github.com`. For tests and mirrors |
| `UX_BUILDER_HELIX_BUNDLE` | Test and maintenance only, not a supported option: the directory read as the bundled HELIX instead of the package's `helix/` |

`fetchRelease({ keepArchive })` in `helix.mjs` is also test and maintenance
only: `scripts/bundle-helix.mjs` uses it to keep the downloaded archive. That
script runs on `prepack`, and also as `npm run bundle-helix`. It writes
`helix/`, and it sets the HELIX version in `licenses/vendored.json`. It is
not part of the published interface.

## AI and agent experience *[Amended 2026-10-21 — planned, FEAT-011, ADR-028]*

Normative from the minors that ship FEAT-011. The formats are CONTRACT-005
*AI and agent experience* and CONTRACT-006 (`journeys[].ai`, `scenarios`).

| Surface | Addition |
|---|---|
| `@ux-builder/ui/blueprint` | `rulesFor({ aiRoles? })`; `checkBlueprint` applies the AI blueprint checks and inline patterns' rules at `ai.region` |
| `@ux-builder/ui` components | FEAT-007's assistant and generative components emit CONTRACT-005's AI markers |
| `@ux-builder/ui/eslint` | Rule `ux-builder/ai-neutral-voice` (warning); a `// ux-builder-ai-persona` comment on the line before a string opts it out |
| `catalogue.json` | `interaction.rules` includes the AI rules; `interaction.aiRoles` lists the roles |
| `AGENTS.md`, skill | An "AI and agent screens" section: declare each screen's AI role, the rule IDs by role, the markers |
| `@ux-builder/mcp` | `get_rules` accepts `aiRoles` |
| `ux-builder-audit` | Checks `ai-disclose`, `ai-stop`, `ai-correct`, `ai-starters`, `ai-declared`, `agent-approval`, `agent-plan`, `agent-interrupt`, `agent-who-acts`, `agent-recover`, `agent-summary`, `genui-review-prefill`, on AI-marked elements only; each finding carries its SD-005 rule ID; warnings |
| `ux-builder-audit` *[Amended 2026-10-21 — build of FEAT-011 step 3]* | Also `card-input-label` and `card-narrow-first` (rules `card.input-label`, `card.narrow-first`: an Adaptive Card or other generated UI as rendered; the second with `--width`, below 600px). Option `--blueprint <file>`: the app's blueprint, for `ai-declared` and the screens' `ai.roles` and `ai.takeover`, mapped by `data-piq-screen` (CONTRACT-005 *AI markup*). `inspect(page, { blueprint })` and `audit({ blueprint })` take it parsed; `AI_CHECKS` lists the AI checks |
| `ux-builder-audit assess` | AI journeys and their three scenarios (CONTRACT-006) |

## Assistant and generative UI *[Amended 2026-10-21 — FEAT-007, ADR-023, ADR-028; US-046 to US-048]*

Normative from the `@ux-builder/ui` minor that ships US-046 to US-048, and
from `@ux-builder/mcp`'s next minor for `list_renderable`. This is the
revision FEAT-007 *Dependencies* asks for: the `@ux-builder/ui/assistant`
entry, the adapters and their optional peer dependencies, and the
catalogue's `renderable` field. The components are the SDK's own (ADR-023
rule 4). No chat library's components or styles are part of them.

### Entry points

| Package | Import | Contents |
|---|---|---|
| `@ux-builder/ui` | `assistant` | The assistant React API below. It MUST import no AI library (FEAT-007 ADP-01) and depends on `react` only |
| | `assistant/ai-sdk` | `useAiSdkConversation`, `fromAiSdk`: the AI SDK adapter |
| | `assistant/assistant-ui` | `useAssistantUiConversation`, `fromAssistantUi`: the assistant-ui adapter |
| | `patterns.css` | Also styles the assistant (`.piq-conversation*`, `.piq-assistant-*`); no other stylesheet is needed |

Set-up order: as *Screen patterns*. An app that uses no assistant component
MUST NOT need `assistant`, and no assistant code reaches its bundle.

### Assistant React API (`@ux-builder/ui/assistant`)

| Export | Kind | Props (optional unless marked) |
|---|---|---|
| `Conversation` | component | `messages` (required, below), `onSend(text)`, `onStop()`, `onRetry(messageId)`, `onRegenerate(messageId)`, `suggestions` (`string[]` or `{ label, prompt }[]`), `onDecide({ id, action, decision, messageId })`, `decisions` (`{ [approvalId]: "approved" \| "denied" }`), `onComponentSubmit({ messageId, partId, component, values })`, `renderArtifact(artifact)`, `disabledReason`, `actor` (`"agent" \| "user"`), `label`, `composerLabel` (default "Ask the assistant"), `disclosure`, `strings` |
| `AssistantPanel` | component | `open`, `onClose()`, `title` (default "Assistant"), `panel` (required: the `Conversation`), `children` (the page beside it) |
| `Markdown` | component | `text` (required), `sources`, `idPrefix` (link each `[n]` to source *n* of a `Sources` with the same `idPrefix`) |
| `Reasoning` | component | `text` (required), `seconds` |
| `ToolCalls` | component | `calls` (required: `tool` parts): one plan, grouped under "Used *n* tools" when there are more than three |
| `ToolCall` | component | `name` (required), `title`, `status` (`running` \| `done` \| `failed`), `input`, `output`, `error`; a list item, inside `ToolCalls` or an `ol` |
| `Sources` | component | `sources` (required: `{ id?, title, href? }[]`), `idPrefix` |
| `ApprovalCard` | component | `summary` (required), `details`, `decision`, `current` (default `true`), `onDecide(decision)` |
| `GenerativeComponent` | component | `component` (required), `props`, `values`, `onValuesChange(values)`, `onSubmit(values)`, `submitted` |
| `InlineForm` | component | `title`, `fields` (required: `{ name, label, type: text \| number \| date \| select \| checkbox, options?, value?, required? }[]`), `submitLabel`, `values`, `onValuesChange`, `onSubmit(values)`, `submitted` |
| `RENDERABLE` | constant | `{ [component]: propsSchema }`: the allow-list, the same data as the catalogue's `renderable` |
| `checkRenderable` | function | `(component, props) → { ok, problems: string[] }` |

A **message** is `{ id, role: "user" \| "assistant", status?, error?, text?, parts? }`.
`status` is `streaming`, `done` (default), `stopped` or `error`; `error` is the
text shown for a failure; `text` is markdown, the same as one `text` part.

| Part `type` | Fields | Renders |
|---|---|---|
| `text` | `text` | `Markdown` |
| `reasoning` | `text`, `seconds?` | `Reasoning` |
| `tool` | `id`, `name`, `title?`, `status`, `input?`, `output?`, `error?` | `ToolCall`. A message's tool calls form one plan; more than three are grouped under "Used *n* tools" |
| `sources` | `sources` | `Sources`; `[n]` in the message's text links to source *n* |
| `approval` | `id` (the request), `action` (the action it is for; default `id`), `summary`, `details?`, `current?` | `ApprovalCard` |
| `component` | `id?`, `component`, `props` | `GenerativeComponent` |
| `artifact` | `id`, `title`, `kind?`, `content` (markdown) | An Open button, and the artifact pane |

Unknown part types render nothing. No field of a message is ever inserted
as HTML.

| Area | Rule |
|---|---|
| Log and announcements | The message list is `role="log"` with `aria-live="off"`. A separate polite live region announces each finished assistant reply once, an approval request when it appears, and the user's choice. A streaming message is `aria-busy="true"` and says "Replying…" in text |
| Composer | A labelled `TextArea`. Enter sends (`onSend`), Shift+Enter adds a line, focus stays in it. While a reply streams or `disabledReason` is set, Send is disabled, the reason is in text and tied to the field with `aria-describedby`, and the draft is kept |
| Stop | While a message streams, a "Stop" button beside the status region calls `onStop`, and focus returns to the composer. The app keeps what arrived and sets `status: "stopped"`; the message then says "Stopped" |
| Failure | `status: "error"` shows `error` (default "The assistant could not reply.") and Retry, which calls `onRetry`. Earlier messages are untouched |
| Markdown | Paragraphs, headings, lists, emphasis, inline code, fenced code and links only. HTML tags are dropped, with the content of `script` and `style`. Links other than `http:`, `https:` and `mailto:` are text. Links open in a new tab, show the external-link icon and say "(opens in a new tab)". A code block scrolls within itself and has a Copy button |
| Size class (ADR-021, by the component's own width) | `Conversation`: an artifact opens beside the log from expanded, and in a full-screen modal sheet below it; focus moves to it and back to its Open button. `AssistantPanel`: below expanded, the conversation is a full-screen modal sheet; from expanded, a side panel region beside `children`. The newest message stays in view unless the user has scrolled up, when "Jump to latest" appears |
| Approvals | Nothing reaches `onDecide` until the user presses Approve or Deny; neither is focused or chosen by default. Only the user's choice in this component, or one the app passes back in `decisions`, decides a request: no other field (`approved`, `status`, a tool's output, `isAutomatic`) is read. Of several requests with the same `action`, only the latest is current; an earlier undecided one, or one with `current: false`, says "This request is no longer current." and has no buttons. A decided card says "Approved by you" or "Denied by you" and has no buttons |
| Generative UI | A `component` part renders only a component in `RENDERABLE`, and only when its `props` pass that component's schema (required props, types, no unknown props). Otherwise it renders a plain notice: "This content could not be shown." Nothing from the part is inserted as HTML |
| Inline input (GEN-04) | Values the user typed into an inline component are kept by message `id` and part `id` (or the component's position), so they survive the message being regenerated. After `onComponentSubmit` the component shows the submitted values, read only. Pre-filled values are editable and are sent only when the user submits |
| No requests | Nothing in `assistant` or an adapter makes a network request, configures a hosted service, or reports usage (ADP-03) |

#### Renderable components *[Amended 2026-10-21 — build, FEAT-011 AIB-03, US-080]*

`RENDERABLE` (and the catalogue's `renderable: true`) is: `Card`, `DataTable`,
`DescriptionList`, `FormPage`, `InlineForm`, `Notice`, `ProgressBar`,
`StatTile`, `StatusPill`, `Wizard`. `Wizard` and `FormPage` were added on
2026-10-21 so a chat can embed a task in steps or a longer form (FEAT-011
AIB-03; ADR-028 decision 4). Their props are JSON only and reuse
`InlineForm`'s field schema (*field* below); field names are unique across
steps or sections, and the values reach `onComponentSubmit` as one object.

| Component | Props (JSON; required marked) | Renders |
|---|---|---|
| `Wizard` | `title` (required), `steps` (required: `{ id, title, fields: field[] }[]`, 1 to 8), `submitLabel` | The SDK's `Wizard` pattern, each step's fields as SDK widgets: its step list, progress and error summary; a step's `required` fields are checked before Continue; the last step's button (`submitLabel`) submits |
| `FormPage` | `title` (required), `sections` (required: `{ title, fields: field[] }[]`, 1 to 10), `submitLabel` | The SDK's `FormPage` pattern with a `FormSection` per section: its error summary (which takes focus) and its action bar; no Cancel |

*field* is `{ name, label, type: text | number | date | select | checkbox, options?, value?, required? }`.
Both follow *Inline input (GEN-04)* as `InlineForm` does: edits survive
regeneration, pre-filled values are editable, values are sent only on the
user's submit, and once submitted the component shows what was sent, by step
or section, read only. Both sit in the `data-piq-ai="generated"` frame.

### AI markup (CONTRACT-005 *AI markup*, FEAT-011 AIM-01)

| Element | Markers |
|---|---|
| `Conversation` root | `data-piq-ai-label`; its disclosure line (`disclosure`) is visible text |
| Each assistant message's content | `data-piq-ai="generated"`, `aria-describedby` the disclosure; Retry and Regenerate carry `data-piq-ai-control="retry"` and `"regenerate"` |
| The status region | `data-piq-ai="status"`, `role="status"`, `aria-live="polite"`, `aria-busy="true"` while a message streams; the Stop button beside it |
| A message's tool calls | `data-piq-ai="plan"`; each call `data-piq-ai="step"` with `data-piq-ai-status` `running`, `done` or `failed`, and that status in text |
| `ApprovalCard` | `data-piq-ai="approval"`; Approve and Deny carry `data-piq-ai-control="approve"` and `"deny"` |
| `GenerativeComponent` | `data-piq-ai="generated"` on its frame |
| `actor` | A polite region with `data-piq-ai-actor="agent"` or `"user"` saying who is acting |

### Adapters (FEAT-007 ADP-02)

Each adapter is a hook that reads a runtime object the app already created
and returns `Conversation` props. It imports neither the runtime's package
nor any other AI library, so it adds no dependency.

| Import | Export | Input | Mapping |
|---|---|---|---|
| `assistant/ai-sdk` | `useAiSdkConversation(chat, options?)` | The object `useChat()` returns (`@ai-sdk/react`, AI SDK 5 or later), or an `AbstractChat` from `ai`: `messages`, `status`, `error`, `sendMessage`, `stop`, `regenerate`, `addToolApprovalResponse` | `text`, `reasoning`, `tool-*` and `dynamic-tool` (state → `running`, `done`, `failed`), and `source-url` and `source-document` (→ `sources`). A tool part in `approval-requested` → an `approval` with its `approval.id` (`options.describeApproval(part)` gives the summary); any later state makes it not current. A tool output `{ component, props }` → a `component` part. `status` `submitted` or `streaming` → the last reply streams; `error` → `status: "error"`; Stop records the reply as stopped |
| | `fromAiSdk(messages, { status, error, stopped, describeApproval })` | The same, without React | A pure function, for tests and servers |
| `assistant/assistant-ui` | `useAssistantUiConversation(thread, options?)` | assistant-ui's `ThreadRuntime` (`runtime.thread` of the app's runtime, rendered inside its `AssistantRuntimeProvider`; 0.15) | Subscribes to it, reading it in an effect, never while rendering. `text`, `reasoning`, `tool-call` (`result` → done, `isError` → failed) and `source` → parts; a tool call with `approval` and no `approved` → an `approval`; message status `running` → streaming, `incomplete` `cancelled` → stopped, `incomplete` `error` → error. `onSend` appends, `onStop` cancels the run, Retry and Regenerate reload the message, `onDecide` calls the part's `respondToToolApproval` |
| | `fromAssistantUi(messages, options?)` | The thread's messages | A pure function |

`package.json`: `ai` (`>=5 <8`) and `@assistant-ui/react` (`>=0.15 <0.16`)
are peer dependencies marked optional in `peerDependenciesMeta`, and never
`dependencies`. An app that imports no adapter installs neither.

### Catalogue and MCP (FEAT-007 GEN-01)

| Surface | Addition |
|---|---|
| `catalogue.json` | `assistant[]`: the `assistant` entry's exports, shaped as `widgets[]`, with `import` from `@ux-builder/ui/assistant`. Each entry of `widgets[]`, `patterns[]` or `assistant[]` that an agent may render gains `renderable: true` and `propsSchema`: a JSON Schema using only `type`, `enum`, `properties`, `required`, `additionalProperties`, `items`, `minItems`, `maxItems`, `maxLength`, `minimum` and `maximum`. The source is `packages/ui/src/assistant/renderable.json`; generation fails if it names a component the catalogue lacks |
| `AGENTS.md`, skill | An "Assistant" section: the components, the renderable list, and that a tool result renders UI as `{ component, props }` |
| `@ux-builder/mcp` | Tool `list_renderable` (no input) → `[{ name, import, purpose, propsSchema }]`. `get_widget` and `get_pattern` return `renderable` and `propsSchema` with the entry |

## Adaptive Cards *[Amended 2026-10-21 — planned, ADR-029, FEAT-011, FEAT-007]*

Normative from the `@ux-builder/ui` minor that ships ADR-029. It covers the
open-source schema, version 1.6 and earlier.

### Entry point `@ux-builder/ui/adaptive-cards`

| Export | Signature | Behaviour |
|---|---|---|
| `AdaptiveCard` | `<AdaptiveCard card={object} onAction={(action) => void} />` | Renders the card with SDK components, in the nearest theme; marks it `data-piq-ai="generated"` |
| `checkCard` | `(card: object) => Finding[]` | The vendored schema, then every `card.*` rule; CONTRACT-005 *Finding* shape, `path` a JSON Pointer into the card |
| `cardSchema` | object | The vendored Adaptive Cards 1.6 JSON Schema (MIT) |

`onAction` receives `{ type: "Action.Submit" | "Action.Execute", id?, verb?, data, inputs }`,
where `inputs` maps each input `id` to its value. It is never called for
an action marked high-impact until the user approves.

### Element mapping

| Card element | SDK component |
|---|---|
| `AdaptiveCard` | `Card` |
| `TextBlock` (`style: heading` → a heading); `RichTextBlock`, `TextRun` | Text in the theme's type scale; a sanitised markdown subset, never HTML |
| `Image`, `ImageSet` | `img` with `altText`; `Cluster` |
| `Media` | Native `video` or `audio` with its captions |
| `Container` (`style`: `emphasis`, `good`, `attention`, `warning`, `accent`) | `Stack` on the matching surface or status tokens |
| `ColumnSet`, `Column` (`auto`, `stretch`, weight, px) | `Grid`, collapsing to one column at compact |
| `FactSet` | `DescriptionList` |
| `Table` | `DataTable` (static) |
| `ActionSet`, card `actions` | `Button`s in a `Cluster`; beyond the visible limit, a `MenuButton` |
| `Action.Submit`, `Action.Execute` | `Button`, calling `onAction`; `style: positive` is the primary emphasis, `destructive` is the destructive emphasis with FEAT-008's safeguard |
| `Action.OpenUrl` | A link marked as leaving the app |
| `Action.ShowCard`, `Action.ToggleVisibility` | Disclosures |
| `Input.Text` (`isMultiline`) | `TextField` (`TextArea`) |
| `Input.Number`, `Input.Time` | `TextField` (`type` number, time) |
| `Input.Date` | `DatePicker` |
| `Input.Toggle` | `Checkbox` |
| `Input.ChoiceSet` (`compact`; `expanded`; `filtered`; `isMultiSelect`) | `Select`; `RadioGroup` or checkboxes; `Combobox`; checkboxes |
| `label`, `isRequired`, `errorMessage` | The field's label, required state and error text |
| Anything else (`Refresh`, `Authentication`, host-specific or later elements) | The element's `fallback`, else dropped with a plain notice |

### High-impact actions

A card author marks an action in its `data`:

```json
{ "type": "Action.Execute", "title": "Pay invoice", "verb": "pay",
  "data": { "ux-builder": { "highImpact": true, "consequence": "Pay £120.00 to Acme Ltd" } } }
```

The renderer shows an approval with `consequence`, Approve and Deny
(FEAT-007 AGT-T-04), and calls `onAction` only after Approve. The
`ux-builder` key is removed from `data` before `onAction`.

### MCP

`@ux-builder/mcp` adds `check_card` (`card`) → findings.

### Build notes *[Amended 2026-10-21 — build, US-083 to US-085]*

| Surface | As built |
|---|---|
| `@ux-builder/ui/adaptive-cards/check` | A second export: `checkCard`, `cardSchema`, `CHECKS` (the rule IDs `checkCard` reports) and `SUPPORTED_VERSION`, with no React, so Node tools (the MCP server, `tools/check-rules.mjs`) load it without a DOM. `@ux-builder/ui/adaptive-cards` exports the same functions with `AdaptiveCard`. The schema is vendored verbatim at `adaptive-cards/schema-1.6/adaptive-card.json` (MIT, recorded in `licenses/vendored.json`) |
| `checkCard` findings | Schema problems are `severity: "error"` under `card.version` (the card is not a valid 1.6 card); every rule finding is a warning. No rule runs on an element the schema rejects, or inside it. An element outside 1.6 is a `card.version` warning only when it has no `fallback`; its fallback is checked in its place. Ordered by path, then rule |
| `AdaptiveCard` props | Also `decision` and `onDecide({ action, decision })`, so an app records the user's choice on a high-impact action (`action` is the action's `id`, else its `verb`, else its title); `headingLevel` (default 3); `disclosure` (visible AI disclosure text, tied with `aria-describedby`). Only the user's choice in the card, or a `decision` the app passes back, decides; no field of the card is read for it |
| Conversation (*Assistant and generative UI*) | A message part `{ type: "adaptive-card", id?, card }` renders `AdaptiveCard`, done without changing `GenerativeComponent` or the renderable catalogue. `Conversation` gains `onCardAction({ messageId, partId, action })` and `onCardDecide({ messageId, partId, action, decision })`, and keeps each card's decision by message and part. The AI SDK and assistant-ui adapters map a tool output `{ type: "adaptive-card", card }`, or an object with `type: "AdaptiveCard"`, to that part |
| Actions | Up to four primary actions show as buttons; the rest, and `mode: "secondary"`, are in a "More actions" `MenuButton`. A high-impact action's inputs are taken when it is activated; the card's inputs are disabled while the approval is pending and after it. `Action.OpenUrl` links stay usable after a decision (they act on nothing) |
| Text | Bold, italic, links (http, https, mailto) and bulleted and numbered lists are formatted; `DATE()` and `TIME()` are formatted for the user's locale; everything else, HTML included, shows as text. TextBlocks always wrap. Text `color` values are drawn in the strong or muted text colour, never a hue that could fail contrast; tones show on container styles |

## Flows and journeys *[Amended 2026-10-21 — planned, FEAT-012, ADR-030]*

| Surface | Addition |
|---|---|
| `ux-builder-blueprint check` | The `flow.*` and `journey.*` checks (CONTRACT-005 *Flows and journeys*); with a HELIX marker, reads, never writes, the stories |
| `ux-builder-blueprint propose [--out <dir>]` | Writes HELIX proposals as patches (walkthroughs, solution design flowchart, architecture *Data Flow*, `DESIGN.md` navigation, story test plan scenarios) and a disagreement report; applies nothing. Exit 0 written; 2 no marker or usage |
| `ux-builder-blueprint draw [--out <dir>]` | IA map, flow and journey diagrams as Mermaid and SVG |
| `ux-builder-blueprint wireframes [--out <dir>]` | Each screen's pattern at each supported size class, HTML and PNG, neutral theme |
| `@ux-builder/mcp` | `check_blueprint` includes the new checks; `propose_from_blueprint` returns the proposals without writing them. *[Amended 2026-10-21 — build]* `check_blueprint` reads the stories under the HELIX marker above the server's directory; with none, its result adds `notes` saying the story checks were skipped |

*[Amended 2026-10-21 — build of FEAT-012 steps 4 and 5]* What the build
had to settle:
- **Arguments and defaults**: each command takes an optional blueprint file
  (default `app.blueprint.json`). `--out` defaults to `helix-proposals/`,
  `blueprint-drawings/` and `blueprint-wireframes/`. A rerun replaces the
  `.patch`, `.mmd`/`.svg` and `.html`/`.png` files an earlier run wrote there.
- **`propose` output**: one `<id>.patch` per section (a unified diff,
  paths relative to the marker's directory, so `git apply` works from the
  repository root), `report.md` (patches, disagreements with both texts,
  sections already current, problems) and `proposals.json` (the same, with
  each proposal's `target`: existing `{ id, type }` or new `{ id, type }`).
  No timestamps, so a rerun is byte-identical. Exit 0 also when there are
  disagreements: they are reported, not failures.
- **Where each draft goes** (HELIX v0.18.0 has no flow type): the story's
  `## Walkthrough`; `## Screen Flow` after *System Decomposition* in the
  solution design that links (or names as `**Feature**`) the journeys'
  stories' feature; architecture's `## Data Flow`, from the blueprint's
  **first** journey (the blueprint has no "primary" field); `### Destinations
  by Size Class` under `DESIGN.md`'s *Navigation and Active State*, so the
  person's active-state text is kept; and `## Journey Scenarios` after the
  story test plan's *Acceptance Criteria Test Mapping*. Documents are found
  by `ddx.type` and `ddx.id` under the marker's flow root; a story test plan
  by its link to the story, else `STP-<n>`. A missing solution design,
  architecture, `DESIGN.md` or story test plan is drafted from the installed
  template (`.claude/skills/helix/references/`, else `.agents/skills/…`) at
  its `output.location`, as a new-file patch; a missing story is a problem,
  never drafted.
- **Unwritten vs different**: a section that is empty, the template's own
  text or only placeholders (`[…]`, `%%` comments, empty diagrams) is
  drafted; one equal to the draft (ignoring whitespace and comments) is
  "current"; anything else is a disagreement and gets no patch.
- **`draw` output**: `ia`, `flow` and `journey-<id>`, each `.mmd` and
  `.svg`. The SVG is drawn by the package's own small layered layout from the
  same graph, not by Mermaid, so no Mermaid renderer or browser is a
  dependency.
- **`wireframes` output**: `<screen>.<size class>.html` and `.png`, drawn at
  390, 720, 1024, 1366 and 1920 px for compact to extra-large (the
  blueprint's supported size classes; compact, medium and expanded when it
  names none), linking `assets/plain.css`, `ui.css` and `patterns.css`. An
  app's screens are drawn in `AppShell` with its destinations, a view's
  without. Exit 2 when Playwright (`playwright` or `@playwright/test`) or its
  Chromium is missing; the HTML is still written.
- **`propose_from_blueprint`**: `{ blueprint, path? }`, `path` being where
  the blueprint lives (default `app.blueprint.json` in the server's
  directory). It returns `{ flow, helix, proposals: [{ id, kind, path,
  section, target, file, patch }], disagreements, current, problems,
  written: false }`, or an error naming `.helix.yml` when there is no marker.

## Modalities, verdicts and the journey report *[Amended 2026-10-21 — planned, FEAT-014, FEAT-015, ADR-032, ADR-033]*

### Starter

`npm create @ux-builder/app <dir> [--modality <list>]`. In a terminal with no
`--modality`, it asks for the modalities as a multi-select. With no terminal
and no `--modality`, it exits 1 listing them. An unknown or future modality
exits 1. A `--blueprint` whose `supports.modalities` disagrees with
`--modality` exits 1. The app is the empty shell of FEAT-014's matrix, with
no sample domain; its blueprint records `supports.modalities`, and its HELIX
FEAT-001 and US-001 describe the shell.

### Audit

`ux-builder-audit [--blueprint <file>] [--modality <list>] <urls>`. The
modalities come from the blueprint, else `--modality`, else
`responsive-web` (reported as assumed). They choose the widths and the rules.

`report.json` gains:

- `verdicts.theme`: `{ status, theme, designSystem, applied, sdkOnly, contrast: { light, dark }, findings: [ids] }`;
- `verdicts.modality`: one `{ modality, status, components: [{ name, present }], ruleFamilies: [{ family, checked }], fixes }` per modality;
- on every finding: `ruleId`, `rule: { statement, sources }`, `fix`, and with journeys `journey` and `step`.

`report.html` opens with the verdicts and a *Rules broken* table, then lists
journey → step (screenshot with numbered boxes) → finding, then *Other
screens*. Without journeys it groups by screen.

## Error Semantics

| Condition | Error / Outcome | Retry | Recovery Expectation |
|---|---|---|---|
| Install with a stale `@ux-builder:registry` line in user or app npm config | npm 401/403/404, or old versions | no | `npm config delete @ux-builder:registry` and remove the line from the app's `.npmrc` |
| `--theme` unknown to the starter | Exits 1 listing the themes | no | Pick a listed theme |
| `ThemeProvider theme` not loaded | Development warning; widgets use `ui.css` fallbacks | — | Import the theme's CSS |
| Appearance the theme lacks | Falls back to the theme's default; development warning | — | — |
| `ui.css` loaded before the theme CSS, or not at all | Widgets unstyled or on fallbacks | — | Fix the import order |
| No top-level `ThemeProvider` when audited | Audit switches by attributes, warns, skips favicon checks | — | Add a provider, or accept |
| Chromium not installed for the audit | Exit 2 | no | `npx playwright install chromium` |
| `--theme` names a theme the page does not load | `theme-applied` error (exit 1) | no | Load its CSS, or drop the option |

## Examples

```sh
npm create @ux-builder/app my-app -- --theme databricks
```

```jsx
import "@ux-builder/tokens/themes/databricks.css";
import "@ux-builder/tokens/fonts/databricks.css";
import "@ux-builder/ui/ui.css";
import { ThemeProvider, Button, ProgressBar } from "@ux-builder/ui";

<ThemeProvider theme="databricks" appearance="system" onChange={save}>
  <Button busy={saving}>Save</Button>
  <ProgressBar label="Uploading" value={40} />
</ThemeProvider>
```

```js
window.dispatchEvent(new CustomEvent("piq:set-theme", { detail: { theme: "praxis-carbon", appearance: "dark" } }));
```

```sh
npx ux-builder-audit --serve "npm run preview -- --port 4173" http://localhost:4173/ /settings
echo $?   # 0 clean, 1 findings, 2 could not run
```

## Non-Normative Notes

- The consumer guide in the repository README walks through this contract in
  order; package READMEs carry the detail for each package.
- Contract tests: `packages/ui/test/*` (exports, provider, event, lint),
  `packages/audit/test/audit.test.mjs` (options, exit codes, report),
  `packages/create-app/test/*` (starter), `packages/mcp/test/*` (tools).

## Validation Checklist

- [x] Normative fields and rules are explicit.
- [x] Compatibility and precedence rules are explicit.
- [x] Error handling is explicit.
- [x] At least one executable test can be derived from this contract (the tests named above).
- [x] Non-normative notes cannot be mistaken for contract requirements.
- [x] Operator review — accepted 2026-10-08.
