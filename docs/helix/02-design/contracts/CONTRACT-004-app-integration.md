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
---

# Contract

**Contract ID**: CONTRACT-004 — App integration
**Type**: library and CLI (the package entry points, React API, lint rules, audit command and MCP server an app builds on)
**Version**: v1 (current releases: `@ux-builder/tokens` 1.6.0, `@ux-builder/ui` 0.6.3, `@ux-builder/create-app` 0.4.2, `@ux-builder/audit` 0.1.2, `@ux-builder/mcp` 0.3.1; each amendment below names the release it is normative from)
**Status**: accepted — by the operator 2026-10-08, as written; matches the packages released that day. *Screen patterns* (below), an amendment of 2026-10-18 for FEAT-006 (ADR-020, ADR-021, ADR-022) accepted with those ADRs, shipped in `@ux-builder/ui` 0.6.0. The amendments for FEAT-008, FEAT-009 and FEAT-010 ship in `@ux-builder/ui` 0.7.0, `@ux-builder/audit` 0.2.0, `@ux-builder/mcp` 0.4.0 and `@ux-builder/create-app` 0.5.0.
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
