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
| `one-modal` | warning | At most one modal dialog is open at once (rule `modal.one-at-a-time`). |
| `modal-contract` | warning | An open modal has an accessible name, a Close, Cancel or Done control, and closes on Escape (rules `modal.titled`, `modal.dismiss`). Escape is tried last, once per page. |
| `one-primary-action` | warning | At most one primary button per dialog, or in `main` (rule `emphasis.one-primary`). |
| `nav-per-breakpoint` | warning | With `--width`: below 600px, primary navigation shows no more than five destinations; from 840px it is not hidden behind a menu button (rules `nav.compact-destinations`, `nav.standing-at-expanded`). Breadcrumbs and navigation inside `main` are left out. |
| `line-length` | warning | Paragraphs and list items average no more than 80 characters per line (rule `text.line-length`). |

The `--width` checks and the interaction checks are warnings for their first
minor release, then can fail a build like the rest. A finding from an
interaction check carries `ruleId`, the rule in `@ux-builder/ui`'s catalogue
it enforces, and `sources`, the guidelines that rule restates; the HTML report
links them. A finding inside a theme-builder preview
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
| `--write-baseline <file>` | Write every finding (not notes) to this file, in a stable order. Run it once when adopting the audit in an existing app, and commit the file. |
| `--baseline <file>` | Leave out the findings in this file: they are not reported and do not affect the exit code. New findings are reported as usual; baselined ones no longer found are listed as resolved, so the file can shrink. A check the file names that this version lacks is ignored with a note. |

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

## UX assessment

`ux-builder-audit assess` helps a coding agent assess a HELIX-governed app's
UX (FEAT-009, CONTRACT-006). The agent does the reasoning, guided by the
skill `skill/ux-builder-assess/SKILL.md` shipped in this package; the
commands do the deterministic work. An assessment writes only under its
output path (`ux-assessment/<run>/` by default) and never changes the app's
code or its HELIX documents.

| Command | Does |
|---|---|
| `assess init` | Proposes `ux-assessment.yml` from the repository: the HELIX marker, flow and catalogue, the test scripts, and the flow's stories as candidate journeys, by ID only. Values it cannot work out are `<fill-in: …>` |
| `assess validate` | Checks the manifest against its schema, the repository and HELIX: the marker as HELIX reads it, one flow, existing stories, criteria and commands, credentials only by reference, local or staging only |
| `assess collect --run <R-id>` | Writes `requirements.json` (every HELIX document with its type, ID, path, hash and revision; goals, roles, stories and criteria) and `traceability.json` (each journey's criteria, linked to the tests that cite them with `@covers`, or marked uncovered) |
| `assess baseline --run <R-id>` | Runs the declared tests and the audit before any change, and writes `baseline.json`; a page not on the SDK is also inspected as it is, with its SDK-adoption gaps counted apart |
| `assess browser` | Starts Chromium with a CDP endpoint for the agent's browser driver (Playwright MCP: `--cdp-endpoint <url>`) |
| `assess inspect --cdp <url> --page <match> --checkpoint <C-id>` | Inspects the page the agent reached, in place: no reload, no reset, same session. Writes `inspection.json`, a screenshot and the accessibility tree. `--replay <steps.json>` reproduces a state instead, and inspects it only if the expected state is there |
| `assess plan --run <R-id>` | Writes the journey plan (goal, criteria, expected outcomes, the E2E tests to reuse) and a coverage matrix with every journey × state pair, so nothing passes by being left out |
| `assess browser --manifest f` | Refuses every host outside `run.origins` at the browser; `inspect --manifest` also refuses off-origin pages and masks the manifest's selectors and text |
| `assess reset --fixture <id>` | Runs a fixture's reset between scenarios |
| `assess merge --run <R-id>` | One finding per user problem, with every evidence reference and a stable `F-` ID |
| `assess propose --finding <F-id> --target <HELIX ID> \| --new <type>` | Writes a patch against a HELIX artifact (by `ddx.id`), or a new instance named and numbered by the catalogue and drafted from its template; nothing is applied |
| `assess check-writes`, `assess apply-check P-<n>` | Nothing under the HELIX root or the app changed during the run; a proposal's target is unchanged before it is applied |
| `assess report <run-dir>` | `report.html`, `report.md` and `evidence.json`: what was checked, seen and left uncertain; heuristics as recommendations; claims for representative users |
| `assess compare <earlier> <later>` | Each finding new, persistent, resolved, regressed or not rechecked; an unassessed state never resolves one |
| `assess gate <run-dir> --fail-on P1` | For CI: fails on an open finding at that priority or above, or a blocked stage. See `examples/ux-assessment.workflow.yml` |
| `assess validate-report <run-dir>` | Checks a run package: every record's schema, the coverage matrix, walkthroughs, findings and proposals |

The manifest binds HELIX rather than describing it: name the flow (or let the
marker's `defaults.flow` choose), and the assessment finds the documents and
their types the way HELIX does.

```yaml
version: 1
app: { name: Review app }
helix: { flow: helix }
run: { start: npm run preview, baseUrl: http://127.0.0.1:4173/, environment: local }
roles: [{ id: reviewer, auth: { storageState: .auth/reviewer.json } }]
journeys:
  - { id: J-review, story: US-012, priority: critical, role: reviewer, entry: /queue }
tests: [{ id: e2e, command: npm run test:e2e }]
restrictions: { writes: report-only }
```

From code, `inspect(page)` runs the audit's checks on a Playwright page as it
is; `audit()` is built on it. Checks that change the page (`focus-obscured`,
pressing Escape in dialogs) run only with `stateAffecting`, and the result
says what could not be put back.

A clean audit is not proof of usability or of full accessibility
compliance, and passing functional tests do not show that usability criteria
are met. The assessment says what it checked, what it saw and what remains
for representative users to confirm.

## In CI

The starter (`npm create @ux-builder/app`) runs `npm run lint` and `npm run audit`
in `.github/workflows/ci.yml` and uploads `audit-report` as an artifact.
