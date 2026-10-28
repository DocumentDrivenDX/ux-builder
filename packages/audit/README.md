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

It prints a summary, writes `docs/ux-builder/audit-report/index.html` (with the screenshots)
and `docs/ux-builder/audit-report/report.json`, and exits 1 if it found an error.

Every report on the app is linked from one page, `docs/ux-builder/reports.html`
(`reports.html` at the top of an app on the old layout): the latest UI audit
and each usability assessment run, newest first, with the latest run's
journeys step by step and the `@ux-builder` versions that wrote each. It is
rewritten whenever either report is written; `npx ux-builder-audit reports
[--open]` rewrites it and prints its path. `npx ux-builder-audit doctor
[--json]` lists the installed `@ux-builder` packages and exits 1 when one's
range on another is not met by the version installed.

## What it checks

| Check | Severity | What it holds the app to |
|---|---|---|
| `token-colors` | error | Every colour the app's own elements draw (text, fills, borders) is one of the active theme's colour tokens, at any opacity, or a mix of two. A colour that fails in every theme is called **hard-coded**. |
| `token-fonts` | error | Text is set in one of the theme's fonts. |
| `token-radii` | warning | Corners use one of the theme's radii (or are fully round). |
| `token-overrides` | error | No app stylesheet sets `--piq-*` tokens; the theme does. |
| `widget-overrides` | warning | No app stylesheet restyles an SDK widget, even under the SDK's own selector. |
| `sdk-widgets` | error / warning | No icon (`<svg>`) or logo image the app draws itself (errors); no diagram or chart the app draws as its own `<svg>`, where `<Visual>` from `@ux-builder/visuals/react` draws it (a warning; `.chart` or `data-audit-chart` opts out); no native button, field, checkbox, table, progress bar or endless animation where the SDK has a widget (warnings). |
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
| `ai-disclose` | warning | AI-generated content (`data-piq-ai="generated"`) has a visible disclosure: its own, an ancestor's `data-piq-ai-label`, or an `aria-describedby` label (rule `ai.disclose`). |
| `ai-correct` | warning | Generated content has a retry, regenerate, edit or undo control in or beside it (rule `ai.correct`). |
| `ai-stop` | warning | A busy AI status region (`data-piq-ai="status"`, `aria-busy="true"`) has a reachable Stop or Pause control in or beside it (rule `ai.stop`). |
| `ai-starters` | warning | An empty conversation's prompt (`data-piq-ai="prompt"`) offers suggested starting points, and stays open to typing (rule `ai.starters`). |
| `ai-declared` | warning | With `--blueprint`: a screen showing AI markup declares an AI role; the page names its screen with `data-piq-screen` (rule `ai.declared`). |
| `agent-approval` | warning | An approval (`data-piq-ai="approval"`) offers approve and deny controls, neither pre-selected nor `autofocus` (rule `agent.approve-high-impact`). |
| `agent-plan` | warning | An agent's plan has steps, each with `data-piq-ai-status` and that status in text (rule `agent.plan-visible`). |
| `agent-interrupt` | warning | A running agent has a reachable Pause or Stop control somewhere on the page (rule `agent.interrupt`). |
| `agent-who-acts` | warning | Where the user can take over (`data-piq-ai-takeover`, or `ai.takeover` with `--blueprint`), a live region says who is acting (`data-piq-ai-actor`) (rule `agent.who-acts`). |
| `agent-recover` | warning | A failed step says in text what went wrong and has a retry or previous-step control (rule `agent.recover`). |
| `agent-summary` | warning | A finished run (`data-piq-ai-status="done"` on its status) shows a summary (`data-piq-ai="summary"`) (rule `agent.summary`). |
| `genui-review-prefill` | warning | Values the AI pre-fills in inline UI are editable, and the inline UI has a submit control of its own, apart from the conversation's (rule `genui.review-prefill`). |
| `card-input-label` | warning | Every input in generated UI, such as a rendered Adaptive Card, has a label of its own; a placeholder is not one (rule `card.input-label`). |
| `card-narrow-first` | warning | With `--width`: below 600px, generated UI does not scroll sideways (rule `card.narrow-first`). |

The AI checks look only at the AI markup in CONTRACT-005 (`data-piq-ai` and
its companions), which `@ux-builder/ui`'s assistant components emit and an
app's own AI UI adds: a page without it gets no AI finding. The page's other
checks apply inside generated UI as anywhere else.

The `--width` checks and the interaction checks are warnings for their first
minor release, then can fail a build like the rest. A finding inside a
theme-builder preview (`data-preview`) names that preview's option and design
system.

### Every finding names its rule

Every check is a rule in `@ux-builder/ui`'s catalogue (`guidelines/rules.json`):
the theme and design-system checks are the `theme.*` rules (`theme.token-colors`,
`theme.contrast`…), the others the interaction and AI rules named above.
`tools/check-rules.mjs` fails a check that no rule names. Each finding in
`report.json` carries:

| Field | |
|---|---|
| `check` | The check that found it (`token-colors`). `--off` and baselines use it. |
| `ruleId` | The catalogue rule it breaks (`theme.token-colors`). A check that enforces several rules (`nav-per-breakpoint`, `modal-contract`) names the one each finding breaks; otherwise the check's `theme.*` rule, else its first. |
| `rule` | `{ id, title, statement, sources }`: the rule in full, in the SDK's words. |
| `sources` | The guidelines the rule restates, as `{ title, url }`. |
| `fix` | What to do about it. A contrast finding's fix starts with the measured ratio (`Measured 3.09:1; it needs at least 4.5:1.`), also in `measured`. |
| `screen`, `journey`, `step` | With `--blueprint`: the screen the page is, and the first journey and step that visit it (`steps` lists every one when there are several). |

(Before 0.3, `rule` held the check's name; read `check` instead.)

## Verdicts and modalities

The report opens with two verdicts (FEAT-014), in `report.json` as `verdicts`:

- **Theme** (`verdicts.theme`): the theme the page declares and its design
  system, whether it applies, whether every component is the SDK's, and
  contrast in light and dark, each item `pass`, `warn` or `fail` with the
  `theme.*` rules and findings behind it.
- **Modality fit** (`verdicts.modality`, one per modality): the SDK components
  the modality needs, and whether its rule families were checked, with the fix
  for anything missing. `chat` and `hybrid-chat` need the SDK's `Conversation`
  (its log and composer; missing, the verdict fails); `hybrid-chat` also an
  Adaptive Card part (missing, it warns). `responsive-web` is judged by
  outcome: each page is framed by `AppShell`, or by a `main` landmark whose
  content fits (no sideways scroll) at every audited width (neither, it
  fails, saying which: "content overflows at 390px", or AppShell missing with
  no `main`); where there is navigation it adapts by size class, the bottom
  bar below 600 px and the side navigation from 840 px (not adapting, it
  warns). An app with one top-level destination, or an AppShell with no
  navigation items, has no navigation to adapt.

The modalities come from the blueprint's `supports.modalities`, else
`--modality`, else `responsive-web`, which the report says it assumed. Named,
they choose the widths of FEAT-014's matrix (`responsive-web` 390, 768 and
1280; `chat` and `hybrid-chat` 390 and 1280; the union for several) unless
`--width` is given, only those of the size classes the app chose
(`supports.sizeClasses`, else `--size-classes`; compact 390, medium 768,
expanded 1280, large 1600): a size class not chosen is never audited or
reported unchecked. And they choose the rule families: a check whose rules are of no
family the modalities need is not run (`chat` runs no `nav`, `modal` or
`emphasis` check; only `hybrid-chat` runs the `card` checks). Assumed, every
check runs at the widths `--width` gives, as before.

## The report, by journey

`index.html` reads in this order:

1. the theme and modality-fit verdicts;
2. **Rules broken**: each rule's ID, statement and sources, how many findings
   break it and links to them (a finding shown under several steps counts
   once);
3. with `--blueprint` and its journeys: each journey, each of its steps with
   its screen's screenshot (the findings' numbered boxes drawn on it) and every
   finding on that screen: its severity, the rule ID and full statement, its
   sources, the evidence (the element, its box and the runs it was seen in)
   and the fix. A screen on several journeys is shown under each step. Then
   **Other screens**: screens no journey visits, and pages that map to no
   screen. Without journeys, one section per screen (or page);
4. every check, as an index.

A page maps to its screen by `data-piq-screen="<screen id>"` on any element,
else by the screen whose `path` (`"path": "/settings"`) it is served at.

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
| `--out <dir>` | Where the report goes. Default `docs/ux-builder/audit-report` in an app with `docs/ux-builder/`, else `audit-report`. |
| `--fail-on <error\|warning\|never>` | What makes the exit code 1. Default `error`. |
| `--json` | Print the report as JSON. |
| `--write-baseline <file>` | Write every finding (not notes) to this file, in a stable order. Run it once when adopting the audit in an existing app, and commit the file. |
| `--baseline <file>` | Leave out the findings in this file: they are not reported and do not affect the exit code. New findings are reported as usual; baselined ones no longer found are listed as resolved, so the file can shrink. A check the file names that this version lacks is ignored with a note. |
| `--blueprint <file>` | The app's blueprint (default `docs/ux-builder/blueprint/app.blueprint.json`). Its `supports.modalities` choose the widths and rule families; the report follows its journeys, step by step, matching each page to a screen by `data-piq-screen="<screen id>"`, else by the screen's `path`. AI markup on a screen whose blueprint declares no AI role is reported (`ai-declared`); the screen's `ai.roles` and `ai.takeover` apply to the agent checks. |
| `--modality <list>` | The app's modalities when the blueprint names none, comma-separated: `responsive-web`, `chat`, `hybrid-chat`. They choose the widths and rule families, and the report gives a modality-fit verdict for each. A future modality (`ios`, `android`, `macos`, `windows`) or an unknown one exits 2. Without it or a blueprint, `responsive-web` is assumed. |
| `--size-classes <list>` | The size classes the app chose when the blueprint names none (`supports.sizeClasses`), comma-separated: `compact`, `medium`, `expanded`, `large`. Only their widths are audited (390, 768, 1280, 1600), and one not chosen is never reported unchecked. An unknown one exits 2. |

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
finding's element, value, the rule it breaks in full, the fix, and the themes
and widths it was seen in. "Fix every error in `docs/ux-builder/audit-report/report.json`, then run
`npm run audit` again" is a complete instruction.

## UX assessment

`ux-builder-audit assess` helps a coding agent assess a HELIX-governed app's
UX (FEAT-009, CONTRACT-006). The agent does the reasoning, guided by the
skill `skill/ux-builder-assess/SKILL.md` shipped in this package; the
commands do the deterministic work. An assessment writes only under its
output path (`docs/ux-builder/assessments/<run>/` by default: beside the manifest at `docs/ux-builder/ux-assessment.yml`; an app without `docs/ux-builder/`, or one that still keeps `ux-assessment.yml` at its top until `ux-builder-design migrate`, keeps both there and its runs in `ux-assessment/<run>/`. Paths inside the manifest are relative to the app, wherever the manifest is) and never changes the app's
code or its HELIX documents.

| Command | Does |
|---|---|
| `assess init` | Proposes `docs/ux-builder/ux-assessment.yml` from the repository: the HELIX marker, flow and catalogue, the test scripts, and the flow's stories as candidate journeys, by ID only. Values it cannot work out are `<fill-in: …>` |
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
| `assess report <run-dir>` | `report.html`, `report.md` and `evidence.json`: what was checked, seen and left uncertain; the findings by journey, then the state it was walked in, then step, each with its rule ID and full statement (or heuristic and source), evidence, severity on Nielsen's 0 to 4 scale and fix (a finding at no step under its state's *General*); heuristics also indexed as recommendations; claims for representative users. `report.md` is a HELIX `usability-evaluation-report` (`ddx:` frontmatter linking its journeys and stories), drafted from the installed HELIX's template when it defines that type |
| `assess compare <earlier> <later>` | Each finding new, persistent, resolved, regressed or not rechecked; an unassessed state never resolves one |
| `assess video --run <R-id>` | Replays each walked journey (its steps' `do`) in a browser of its own, signed in as its role, with `evidence.redact` masked from the first frame, pausing at each checkpoint's findings; writes `video/`: an MP4 per journey with the findings drawn in (needs `ffmpeg` on the PATH), the clean recording and its annotation timeline, captions, a chapter track with a chapter per step (`J-review · step 2: entry`), and `index.html`, a player whose findings pop up, pause the video and link to the report (FEAT-013). Each caption has the problem in plain English, the rule's ID and full statement (or heuristic and source) and the fix. `--pace slow\|normal\|fast` (default normal): a step holds 2 s, a finding max(5 s, its caption's words at 200 a minute); slow × 1.5, fast × 0.6, never under 1 s a step or 3 s a finding (FEAT-015) |
| `assess gate <run-dir> --fail-on P1` | For CI: fails on an open finding at that priority or above, or a blocked stage. See `examples/ux-assessment.workflow.yml` |
| `assess heuristics <run-dir>` | The heuristic inspection pass (FEAT-018): `heuristics.json` with an entry for every walked screen × heuristic (Nielsen's ten, error prevention and recovery, information hierarchy, navigation complexity); `--screen --heuristic --finding F-… \| --no-finding` records one. Screens no step reached are listed as not inspected |
| `assess hierarchy --page <file>` | Is a page's content (HTML, or an inspection's `tree.yml`) in its screen's `screens[].content` order? Exit 1 names the first content out of order. Works on exploratory prototype pages, matched by `data-piq-screen` |
| `assess metrics <run-dir>` | `metrics.json`, every metric agent-measured: per walked journey, completion (or the step where it stopped), interactions, moves against the blueprint's shortest path, the path taken, backtracks, failed actions, information not found, interface errors and time per step (from the steps' `screen`, `at`, `failed`, `notFound` and `error`). The report shows them with the statement that agents navigate differently from people |
| `assess validate-report <run-dir>` | Checks a run package: every record's schema, the coverage matrix, walkthroughs, findings and proposals; a finding that names neither a rule (`rule`, a catalogue rule ID) nor a heuristic (`heuristic: { name, source }`) fails |

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

A journey can come from the app's blueprint (`docs/ux-builder/blueprint/app.blueprint.json`, or `app.blueprint.json` in an app on the
old layout, or the manifest's `blueprint` path) instead: `{ blueprint: J-review, role: reviewer, priority: critical }`
takes its story, criteria, entry screen, steps and alternates from there, and
`assess plan` turns each alternate into a walkthrough of its journey-and-state
pair. A journey through an assistant or agent is marked `ai: true` and
declares three scenarios, `normal`, `errorProne` and `risky` (with `step`, the
high-impact step); its plan carries the catalogue's AI rules for its roles as
heuristics, and `assess inspect --scenario risky` stops at the approval,
records it and chooses Deny. No step that would activate an approve control
(`data-piq-ai-control="approve"`) is ever taken.

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
in `.github/workflows/ci.yml` and uploads `docs/ux-builder/audit-report` as an artifact.
