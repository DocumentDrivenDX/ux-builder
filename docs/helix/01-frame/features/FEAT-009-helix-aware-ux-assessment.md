---
ddx:
  id: FEAT-009
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: FEAT-008
    - kind: informed_by
      to: ADR-025
    - kind: informed_by
      to: ADR-026
---

# Feature Specification: FEAT-009 — HELIX-aware UX assessment

**Feature ID**: FEAT-009
**Status**: Specified (ADR-026, 2026-10-20); built in increments
**Priority**: P1 (increment 1: context, traceability, baseline, the agent workflow for those stages, and same-state inspection) / P2 (increment 2: walkthroughs, coverage, findings, document proposals) / P3 (increment 3: run comparison at scale, CI, MCP wrappers)
**Owner**: Operator
**Covered PRD Subsystem(s)**: UX assessment
**Covered PRD Requirements**: FR-37, FR-38, FR-39, FR-40, FR-41, FR-42 (drafted with this feature)
**Source**: *UX Builder HELIX-aware UX assessment: feature and user-story planning brief* (2026-10-20). Its planning IDs UA-F01 to UA-F09 and UA-S01 to UA-S10 map to the canonical IDs below; they are not repository IDs.
**Cross-Subsystem Rationale**: Extends the audit (FEAT-004 SDK-18, FEAT-008 AUD-01 to AUD-03) and reads the SDK catalogue (FEAT-004 SDK-13); specified here because the assessment workflow exists only for this feature.

## Overview

The audit checks one thing well: does a running app use the SDK's theme, and
does it follow the interaction rules (FEAT-008). It does not know what the
app is *for*. This feature adds a repeatable **assessment**: an agent reads
an app's HELIX documents to learn its intended journeys, runs its existing
tests and the audit as a **baseline**, walks the journeys in a browser,
inspects the **exact screen state** each step reaches, and produces
prioritized, evidence-backed recommendations and **proposed** requirement and
test changes. It moves a working prototype toward a version-one experience
without losing behaviour the prototype already gets right.

The assessment produces reports and proposals. It does not change the app's
code or governing documents.

## Ideal Future State

A product owner asks an agent to assess an app. The agent validates the
app's assessment manifest, maps every selected journey to its stories,
acceptance criteria and tests, runs the tests and the audit, and walks each
journey through its happy path, empty, loading, error, access and AI states.
At each checkpoint the audit inspects the state the agent reached, not a
fresh page. The report says what was checked, what was seen, what is
uncertain, why each change matters and how to verify it. The owner accepts
some recommendations; their requirement changes go through HELIX; one
journey is rebuilt and the next run shows its findings resolved and no
baseline behaviour lost.

## Problem Statement

- **Current situation**: `@ux-builder/audit` launches its own Chromium,
  visits the URLs it is given and checks theme use and selected
  accessibility and interaction rules. It has no notion of journeys, roles,
  requirements or tests. Reopening a URL does not reproduce a signed-in
  session, an open dialog, a half-filled form or a validation error. The MCP
  server describes the SDK, not the app.
- **Pain points**: (1) UX reviews of prototypes are ad hoc and not
  repeatable. (2) Recommendations are not tied to product intent or to
  tests, so they are hard to prioritize or verify. (3) A redesign can break
  business behaviour that only the old tests describe. (4) A clean audit is
  read as proof of usability, which it is not. (5) The audit cannot check
  the state a walkthrough reached.
- **Desired outcome**: an evidence-backed, traceable path from product
  intent to better workflows, protected by the app's existing tests.

## Functional Areas

| Area | Brief | User question or job | Feature responsibility |
|------|-------|----------------------|------------------------|
| Context | UA-F01 | "What is this app, and what may the assessment do to it?" | A versioned manifest, proposed from the repository and validated |
| HELIX binding | UA-F01, UA-F03, UA-F08 | "Where are this app's governing documents, and which artifact should each recommendation change?" | Resolve documents and recommendation targets the way HELIX does: marker, flow, catalogue, `ddx:` frontmatter |
| Workflow | UA-F02 | "Assess this app's UX." | A companion skill that runs the stages and produces the output package |
| Traceability | UA-F03 | "Which requirement does this journey serve, and which test covers it?" | A requirements-to-evidence map |
| Baseline | UA-F04 | "What already fails, before we change anything?" | Recorded functional test and audit results |
| Journeys | UA-F05 | "What did the agent actually try and see?" | Requirement-driven walkthroughs with checkpoints |
| Coverage | UA-F05 | "What was not assessed, and why?" | A journey-by-state coverage matrix with no false passes |
| Inspection | UA-F06 | "Is the audit checking the screen the agent is looking at?" | Page-level inspection of a live or reproduced state |
| Findings | UA-F07 | "What should we fix first?" | A deduplicated, ranked, evidence-linked backlog |
| Proposals | UA-F08 | "Which requirements and tests change?" | Proposed HELIX and test edits, never applied by the assessment |
| Runs | UA-F09 | "Did the redesign help, and did it break anything?" | Run records and comparisons across runs |
| Safety | §5 of the brief | "Can the assessment harm data or leak secrets?" | Environment, action and evidence controls |

### Terms

- **Assessment**: one run of the stages below against one app, one HELIX
  scope and one manifest.
- **Manifest**: `ux-assessment.yml` at the app's root (CONTRACT-006): how to
  run and reach the app, its journeys, roles and tests, and what the
  assessment may do. It points at the app's HELIX marker, flow and catalogue
  (HLX-01); it never copies requirements.
- **HELIX inputs**: the app's `.helix.yml` marker, the flow it selects, the
  flow's `root:` (where instances live), and the HELIX artifact catalogue
  (`graph.yml` and each artifact type's `meta.yml`: output location, naming,
  ID format, template). An *instance* is a document under the root with
  `ddx:` frontmatter.
- **Journey**: a user goal from a story, with a role, fixture, entry route
  and steps.
- **State**: one of the state classes (JRN-03) a journey can be in.
- **Checkpoint**: a recorded point in a journey: URL, actions so far,
  observation and evidence.
- **Finding**: one user problem with its evidence (CONTRACT-006).
  Its **type** is one of: deterministic check, observed walkthrough
  behaviour, heuristic concern, SDK adoption gap, real-user evidence.
- **Agent judgment**: a conclusion the agent reached by looking, as opposed
  to a deterministic check's result; always labelled as such.

### Stages

1. Resolve the manifest, scope, environment and permitted actions (CTX).
2. Load the governing documents; record alignment issues (TRC).
3. Run the baseline: functional tests and deterministic checks (BAS).
4. Plan the journeys and states; mark the relevant acceptance criteria (JRN, COV).
5. Walk the journeys; inspect each checkpoint (JRN, INS).
6. Merge and rank findings; map changes to installed SDK components (FND).
7. Write the report, backlog and proposed HELIX and test changes (DOC, RUN).
8. After acceptance: build one journey, rerun, compare with the baseline (RUN).

Increment 1 delivers stages 1 to 3 and the inspection that stage 5 needs.

## Requirements

### Functional Requirements by Area

#### Context (UA-F01)

CTX-01. An assessment reads a manifest, `ux-assessment.yml`, with a schema
version (CONTRACT-006). It holds: the app's identity; its HELIX binding
(HLX-01);
the working directory, a start command or a running base URL, a readiness
condition and the allowed environment; the journeys (story and criterion
IDs, priority, entry route, role, fixture, setup and reset); the test
commands, report locations and test mappings; the widths and appearances to
audit; an authentication *reference*; the output path, capture and
redaction policy, and time and step limits; and the restrictions (permitted
actions, excluded integrations, disallowed consequential actions, and a
report-only write scope).

CTX-02. `ux-builder-audit assess init` proposes a manifest from the
repository: the HELIX scope from `.helix.yml`, the test commands from
`package.json` and Playwright configuration, and the stories found in the
scope as candidate journeys, by ID. It copies no requirement text. A value
it cannot determine is left as an explicit placeholder, never guessed.

CTX-03. `ux-builder-audit assess validate` checks the manifest against its
schema and the repository: paths exist, the HELIX scope resolves to exactly
one flow, the commands exist, and the journeys name stories and criteria
that exist in the scope. Each problem is reported with its path; an
ambiguous scope or a missing essential stops the assessment.

CTX-04. Credentials are referenced, never stored: an environment variable
name or a Playwright storage-state file path. A manifest that contains a
value that looks like a secret fails validation.

#### HELIX binding (UA-F01, UA-F03, UA-F08)

HLX-01. The manifest's `helix` section names the inputs as HELIX names
them: the marker (default: the first `.helix.yml` found walking up from the
app's directory to the git root, as HELIX discovers it), the flow `id`
(required when the marker lists more than one flow and has no
`defaults.flow`), and the catalogue source (default `auto`). Optional
`include` and `exclude` globs only narrow the documents read, and only
within the flow's `root:`. The manifest never restates a path the marker
already declares.

HLX-02. The flow is resolved as HELIX resolves it: the manifest's `flow`,
else the marker's `defaults.flow`, else its only flow. A marker HELIX would
refuse (malformed YAML, a root outside the repository, a duplicate flow, a
`defaults.flow` it does not list, a root that does not exist) stops the
assessment with HELIX's reason. Keys the assessment does not use are
ignored and never rewritten.

HLX-03. The catalogue is bound in HELIX's order: the marker's `graph:` (or
`catalog:`) pointer; a `workflows/graph.yml` vendored in the repository; an
installed HELIX plugin; or an explicit path in the manifest. The run
records the source that bound, and its HELIX version or commit. Graph,
artifact-type metadata and templates come from that one source.

HLX-04. Documents are the instances under the flow's root. Each is
classified by its `ddx.type`, else by matching the catalogue's
`output.location` and `output.naming` (relative to the root), else
reported as unclassified. Its ID is its `ddx.id`, checked against the
type's `id_format`; its upstream links are `ddx.links` and
`ddx.depends_on`. Acceptance criteria are read by HELIX's `US-<n>-AC<m>`
form, and test citations by HELIX's `@covers US-<n>-AC<m>` syntax.

HLX-05. Assessment inputs are read by artifact type: product vision (goals),
PRD (requirements and personas), concerns, feature specifications, user
stories and their criteria, the design system (`DESIGN.md`) when present,
contracts that define screens or flows, and the test plan and story test
plans. Missing types are reported, not assumed.

HLX-06. Every recommendation that changes a governing document targets a
HELIX artifact: an existing instance by `ddx.id`, type and path, or a new
instance of a catalogue type, named by that type's `output.naming`, given
the next free ID in its `id_format`, and drafted from that type's template.
The backlog is also proposed as an entry in the app's HELIX
`improvement-backlog` (iterate activity). Changes to SDK use go to the
design-system artifact when the app has one.

#### Workflow (UA-F02)

AGW-01. A companion skill, `ux-builder-assess`, shipped with
`@ux-builder/audit`, tells a coding agent how to run an assessment: load
and validate the manifest, run the stages in order, call the deterministic
commands, drive the browser, and write the output package.

AGW-02. A stage that cannot run (no browser tool, the app does not start,
an authentication barrier, a time or step limit reached) is recorded as
`blocked` or `partial` with its reason. It never counts as completed
coverage.

AGW-03. The assessment runs without the UX Builder MCP server when the
app's installed `@ux-builder/ui` guidance and catalogue are readable. The
deterministic commands never present their output as the agent's reasoning,
and the skill never presents an agent judgment as a deterministic result.

AGW-04. The SDK version the assessment reports, and every catalogue lookup
it makes, comes from the app's installed `@ux-builder/ui`. The MCP server,
when used, reads the app's installed catalogue first (as the audit does)
and reports which version it served.

#### Traceability (UA-F03)

TRC-01. `ux-builder-audit assess collect` extracts from the documents
HLX-04 resolves: goals, roles, features, stories and acceptance criteria,
each with its original ID, artifact type, source path, and the file's
content hash and git revision.

TRC-02. Each selected journey is linked to its routes and tests. Links are
labelled: `explicit` (a test cites the criterion with `@covers`, or the
manifest maps it), `inferred` (proposed by the agent, with its reason), or
`uncovered` (no test).

TRC-03. The skill runs HELIX's alignment review on the scope and records
its result. A conflict between governing requirements blocks or qualifies
the conclusions it affects; the rest of the assessment continues.

TRC-04. A missing document, a story without a stable ID, or a criterion
without one is reported. Identifiers the assessment makes for its own use
(journeys, states, findings) have their own prefixes and never take the
form of a HELIX ID.

#### Baseline (UA-F04)

BAS-01. `ux-builder-audit assess baseline` runs the manifest's functional
test commands before any change and records, per command: the command, exit
status, duration, the tests passed, failed and skipped (from the runner's
report where one is declared), and the log, with secrets masked. Failed,
skipped and not-run tests stay distinct.

BAS-02. It runs the audit at the manifest's URLs, widths, themes and
appearances, and records the SDK and audit versions and the checks that
were turned off or are unsupported.

BAS-03. On an app that does not use the SDK, findings that only mean "not
yet on the SDK" are typed `sdk-adoption` and reported apart from usability
findings. The assessment does not require a migration first.

BAS-04. Baseline failures stay visible in every later comparison. The
report states that passing functional tests do not show that usability
criteria are met.

#### Journeys (UA-F05)

JRN-01. For each journey the assessment records its role, fixture, entry
route, goal, steps, expected outcomes and the story and criterion IDs it
serves, reusing the E2E tests' setup and paths where they exist.

JRN-02. Walkthroughs use Playwright MCP, or another supported browser
driver, for adaptive navigation. The agent looks at screenshots and the
accessibility tree; it does not judge visual quality from DOM text alone.

JRN-03. Each state class is assessed where it applies: happy path and
success; empty and first use; loading and waiting; validation and
recoverable error; system and access failure; AI-specific (streaming,
partial output, cancellation, retry, failure, editing, sources, approval
before a consequential action); responsive and keyboard.

JRN-04. Each significant checkpoint records the URL, the actions so far,
what was observed and its evidence. Agent judgments are recorded apart
from deterministic failures.

JRN-05. Failures are induced only through the manifest's fixtures or
mocks. A state that needs missing setup, permissions or integrations is
`blocked` or `not assessed`; no observation is invented.

#### Coverage (UA-F05)

COV-01. Every planned journey-and-state pair is `assessed`, `blocked`,
`not assessed` or `not applicable`, each with a reason; an assessed pair
has an outcome and evidence.

COV-02. User stories define the expected behaviour. A broader UX heuristic
may produce a *proposed* criterion, labelled as a recommendation, never as
an existing obligation.

COV-03. The report lists the claims that need representative users to
confirm (confusion, trust, time saved) and makes none of them itself.

#### Inspection (UA-F06)

INS-01. `inspect(page, options)` runs the audit's checks on a Playwright
page as it is: it does not navigate, reload, reset a form, change the theme
or end the session.

INS-02. `audit()` (the URL audit) is built on `inspect()`, so a check
behaves the same in a URL audit and at a journey checkpoint.

INS-03. The assessment can attach to the browser the agent is driving, over
a Chrome DevTools Protocol endpoint, and inspect the page it is on. Where a
driver cannot share its browser, a replay adapter reproduces the state from
recorded steps and asserts the expected state before inspecting; a
mismatch is reported, never treated as the same evidence.

INS-04. Each inspection's findings carry the journey, step, role, viewport,
theme and checkpoint IDs, and a screenshot of the state inspected.

INS-05. Checks that change the page (focus moves, resizes, theme switches,
pressing Escape) are declared state-affecting. `inspect()` skips them
unless asked, and runs them in a separate pass that restores the state
afterwards, or reports that it could not.

INS-06. Technical proof (increment 1's exit): three checkpoints, a signed-in
screen, an open dialog, and a form showing a validation error with its
input kept, are inspected in place; each produces linked findings and
leaves the task able to continue.

#### Findings (UA-F07)

FND-01. Every finding has the fields of CONTRACT-006's finding record: a
stable ID, its journey and state, the user problem, evidence, requirement
and test references, the proposed change, rationale, verification method
and provenance (its type).

FND-02. A recommended change names the installed `@ux-builder/ui` pattern
or widget, its version and catalogue reference, and is marked as
composition work, a custom gap, or an SDK defect.

FND-03. One underlying problem seen at several checkpoints is one finding
with every evidence link. Distinct user problems on the same element stay
separate.

FND-04. Findings are ranked P0 to P3 by the rubric: P0 blocks a critical
task, loses data, or allows a consequential action without its control; P1
is major friction or failed recovery in an important journey, or a serious
access barrier with a limited workaround; P2 is a material clarity,
efficiency or consistency problem with a workaround; P3 is polish. Within a
band, order by journey importance and breadth, then effort and
dependencies. Confidence (high, medium, low, with a reason) and effort are
separate fields. Unknown usage stays unknown. A low-confidence severe
concern becomes validation work, neither downgraded nor stated as proven
harm.

#### Proposals (UA-F08)

DOC-01. The assessment writes proposed edits to the affected feature
specifications, user stories, acceptance criteria, story test plans and
test plan, as patches in its output package, each aimed at a HELIX artifact
as HLX-06 sets out and keeping the target's `ddx:` frontmatter unchanged. A
change to product scope also names the PRD or vision decision it needs.

DOC-02. Each proposal keeps its finding and evidence IDs, says whether it
is a new usability requirement or an existing criterion that is not met,
and includes the matching test change.

DOC-03. The assessment never writes to the governing documents. Accepted
proposals are applied through HELIX under its authority and write-scope
rules, after rechecking the documents' revisions for conflicts.

DOC-04. An implementation plan for an accepted change names the files it
may write, the behaviour it must keep, its dependencies and its
verification. It never weakens a test to make a redesign pass; selectors
and navigation steps may change, behavioural assertions may not, unless a
proposal changes the behaviour explicitly.

#### Runs (UA-F09)

RUN-01. A run writes a readable report and a schema-validated JSON package:
backlog, coverage matrix, evidence index, baseline summary and proposals.

RUN-02. A run records the app's commit, the documents' revisions, the
manifest version, the installed SDK and audit versions, the agent and model
when known, the configuration and the time.

RUN-03. Findings are compared across runs as `new`, `persistent`,
`resolved`, `regressed` or `not rechecked`. A state that was not assessed
cannot resolve a finding.

RUN-04. Rerunning the same scope updates the comparison without duplicating
backlog entries. Partial runs and execution errors are reported apart from
finding severity.

#### Safety

ENV-01. Assessments run against local or staging environments with
disposable users and fixtures. Payments, outbound messages, production
approvals and destructive changes to real data are refused unless the
manifest authorizes them separately.

ENV-02. Navigation and actions stay within the manifest's origins and
integrations. Test data is reset between scenarios.

ENV-03. Secrets never enter the manifest, logs or reports. Evidence is
masked per the manifest's redaction policy before it is written, and only
the evidence a finding needs is kept.

### Non-Functional Requirements

- **Determinism**: the deterministic commands give the same output for the
  same inputs; agent judgments are labelled and never mixed in.
- **Honesty**: no coverage, result or user claim without evidence; a clean
  audit is never reported as proof of usability or of full accessibility
  compliance.
- **Bounded**: every run respects the manifest's time and step limits.
- **No new runtime**: no agent runtime and no MCP server is required for
  V1; the deterministic commands run on their own.
- **Compatibility**: `audit()`'s options and report stay as CONTRACT-004
  specifies; the manifest and run formats are versioned (CONTRACT-006).

## User Stories

| Brief | Story |
|-------|-------|
| UA-S01 | [US-056 — Bootstrap and validate the assessment manifest](../user-stories/US-056-bootstrap-and-validate-the-assessment-manifest.md) |
| UA-S02 | [US-057 — Request one complete assessment from a coding agent](../user-stories/US-057-request-one-complete-assessment.md) |
| UA-S03 | [US-058 — Trace each assessed journey to product intent](../user-stories/US-058-trace-journeys-to-product-intent.md) |
| UA-S04 | [US-059 — Tell old failures from redesign regressions](../user-stories/US-059-baseline-before-redesign.md) |
| UA-S05 | [US-060 — See what the agent attempted and observed](../user-stories/US-060-see-what-the-agent-attempted.md) |
| UA-S06 | [US-061 — Inspect coverage instead of a false pass](../user-stories/US-061-inspect-coverage-not-a-false-pass.md) |
| UA-S07 | [US-062 — Run checks on the state just reached](../user-stories/US-062-check-the-state-just-reached.md) |
| UA-S08 | [US-063 — Assess and prioritize each recommendation](../user-stories/US-063-prioritize-recommendations.md) |
| UA-S09 | [US-064 — Review exact requirement changes before implementation](../user-stories/US-064-review-requirement-changes.md) |
| UA-S10 | [US-065 — Compare assessments and hand work to an agent](../user-stories/US-065-compare-assessments.md) |

## Edge Cases and Error Handling

- **No `.helix.yml`**: the assessment stops at CTX-03 and says so; a
  non-HELIX manifest is a later extension.
- **Two HELIX flows and no choice in the manifest or `defaults.flow`**:
  ambiguous scope; it stops and lists the candidates (HLX-02).
- **A document without `ddx:` frontmatter, or in a folder the catalogue does
  not name** (this repository keeps ADRs in `02-design/adr/`, as HELIX
  does, but has no `03-test/` yet): classified by location where possible,
  otherwise listed as unclassified; never an error.
- **The installed HELIX catalogue is older than the one the app's documents
  follow**: the run records both; a type the bound catalogue lacks is
  reported, and proposals of that type are held for review.
- **A story with no acceptance criteria**: the journey is planned from the
  story's walkthrough and every expectation is labelled a proposed
  criterion.
- **The app needs no sign-in** (as the pilot does not): the authenticated
  checkpoint of INS-06 is proven on the audit's own signed-in test fixture.
- **The browser driver cannot expose a CDP endpoint**: the replay adapter
  (INS-03); if the state cannot be reproduced and verified, the checkpoint
  is `blocked`.
- **A functional test is flaky**: its results are recorded as they were,
  with the run's count; the assessment never retries a test into passing.
- **A checkpoint shows a secret**: it is masked before the screenshot is
  written (ENV-03); if it cannot be masked, the screenshot is not kept.

## Success Metrics

- The pilot (the theme builder) is assessed end to end without an SDK
  migration, covering its happy path, empty state, recoverable error and AI
  states.
- 100% of recommendations carry evidence or an uncertainty label, a
  requirement link or proposed criterion, and a verification method.
- 0 coverage entries marked assessed without evidence.
- One accepted finding goes through a HELIX story change and a regression
  test, and the rerun shows it resolved with baseline behaviour kept.

## Constraints and Assumptions

- HELIX holds the product's intent; the manifest never duplicates it.
- The coding agent does the reasoning in V1; the CLI does the deterministic
  work.
- Playwright MCP is one candidate driver; the auditor never assumes it
  exposes a Playwright `Page`.
- Pilot: this repository's theme builder (operator, 2026-10-20). It has a
  mock model, a throwaway repository, AI feedback states, validation and
  server refusal, and Playwright E2E tests; it has no sign-in.

## Dependencies

- **Other features**: FEAT-004 (audit, MCP, catalogue), FEAT-008 (rule IDs,
  baseline, interaction checks).
- **ADRs**: ADR-025, ADR-026.
- **HELIX**: the marker, artifact schema and catalogue (verified against
  HELIX `e8a8c7d`, 2026-10-20).
- **Contracts**: CONTRACT-004 (the audit's library and command, amended),
  CONTRACT-006 (manifest, run, finding, coverage and inspection formats).
- **External**: HELIX's alignment review and artifact templates;
  Playwright MCP (or another driver with a CDP endpoint).

## Out of Scope

- Changing the app's code or governing documents during an assessment.
- An agent runtime inside UX Builder, or a mandatory MCP server (P3 may add
  MCP wrappers).
- Assessing apps without HELIX documents (a later portable manifest).
- Measuring real users; the assessment names what needs them (COV-03).

## Review Checklist

- [x] Every brief group (UA-F01 to UA-F09) and story (UA-S01 to UA-S10) is mapped.
- [x] Agent judgment, deterministic results and user evidence stay distinct.
- [x] Report-only writes; proposals go through HELIX.
- [x] HELIX inputs and recommendation targets resolve through HELIX's marker, flow, catalogue and `ddx:` frontmatter (HLX-01 to HLX-06).
- [ ] Representative users named before the pilot's usability claims (COV-03).
