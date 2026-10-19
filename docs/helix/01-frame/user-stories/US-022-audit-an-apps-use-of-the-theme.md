---
ddx:
  id: US-022
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: CONTRACT-003
    - kind: informed_by
      to: US-013
    - kind: informed_by
      to: CONTRACT-004
---

# US-022: Audit an app's use of the theme

**Feature**: FEAT-004 — App SDK
**Feature Requirements**: SDK-18, SDK-10
**PRD Requirements**: FR-17
**Priority**: P1
**Status**: Draft

## Story

**As a** tech lead of an app built on the SDK (or the design-system team reviewing one)
**I want** one command that drives the running app through every theme and tells me what does not follow it
**So that** drift is caught in CI with a report a client can read, not found by hand after it ships

## Context

Requested by the operator on 2026-10-08. A client hand-drew icons the SDK
lacked; the lint rule (US-013) could not see it, since it reads source for
literal values only. An agent found it by looking at the running app, but
that review is neither repeatable nor cheap enough to run on every change.
The recommendation, accepted: keep lint for what source shows, add a runtime
audit as the gate, and use an agent's review on top of its report when a
judgment is wanted.

## Walkthrough

1. In the app, `npx ux-builder-audit --serve "npm run preview" http://localhost:4173/`.
2. The audit opens the page in Chromium and, for every theme the app loads
   and each appearance, asks the app's top-level `ThemeProvider` to switch
   (`piq:set-theme`), as the user's switcher would.
3. In each it checks the app's own elements against that theme, the page's
   stylesheets against the SDK's, what the app draws itself, the favicon and
   logo, and contrast; and takes a screenshot with each finding's number on
   it.
4. It prints a summary, writes `audit-report/index.html` and `report.json`,
   and exits 1 if there is an error. The starter's CI runs it after lint.

## Acceptance Criteria

- [ ] **US-022-AC1** — Given a page built from SDK widgets and role tokens, when the audit runs, then it switches the app through each theme and appearance by the provider's `piq:set-theme` event and reports no errors or warnings.
- [ ] **US-022-AC2** — Given an app element whose colour, font or corner radius is none of the active theme's tokens (a colour may be a token at another opacity or a mix of two), when the audit runs, then it is reported with its element and value, and a colour that fails in every theme is called hard-coded.
- [ ] **US-022-AC3** — Given an app stylesheet that sets `--piq-*` tokens outside the theme CSS, or restyles an SDK widget (even under the SDK's own selector), when the audit runs, then it is reported; the SDK's own rules, however minified, are not.
- [ ] **US-022-AC4** — Given an icon, a logo image, an endless animation or a native control the app draws itself, another UI kit's component, or content outside any themed element, when the audit runs, then each is reported with the SDK widget to use; SDK widgets and `data-audit-ignore` subtrees are not.
- [ ] **US-022-AC5** — Given a theme with a favicon that the page's icon does not follow, or text below WCAG AA contrast, when the audit runs, then it is reported: contrast in the app's markup as an error, inside an SDK widget as a warning for the SDK team; a logo's text is exempt.
- [ ] **US-022-AC6** — Given an audit, when it finishes, then it writes `report.json`, a self-contained `index.html` and one screenshot per page, theme and appearance with each finding's number marked.
- [ ] **US-022-AC7** — Given the `ux-builder-audit` command, when it runs, then it exits 1 on errors (or warnings with `--fail-on warning`, never with `--fail-on never`), 2 on a usage error, and can start the app itself (`--serve`).
- [ ] **US-022-AC8** — Given app source, when lint runs, then imports of another UI kit, icon set or loader library (`ux-builder/no-foreign-ui`) and a hand-drawn `<svg>` in JSX (`ux-builder/no-inline-svg`) are reported with the SDK's counterpart; a reviewed package or an allowed chart is not.
- [ ] **US-022-AC9** — Given a theme set inside another (`<html data-theme>` and a provider below it), when it renders, then it shows none of the outer theme's tokens: each theme sets or resets every token (CONTRACT-003).
- [ ] **US-022-AC10** — Given a fresh starter app, when it is linted and audited as its CI does, then both pass with no errors.

## Edge Cases

- An app without a top-level `ThemeProvider` (themes by attribute): the audit sets `data-theme` itself, says so, and skips the favicon check.
- A theme the app does not load is noted and skipped; one named with `--theme` that is not loaded is an error.
- Fonts the SDK does not ship (Segoe UI, a client-hosted face) are the theme's choice and not reported as missing.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Clean | US-022-AC1 | SDK widgets, role tokens | Audit praxis-carbon, databricks | 4 runs by event; no errors or warnings |
| Hard-coded | US-022-AC2 | `color:#ff00aa` | Audit | Error, "hard-coded", every run |
| Overrides | US-022-AC3 | `.accent-local{--piq-color-accent}`, `.piq-btn{border-radius:3px}` | Audit | Error; warning |
| Hand-drawn | US-022-AC4 | `<svg>`, logo `<img>`, `<button>`, `.MuiButton-root`, spinning div | Audit | Icon, Logo, Button, Material UI, Spinner |
| Favicon, contrast | US-022-AC5 | No favicon link; faint text | Audit | Brand error on Praxis only; contrast error |
| Report | US-022-AC6 | Any | Audit with `--out` | JSON, HTML, 4 screenshots |
| CLI | US-022-AC7 | Dirty and clean pages | `ux-builder-audit` | 1, 0 with `--fail-on never`, 0 on clean, 2 on a bad flag |
| Lint | US-022-AC8 | `@mui/material`, `lucide-react`, `<svg>` | Lint | Reported |
| Nested theme | US-022-AC9 | Built themes.css | Read | Every token set or reset per theme |
| Starter | US-022-AC10 | Fresh app | `npm run lint`, `npm run audit` | Both exit 0 |

## Dependencies

- **Feature Spec**: FEAT-004
- **Contract**: CONTRACT-004 (the command, options, exit codes, `report.json`, the `piq:set-theme` event, the lint rules), CONTRACT-003 (theme selection; the reset), CONTRACT-001 (token names)
- **Related**: US-013 (the lint rule), US-012 (the starter)

## Out of Scope

- An agent's written review of the report (run on demand, not in CI).
- Pages behind sign-in (the audit takes URLs; a logged-in session is the app's to provide).
