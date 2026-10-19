# @ux-builder/audit

Audits a running app's use of the AI-UI SDK theme. It opens the app in
Chromium, switches it through every theme and appearance it ships, as a user
would, and reports what does not follow the theme, with a screenshot of each
theme marking where.

```sh
npm install -D @ux-builder/audit
npx playwright install chromium        # once per machine

npx ux-builder-audit http://localhost:5173/
npx ux-builder-audit --serve "npm run preview -- --port 4173" http://localhost:4173/ /settings /matters
```

It prints a summary, writes `audit-report/index.html` (with the screenshots)
and `audit-report/report.json`, and exits 1 if it found an error.

## What it checks

| Check | Severity | What it holds the app to |
|---|---|---|
| `token-colors` | error | Every colour the app's own elements draw (text, fills, borders) is one of the active theme's colour tokens, at any opacity, or a mix of two. A colour that fails in every theme is called **hard-coded**. |
| `token-fonts` | error | Text is set in one of the theme's fonts. |
| `token-radii` | warning | Corners use one of the theme's radii (or are fully round). |
| `token-overrides` | error | No app stylesheet sets `--piq-*` tokens; the theme does. |
| `widget-overrides` | warning | No app stylesheet restyles an SDK widget, even under the SDK's own selector. |
| `sdk-widgets` | error / warning | No icon (`<svg>`) or logo image the app draws itself (errors); no native button, field, checkbox, table, progress bar or endless animation where the SDK has a widget (warnings). |
| `foreign-components` | warning | No other UI kit's components (Material UI, Ant Design, Chakra, Carbon React, Fluent UI, Mantine, Blueprint, PrimeReact). |
| `outside-theme` | warning | Nothing visible is outside the themed element, where it would never change. |
| `brand` | error / warning | The page's favicon is the theme's; a theme with a logo has `<Logo />` on the page. |
| `fonts` | warning / note | The fonts the SDK ships are loaded; notes fonts fetched from Google. |
| `contrast` | error / warning | Text meets WCAG AA (axe's colour-contrast). In the app's markup, an error; inside an SDK widget, a warning for the SDK team. A logo's text is exempt. |
| `theme-applied` | error | Each theme's CSS is on the page and applies. |
| `reflow` | warning | With `--width`: the page does not scroll sideways at the audited width, naming the widest element (WCAG 1.4.10 at 320px). A region that scrolls by itself is fine. |
| `target-size` | warning | With `--width`: pointer targets are at least the theme's minimum target size (WCAG 2.5.8); inline links in a sentence are exempt, and a checkbox counts its label. |
| `focus-obscured` | warning | With `--width`: no control, once focused, is entirely hidden behind sticky or fixed content (WCAG 2.4.11). |

The three `--width` checks are warnings for their first minor release, then
can fail a build like the rest. A finding inside a theme-builder preview
(`data-preview`) names that preview's option and design system.

SDK widgets (anything inside a `.piq-*` element) are trusted: their colours,
fonts and radii are the SDK's. The audit holds the app's own markup to the
theme, and the page's stylesheets to the SDK's.

## How it switches theme

The app's top-level `ThemeProvider` (`@ux-builder/ui` 0.6 or later) answers a
window event, as the app's own switcher would:

```js
window.dispatchEvent(new CustomEvent("piq:set-theme", { detail: { theme: "praxis-carbon", appearance: "dark" } }));
```

An app without one (it sets `data-theme` on `<html>` itself) is switched by
setting `data-theme` and `data-appearance` on its outermost themed element;
the report says so, and the favicon check is skipped.

## Options

| Option | |
|---|---|
| `--theme <name>` | Audit only this theme (repeat). Default: every theme the page loads. |
| `--appearance <light\|dark>` | Repeat. Default: both. |
| `--width <px>` | Repeat, e.g. one per size class: `--width 360 --width 720 --width 1024 --width 1366 --width 1920`. Every theme and appearance runs at each width, and the `reflow`, `target-size` and `focus-obscured` checks run. Default: 1280 only, without those checks. |
| `--serve "<command>"` | Start the app first, wait for the first URL, stop it afterwards. |
| `--wait <selector>` | Wait for this element on each page. |
| `--ignore <selector>` | Leave these elements out (repeat). Elements with `data-audit-ignore` always are, e.g. a chart. |
| `--off <check>` | Turn a check off (repeat). |
| `--no-contrast` | Skip the contrast check. |
| `--out <dir>` | Where the report goes. Default `audit-report`. |
| `--fail-on <error\|warning\|never>` | What makes the exit code 1. Default `error`. |
| `--json` | Print the report as JSON. |

A URL that starts with `/` is relative to the first full URL. The SDK's CSS
and theme list are read from the app's own `@ux-builder/ui` and
`@ux-builder/tokens` when run in the app's directory.

## From code

```js
import { audit } from "@ux-builder/audit";
import { writeReports } from "@ux-builder/audit/report";

const report = await audit({ urls: ["http://localhost:5173/"], themes: ["databricks"], out: "audit-report" });
writeReports(report, "audit-report");
if (report.summary.error) process.exitCode = 1;
```

## With an agent

The report is built to be handed to a coding agent: `report.json` names each
finding's element, value, the token or widget to use, and the themes it was
seen in. "Fix every error in `audit-report/report.json`, then run
`npm run audit` again" is a complete instruction.

## In CI

The starter (`npm create @ux-builder/app`) runs `npm run lint` and `npm run audit`
in `.github/workflows/ci.yml` and uploads `audit-report` as an artifact.
