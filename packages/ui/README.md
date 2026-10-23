# @ux-builder/ui

The widgets the harness and embedded products share: prefixed CSS (`.piq-*`)
plus a React 19 component for each, owning keyboard, focus, sorting, paging and
accessibility. Every rule reads a token from `@ux-builder/tokens`, so the theme on
the page decides how each widget looks.

| Component | What it is |
|---|---|
| `Button` | `variant` primary, secondary or text; `size="sm"`; `badge` for a count; `busy` shows a spinner over the label, sets `aria-busy` and ignores clicks |
| `TextField`, `TextArea` | Labelled input, single or multi-line, with `hint` and `error` (sets `aria-invalid`, wired with `aria-describedby`) |
| `Select` | Dropdown on a native select; in Chrome 135+ the open list is themed too (`appearance: base-select`) |
| `Checkbox`, `Switch` | Native checkboxes, restyled; the switch has `role="switch"` |
| `RadioGroup` | Native radios in a fieldset whose legend names the group |
| `ChoicePicker` | One choice from a few: a radio group drawn as segments, arrow keys move the selection |
| `Card` | Title, content and actions |
| `Notice` | In-page message, `tone` info, accent, success, warning or error |
| `StatusPill` | Availability status: live, limited, purchasing, evaluation, closed |
| `DataTable` | Sorts (`aria-sort`) and pages; numbers align right |
| `Toast`, `ToastProvider`, `useToast` | Confirmation with Undo in a polite live region; waits while hovered or focused |
| `ProgressBar` | `label` and `value` (of `max`, default 100) for known progress; without `value`, indeterminate. `role="progressbar"` |
| `Spinner` | `size` sm, md or lg (16, 24, 48px); `label` is announced (`role="status"`), shown with `showLabel` |
| `Skeleton` | Placeholder while content loads: `variant` text (`lines`), rect or circle; hidden from assistive technology |
| `Logo` | The active theme's logo or mark, from the brand's artwork; a brand without artwork shows its title as a wordmark |
| `Favicon` | Keeps the page's icon on the theme's favicon, for a page without a `ThemeProvider` |

## Using it

```sh
npm install @ux-builder/tokens @ux-builder/ui
```

```js
import "@ux-builder/tokens/themes.css";   // or one theme's file
import "@ux-builder/tokens/fonts.css";    // or one theme's: fonts/<theme>.css
import "@ux-builder/ui/ui.css";            // after the theme CSS
import { Button, DataTable, ToastProvider, useToast } from "@ux-builder/ui";
```

React 19 is a peer dependency. An app that is not React can use the CSS on its
own markup: the class names and structure are what each component renders.

### Theme and appearance

```jsx
import { ThemeProvider, useTheme } from "@ux-builder/ui";

<ThemeProvider theme="databricks" appearance="system">   {/* light | dark | system */}
  <App />
</ThemeProvider>

function Settings() {
  const { theme, appearance, preference, themes, setTheme, setAppearance } = useTheme();
  // appearance is always "light" or "dark"; preference may be "system"
}
```

The provider's element carries `data-theme` and `data-appearance`
(CONTRACT-003), so the theme CSS applies inside it; the nearest provider wins.
`appearance="system"` is resolved before first paint and follows the user's
preference. An appearance the theme lacks falls back to the theme's own, with
a development warning. For an embedded view (ADR-011), pass
`tokens={resolved.tokens}` instead of `theme`: the values are set as custom
properties and no stylesheet is needed.

The provider does not remember the user's choice. `onChange({ theme,
appearance })` is called on every switch (`appearance` is the preference, so
it may be `system`); store it and pass it back as props. `as` sets the
element (default `div`).

The top-level provider also answers a window event, so a tool (such as
`@ux-builder/audit`) or another part of the page can switch the theme as the
user would:

```js
window.dispatchEvent(new CustomEvent("piq:set-theme", { detail: { theme: "praxis-carbon", appearance: "dark" } }));
```

Nested and embedded providers ignore it.

Component tests run on the built package: `npm run build && npm test`.

### For AI coding agents

The package ships guidance an agent reads before writing UI, and a
machine-readable catalogue, both generated from this package's source so
they never name anything that does not exist (FEAT-004 SDK-12, SDK-13):

- `AGENTS.md`: the rules, how to set up, how to do common things, and
  a reference of every component and prop, role token, icon and theme.
- `skill/ux-builder-ui/SKILL.md`: the same, as a Claude Code skill. Install it
  in an app with
  `mkdir -p .claude/skills && cp -R node_modules/@ux-builder/ui/skill/ux-builder-ui .claude/skills/`.
- `catalogue.json` (`@ux-builder/ui/catalogue.json`): every token (path, tier,
  purpose, 0.x alias), every export (props and defaults, purpose), themes,
  design systems, icons and the lint rule.

Agents can also query the SDK over MCP with `@ux-builder/mcp`
(`claude mcp add ux-builder -- npx @ux-builder/mcp`): themes with every role
token's value, brands, design systems, widgets with props, tokens with
purposes, icons and this guidance.

### Interaction rules and the blueprint

`@ux-builder/ui/blueprint` holds the interaction and IA rules (navigation by
size, modals, safeguards, states, emphasis) and checks an app's plan against
them, in Node or a browser, with no network (FEAT-008, CONTRACT-005):

```js
import { rulesFor, checkBlueprint, findRecipes, skeleton } from "@ux-builder/ui/blueprint";
rulesFor({ context: "view", sizeClasses: ["compact", "medium"], inputs: ["coarse"] }); // the rules for an embedded view
checkBlueprint(JSON.parse(readFileSync("app.blueprint.json", "utf8")));              // [{ rule, severity, path, message, fix }]
```

The command `ux-builder-blueprint` does the same from a shell:
`ux-builder-blueprint init [--kind app|view]` writes a starting
`app.blueprint.json`, and `ux-builder-blueprint check app.blueprint.json`
prints each finding and exits 1 on an error. `check <file> --diff <base>`
also reports the complexity the change adds over a base blueprint: per
journey, the screens, steps, required inputs and decisions added and
removed, and a `simplicity.delta-decided` warning for a journey that grows
with no recorded decision naming the addition (FEAT-018). With `--json` it
prints `{ findings, delta }`. From a blueprint's actions
and journeys (FEAT-012), `ux-builder-blueprint propose` drafts HELIX
content as patches it never applies, `draw` writes the IA map, flow and
journey diagrams as Mermaid and SVG, and `wireframes` renders each screen's
pattern at each supported size class as HTML and PNG (PNG needs
`playwright` and its Chromium). Every declared state is drawn too
(FEAT-015 RPT-09): `draw` writes `states-<screen>.mmd` (a Mermaid
`stateDiagram-v2` with each state the screen declares and the transitions
between them), its SVG, and `states-<screen>.md` with a state table (what
the user sees, the action available, the live-region announcement) and
notes on the default transitions and any state the screen does not
declare; `wireframes` writes `<screen>.<state>.<size>.html` and `.png` for
each state beside the ideal `<screen>.<size>.html`; and `propose` drafts
HELIX's interaction-state-diagram, wireframe, screen-flow and
user-journey-map documents, as patches when the installed HELIX defines
those types and otherwise as drafts under `helix-proposals/drafts/`. See
the repository README. The rules, recipes and the
blueprint schema are also in `catalogue.json` (`interaction`) and in
`AGENTS.md`.

The rules restate guidance from Apple's Human Interface Guidelines, Material
Design 3, WCAG 2.2 and the WAI-ARIA Authoring Practices in this package's own
words, with links to the sources. ux-builder is not affiliated with or endorsed by Apple or Google. Human Interface Guidelines is a trademark of Apple Inc., and Material Design is a trademark of Google LLC.

For other agents, point the app's own `AGENTS.md` or `CLAUDE.md` at
`node_modules/@ux-builder/ui/AGENTS.md`. In this repository, `npm run catalogue`
regenerates them, and `npm run check` fails if they are stale.

### Lint

`ux-builder/no-hard-coded-values` reports literal colours, font families and
border radii in app CSS and JSX `style` props, and names the role token to
use when your theme has one with that value (FEAT-004 SDK-10, SDK-11).

```json
// .stylelintrc.json
{ "plugins": ["@ux-builder/ui/stylelint"],
  "rules": { "ux-builder/no-hard-coded-values": [true, {
    "theme": "databricks",
    "allow": [{ "value": "#4E79A7", "file": "src/charts/**", "reason": "chart series colours" }]
  }] } }
```

```js
// eslint.config.js
import uxBuilder from "@ux-builder/ui/eslint";
export default [{ files: ["src/**/*.jsx"], plugins: { "ux-builder": uxBuilder },
  rules: { "ux-builder/no-hard-coded-values": ["error", { theme: "databricks" }] } }];
```

`#1B3139` under `databricks` reports *use var(--piq-color-text)*. Tokens,
`var()` fallbacks, `transparent`, `currentColor`, CSS-wide keywords, `0`,
generic font families and fully round radii (50%, 999px) are fine. Every
allow-list entry needs a `reason`; one without is reported. stylelint and
ESLint are optional peer dependencies.

Two more ESLint rules catch what the SDK already provides:

```js
rules: {
  "ux-builder/no-foreign-ui": ["error", { allow: [] }],   // package names you have reviewed
  "ux-builder/no-inline-svg": ["error", { allow: ["chart"] }],   // <svg> class names or ids
}
```

`ux-builder/no-foreign-ui` reports imports of other UI kits (Material UI, Ant
Design, Chakra, Carbon React, Fluent UI, Mantine, Bootstrap, Blueprint,
PrimeReact, Radix Themes), icon sets (lucide-react, react-icons, Heroicons,
Phosphor, Tabler, Font Awesome) and loader libraries, naming the SDK's
counterpart. `ux-builder/no-inline-svg` reports `<svg>` written in JSX: use
`<Icon>`, `@ux-builder/ui/icons` or `registerIcons`. Lint reads source; for
what only the running app shows, run `@ux-builder/audit`.

`ux-builder/ai-neutral-voice` (a warning, US-081) checks the copy around AI
features in JSX text and string attributes. "I think", "I feel", "I
understand", "I believe" and their variants present the AI as a person (rule
`ai.not-a-person`); a label like "Copilot, summarize" makes the AI the actor
(`ai.user-initiates`): write "Summarize" or "Summarize with Copilot". It checks
English only, and not text the model writes at run time. A brand with a
deliberate persona opts a string out with `// ux-builder-ai-persona` (or
`{/* ux-builder-ai-persona */}` in JSX children) on the line before it.

`uxBuilder.configs.recommended` turns on all four rules, with the voice rule
as a warning: `export default [{ files: ["src/**/*.jsx"], ...uxBuilder.configs.recommended }]`.

### Icons

```jsx
import { Icon, ICON_NAMES } from "@ux-builder/ui";

<Icon name="warning" />                         {/* decorative: aria-hidden */}
<Icon name="search" label="Search" size="1.25rem" />   {/* role="img", named */}
```

One component, shared names (`ICON_NAMES`: add, close, search, warning, …,
33 in all). The glyph follows the theme's design system: Material Symbols on
Material, Fluent System Icons on Fluent, Carbon icons on Carbon, and Lucide
on every theme without a set of its own (praxis, plain, synaptiq,
databricks). The set comes from the nearest `ThemeProvider`, else the closest
`data-theme` in the page; `set="material"` forces one. A name a set lacks is
drawn from Lucide. Icons take the text colour and are 1em unless `size` says
otherwise.

### Every other icon

`@ux-builder/ui/icons` has every Lucide icon (2,130) by its Lucide name, each
with Material, Fluent or Carbon's own glyph where one matches (about 420,
410 and 350 of them; Lucide's otherwise, as on any theme without a set).
One export per icon, so an app's bundle carries only those it imports:

```jsx
import { Icon, registerIcons } from "@ux-builder/ui";
import { iconPin, iconPlay, iconPaperclip } from "@ux-builder/ui/icons";

<Icon icon={iconPin} label="Pin" />
registerIcons(iconPlay, iconPaperclip);      // once, then:
<Icon name="play" />
```

The export is `icon` + the name in PascalCase; `ICON_LIBRARY_NAMES` lists
them, and so do `catalogue.json` (`iconLibrary`) and the MCP tool
`list_icons` with a query. Matches come from the name itself, word
synonyms per set and hand-checked overrides (Material's own `pin` is a
PIN keypad, so `pin` there is `keep`), so a set never draws the wrong
idea. For an icon the library lacks, register the app's own,
`registerIcons({ name, glyphs: { lucide: { viewBox, body } } })`, and it
draws through `Icon` like the rest; markup with scripts, handlers or
links is refused.

The glyphs are extracted at build time (`npm run icons`) from pinned icon
packages, so an app installs none of them; each set's licence ships in
`licenses/` (Apache-2.0, MIT, Apache-2.0, ISC). A test fails if the extracted
glyphs drift from the packages.

### Logo

```jsx
import { Logo } from "@ux-builder/ui";

<Logo />                  {/* the brand's logo at the brand's height */}
<Logo variant="mark" size="sm" />   {/* the mark, compact */}
```

The artwork comes from the theme's brand tokens (`--piq-brand-logo-image`,
or a mask painted in the logo colour), so the logo changes with the theme and
the appearance and the app imports no file. A brand without artwork shows its
title as a wordmark in its logo colour (the mark: its initial). It is one
image named by the brand's title, or by `label`. Brand tokens belong to the
top-level app (CONTRACT-001): in an embedded view (`ThemeProvider` with
`tokens`) `Logo` draws nothing.

### Favicon

The top-level `ThemeProvider` keeps the page's icon on the theme's favicon
(`--piq-brand-favicon`) as the theme and appearance change: it adds one
`<link rel="icon" data-piq-favicon>` last in the head, so browsers prefer it
to the app's own. A theme without a favicon removes it, and the app's own
`<link rel="icon">` shows again, so keep one in `index.html`.
`favicon={false}` turns this off; an embedded view or a nested provider never
touches the icon. A page that sets `data-theme` on `<html>` without a provider
renders `<Favicon />` once; `applyFavicon(element)` does the same by hand.

## How a theme shapes a widget

Every rule reads CONTRACT-001 role names (`--piq-color-text`,
`--piq-button-radius`), never a 0.x alias. The base tokens every theme has
(colour and state roles, type, `--piq-button-*`, `--piq-pill-*`,
`--piq-badge-*`, radius, shadows, `--piq-focus-*`, `--piq-state-layer-*`)
style every widget. On top of them, a design system may set widget tokens:
`--piq-field-*`, `--piq-check-*`, `--piq-switch-*`, `--piq-menu-*`,
`--piq-choice-picker-*`, `--piq-card-*`, `--piq-notice-*`, `--piq-toast-*`,
`--piq-table-*`, `--piq-progress-*`, `--piq-spinner-*`, `--piq-skeleton-*`,
and the `--piq-button-secondary-*` and `--piq-button-ghost-fg` variants. Each has a fallback in
`ui.css` that reproduces the treatment the platform's `ui.css` gave that widget,
so `praxis` and `plain` look as they did, and `praxis-material`,
`praxis-fluentui` and `praxis-carbon` set them to their system's anatomy:

| | Material 3 | Fluent 2 | Carbon |
|---|---|---|---|
| Button | Full pill, 40dp; outlined secondary | 4px, 32px; neutral secondary | Square, 48px; tertiary outline |
| Field, dropdown | Filled, top corners, 2dp underline on focus | Outlined 4px, brand bar on focus | Bottom rule on a layer, 2px inset focus |
| Open list | 48dp items, tonal selection, level 2 | 32px options, brand bar on the selected, shadow16 | Square, 40px items, overlay shadow |
| Checkbox, radio | 18dp, 2dp outline, primary | 16px, 1px stroke, brand | 16px, ink fill |
| Switch | 52×32dp, thumb grows when on | 40×20px | 48×24px, green when on |
| Choice picker | Joined pill segments, tonal selection with a tick | Separate toggle buttons | Square content switcher, inverse selection |
| Notice | Tonal container, 12dp | Tinted bar with a tinted edge | 3px stripe, square |
| Toast | Inverse snackbar | Neutral with shadow8 | Striped, with overlay shadow |
| Table | 52dp rows | 44px rows, semibold header | 48px rows, header on its own layer |

Hover and press on the M3, Fluent and Carbon controls are a state layer: the
label's own colour mixed over the container at the system's percentage.

The selected segment's label is `--piq-choice-picker-option-selected-fg` on
`--piq-choice-picker-option-selected-bg`, which the contrast gate checks, so
the platform's literal `#fff` on `--navy` (1.25:1 in
Praxis dark) is gone; the fallback is the primary button's pairing.

## Building

`npm run build` at the repo root builds `@ux-builder/tokens`, then this package:
`dist/index.js` (ES module, React external) and `dist/ui.css`. The gallery
renders these built components, so it shows exactly what an app gets.

## Storybook

```sh
npm run storybook          # from the repo root: builds tokens, serves on :6006
npm run build-storybook    # static build in packages/ui/storybook-static
```

Every story renders inside a theme picked from the toolbar (Praxis, Praxis
Material, Fluent and Carbon, Synaptiq and Databricks, each dark or light;
Plain) and is delivered one of two ways: the theme CSS with
`data-theme` and `data-appearance`, as the apps do, or the theme's resolved
JSON as inline custom properties, as the harness will hand a theme to an
embedded view. A widget that looks the same both ways depends on nothing but
the token contract. Themes are linkable:
`?globals=theme:plain-light;delivery:resolved`.

The Accessibility panel (axe) checks what the browser renders, so it catches
literal colours in widget rules that the token-level contrast gate cannot. It
reports rather than fails until the contrast baseline is empty (step 4).

Stories cover the buttons, fields, choice picker, table, feedback (notice,
status pill, toast), loading widgets, icons and the theme provider;
`Foundations/Text roles` draws every pairing the contrast gate checks, from
the gate's own list (`tools/contrast.mjs`). CI builds Storybook on every pull request and uploads
it as the run's `storybook` artifact.
