---
ddx:
  id: FEAT-008
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: FEAT-006
    - kind: informed_by
      to: ADR-020
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: ADR-023
    - kind: informed_by
      to: ADR-024
    - kind: informed_by
      to: ADR-025
    - kind: informed_by
      to: screen-pattern-inventory
---

# Feature Specification: FEAT-008 — Interaction and information architecture: rules, blueprint and audit

**Feature ID**: FEAT-008
**Status**: Specified (ADR-025, 2026-10-20)
**Priority**: P1 (rules, blueprint, agent tools, adoption, the first audit checks) / P2 (interaction checks that drive the app, an audit tool over MCP, the view audit)
**Owner**: Operator (until a design-system owner is named); harness team as owner of the Praxis rules
**Covered PRD Subsystem(s)**: Interaction and information architecture
**Covered PRD Requirements**: FR-32, FR-33, FR-34, FR-35, FR-36 (drafted with this feature)
**Cross-Subsystem Rationale**: The rules reach agents through the App SDK's guidance and MCP server (FR-21) and are checked by the audit (FEAT-004 SDK-18); they are specified here because they exist only for this feature.

## Overview

Developers who are not UI specialists, and the AI agents working for them,
can now build any screen from SDK patterns (FEAT-006), but nothing tells them
how an app's screens should fit together and behave: how many top-level
destinations a phone can carry, when to use a dialog and when a page, how to
guard a destructive action, which states a list must handle. Apple's Human
Interface Guidelines and Material 3 answer most of these questions, in prose
written for designers.

This feature turns that guidance into **rules a machine can apply**: a cited
catalogue of interaction and information-architecture rules, each with the
conditions it applies under (size class, input, and whether the UI is a whole
app or a view embedded in a host); a **blueprint** in which an app or view
declares its destinations, screens, patterns, actions, states and modal tasks
before code exists; a **validator** for the blueprint; **agent tools** that
serve the rules and check a blueprint; **audit checks** that hold the running
app to the same rules; and an **adoption path** for a new app and for an
existing one.

## Ideal Future State

A developer, or an agent, describes the app's job; it drafts a blueprint from
the SDK's recipes, checks it, fixes what the check reports, and builds the
screens from the patterns the blueprint names. The audit then confirms the
running app against the same rules, by the same IDs. Every finding names its
rule, the guideline it comes from, and the fix. A Praxis plug-in's view goes
through the same loop under the view profile, so every plug-in built by any
agent has the same structure, states and behaviour.

## Problem Statement

- **Current situation**: Patterns adapt to their container (ADR-021) and the
  audit checks tokens, contrast, reflow, target size and focus (SDK-18,
  SDK-20). The screen-pattern inventory cites Material 3 and the HIG for
  component-level rules only. Agent guidance lists widgets and patterns but
  no rules about how screens combine or behave.
- **Pain points**: (1) Agents invent navigation and modal structures, often
  nesting dialogs or putting seven destinations in a phone's bottom bar. (2)
  Destructive actions ship with neither confirmation nor undo. (3) List and
  dashboard screens ship without empty or error states. (4) An existing app
  cannot adopt stricter checks without its CI failing on everything at once.
  (5) Embedded views draw their own app shell inside the host's chrome.
- **Desired outcome**: Structural and interaction mistakes are caught before
  code (blueprint) and after (audit), with fixes an agent can apply, for new
  apps and existing ones.

## Functional Areas

| Area | User question or job | Feature responsibility |
|------|----------------------|------------------------|
| Rules | "What is the right structure and behaviour here?" | A cited, conditioned rule catalogue shipped with the SDK |
| Blueprint | "Which screens does my app need, and is that plan sound?" | A declared plan of destinations, screens, actions, states and modal tasks, and its validator |
| Agent tools | "How does my agent get the rules and check its plan?" | Rules, recipes and blueprint checks over MCP and in the generated guidance |
| Audit | "Does the running app follow the rules?" | Structural and interaction checks, by rule ID |
| View profile | "My UI runs inside a host such as Praxis; which rules apply?" | Rules and blueprint checks for embedded MCP App views |
| Provenance | "Can we ship these rules?" | Every rule cites its source; wording rules that respect each source's licence |
| Adoption | "How do I use this on a new app, and on the app I already have?" | A new-app path through the starter and an existing-app path with a findings baseline |

### Terms

- **Rule**: one statement of what a UI must do, with an ID, the conditions it
  applies under, how it is checked, a severity, and its sources.
- **Condition**: when a rule applies: **context** (`app` or `view`), **size
  class** (`compact`, `medium`, `expanded`, `large`, `extra-large`; ADR-021)
  and **input** (`coarse` touch, `fine` pointer). A rule with no condition on
  an axis applies at every value of it. The device is never a condition.
- **Recipe**: a tested combination of patterns for a common job, with the
  rules it relies on.
- **Blueprint**: one JSON file per app or view (`app.blueprint.json`)
  declaring its kind, supported size classes and inputs, destinations and
  screens (CONTRACT-005).
- **Profile**: the rules that apply to a context; the view profile is the
  rules whose context includes `view`.

## Requirements

### Functional Requirements by Area

#### Rules

RUL-01. The SDK ships a rule catalogue: each rule has a stable dotted ID
(`modal.one-at-a-time`), a title, a statement, a rationale, its conditions,
what it applies to (patterns or widgets, or the whole app), how it is checked
(`blueprint`, `audit`, `lint` or `review`), a severity and at least one source.

RUL-02. The catalogue covers at least: primary navigation by size class
(destinations a compact bar can hold; a standing rail or side navigation at
expanded and wider); panes by size class; modality (one modal at a time, a
title naming its task, an obvious dismiss, Escape closes, no hierarchy of
screens inside a modal, unsaved changes guarded); feedback (destructive
actions safeguarded by undo or confirmation, not both; reasons given when a
command cannot run); loading (something shown before data; no blank region);
states (empty, loading and error for collection, dashboard and record
screens); emphasis (at most one primary action per page or dialog); input
(touch-sized targets and no hover-only content under coarse input; visible
focus under fine input); line length; and the view profile (VEW-01).

RUL-03. A rule can be read for a target: given a context, size classes and
inputs, the SDK returns only the rules whose conditions match.

RUL-04. The catalogue is published in `@ux-builder/ui/catalogue.json`, in the
generated agent guidance (`AGENTS.md` and the skill) and over MCP, generated
from one source, so the three cannot disagree.

RUL-05. Recipes map common jobs (review and approve a queue, manage records,
edit settings, read a dashboard, run an import, configure an embedded tool)
to patterns and the rules they satisfy.

#### Blueprint

BLU-01. An app or view can be described in a blueprint (CONTRACT-005): kind,
name, supported size classes and inputs; for an app, its destinations; for
each screen, its pattern, its primary action, its destructive actions and
their safeguard, its states and its modal tasks.

BLU-02. A validator checks a blueprint against the schema and every rule whose
check is `blueprint` and whose conditions match the blueprint's supported
size classes, inputs and kind, and returns findings: rule ID, severity, the
JSON path of the offending element, a message and a fix.

BLU-03. The validator is a library entry point (`@ux-builder/ui/blueprint`)
and a command (`ux-builder-blueprint check <file>`) that exits 1 on an error
finding, so it can run in CI.

BLU-04. A blueprint naming a pattern that is not in the installed catalogue
is an error that names the nearest pattern.

#### Agent tools

AGT-01. The MCP server answers with the rules for a target (RUL-03), the
recipes for a job described in words, the blueprint schema, and the findings
for a blueprint it is given (BLU-02), from the installed SDK version.

AGT-02. The generated guidance states the loop an agent follows: choose a
recipe, write the blueprint, check it, build each screen from its pattern
inside `Page` within `AppShell` (or as a view), lint, audit, and fix by rule
ID.

#### Audit

AUD-01. The audit reports, by rule ID, as warnings for their first minor
release: two or more modal dialogs open at once; an open dialog without an
accessible name or without a dismiss control, or that Escape does not close;
more than one primary button in one page region or dialog; primary
navigation that, at a compact width, shows more top-level destinations than
the rule allows, or that, at expanded and wider, is hidden behind a menu
button; prose whose lines run past the rule's character limit.

AUD-02. Each audit finding from this feature carries the rule ID and the
rule's source titles, and the HTML report links each to its source.

AUD-03. The audit can record a baseline of current findings
(`--write-baseline <file>`) and, given one (`--baseline <file>`), report and
fail only on findings not in it, so an existing app adopts new checks
without failing CI on day one. A baselined finding that no longer occurs is
reported as resolved.

#### View profile

VEW-01. The view profile's rules: a view draws no app shell, primary
navigation or brand of its own (the host owns its chrome and pins; ADR-012);
it supports the compact and medium size classes; it does one task, with its
other steps as modal tasks or in-place sections; it declares its empty,
loading and error states and, for a Praxis host, the host's own states
through the adapter's rules (ADR-024); it takes its theme only from the host.

VEW-02. A blueprint of kind `view` is checked against the view profile;
destinations, or an app-shell or primary-navigation pattern, in a view are
errors. Each of a view's screens declares its empty, loading and error
states whatever its pattern (`view.states`).

#### Provenance

PRV-01. Every rule names at least one source with a title, URL, licence and
whether the rule's wording is paraphrased or quoted.

PRV-02. A rule from a source whose licence does not allow reuse (Apple's
Human Interface Guidelines, m3.material.io) is paraphrased and carries no
quotation; quotation is allowed only from an openly licensed source
(Android developer documentation, CC BY 2.5; W3C documents), at most 25
words, with the source attributed in the shipped third-party notices.

PRV-03. `npm run check` fails when a rule breaks PRV-01 or PRV-02, or when a
rule's check ID names a check that does not exist.

PRV-04. The README and the generated guidance state that ux-builder is not
affiliated with or endorsed by Apple or Google, and that Human Interface
Guidelines and Material Design are their trademarks.

#### Adoption

ADP-01. **New app.** `npm create @ux-builder/app` writes an
`app.blueprint.json` describing the starter's own screen, a `check:blueprint`
script and a CI step that runs it; with `--blueprint <file>`, it starts from
the given blueprint instead, after checking it, and refuses one with an error
finding. The generated `AGENTS.md` and `CLAUDE.md` tell an agent to plan in
the blueprint before writing screens.

ADP-02. **Existing app.** `ux-builder-blueprint init` writes a blueprint
skeleton into an existing app (kind, supported size classes and inputs, one
screen to fill in) without touching other files; the developer, or an agent,
lists the app's real destinations and screens, runs the check, and fixes or
records what it reports. The audit's baseline (AUD-03) is written once, so
CI fails only on new findings while existing ones are worked down.

ADP-03. The README and the site's Start section document both paths step by
step.

### Non-Functional Requirements

- **Determinism**: the same blueprint and SDK version give the same findings
  in the same order.
- **No network**: the validator and the MCP tools read only the installed
  packages.
- **Performance**: checking a blueprint of 50 screens takes under one second.
- **Compatibility**: new audit checks are warnings for one minor release, as
  SDK-20's were; the blueprint and rule formats are versioned (CONTRACT-005).
- **Licensing**: PRV-01 to PRV-04.

## User Stories

- [US-050 — Read cited rules that apply to my target](../user-stories/US-050-read-cited-rules-for-a-target.md)
- [US-051 — Start a new app from a checked blueprint](../user-stories/US-051-start-a-new-app-from-a-blueprint.md)
- [US-052 — Adopt the rules in an existing app](../user-stories/US-052-adopt-the-rules-in-an-existing-app.md)
- [US-053 — An agent plans and checks screens through MCP](../user-stories/US-053-an-agent-plans-and-checks-screens-through-mcp.md)
- [US-054 — Audit an app's structure and interaction](../user-stories/US-054-audit-structure-and-interaction.md)
- [US-055 — Check an embedded view against the view profile](../user-stories/US-055-check-an-embedded-view.md)

## Edge Cases and Error Handling

- **A blueprint supports only expanded and wider**: compact-only rules do not
  apply and produce no findings.
- **An app supports medium but not compact**: the destination limit
  (`nav.compact-destinations`) applies at the compact size class only, so it
  produces no finding (the blueprint check and the audit's below-600 px check
  agree).
- **Mixed input** (a touch laptop): `inputs: ["coarse", "fine"]` applies both
  sets of rules.
- **A pattern renamed in a later SDK version**: BLU-04 names the nearest
  pattern; the blueprint is not rewritten.
- **A dialog the app opens on load**: AUD-01's modal checks apply; dialogs
  closed at load are not opened by the audit (P2).
- **Two primary buttons in two dialogs**: one per dialog is allowed.
- **A baseline from an older audit version**: unknown checks in it are
  ignored with a note; it is never an error.
- **A rule with no source**: the check fails (PRV-03); it never ships.

## Success Metrics

- Agent-built screens: 0 nested modals, 0 unguarded destructive actions and
  0 list screens without empty and error states in the blueprints of the
  SDK's own examples.
- An existing app adopts the new checks with CI green on the day it does
  (baseline), and its baselined findings fall release over release.
- Every rule in the catalogue cites a source; 0 quotations from a
  non-open source.

## Constraints and Assumptions

- The rules restate guidance; they do not reproduce it (PRV-02).
- The device is never detected; conditions are container size, input and
  context (ADR-021, ADR-025).
- The blueprint describes structure, not data or business logic.

## Dependencies

- **Other features**: FEAT-004 (audit, MCP, guidance), FEAT-006 (patterns),
  FEAT-007 (the licence check this extends).
- **ADRs**: ADR-020, ADR-021, ADR-024 (the view boundary), ADR-025.
- **Contracts**: CONTRACT-004 (new entry points, command, audit options, MCP
  tools), CONTRACT-005 (blueprint and rule catalogue formats).
- **External**: the Praxis adapter supplies Praxis view rules in the harness
  repository (ADR-024).

## Out of Scope

- Generating screen code from a blueprint: agents write screens from
  patterns; the starter writes only the blueprint.
- Planning from free text inside the SDK: the agent plans; the SDK serves
  recipes, the schema and checks.
- Interaction checks that must drive the app (opening dialogs, deleting a
  record, throttling the network), an audit tool over MCP, and the audit's
  view mode (ADR-024): P2.
- Praxis-specific rules: the Praxis adapter (ADR-024).

## Review Checklist

- [x] Every requirement is testable and owned by a story.
- [x] Conditions are size class, input and context only.
- [x] Licensing constraints are requirements (PRV-01 to PRV-04).
- [x] New-app and existing-app adoption are specified (ADP-01, ADP-02).
- [ ] ADR-024 accepted before the view audit (P2) is built.
