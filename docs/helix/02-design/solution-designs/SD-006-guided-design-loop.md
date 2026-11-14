---
ddx:
  id: SD-006
  type: solution-design
  status: draft
  links:
    - kind: informed_by
      to: ADR-042
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-036
    - kind: informed_by
      to: ADR-037
    - kind: informed_by
      to: ADR-038
    - kind: informed_by
      to: ADR-039
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-003
    - kind: informed_by
      to: SD-004
---

# SD-006: Guided design loop


*Amended 2026-10-29 by ADR-042: ux-builder writes into HELIX's documents and keeps none of its own beyond the blueprint and the compiled brief; the docs/ux-builder document types below are replaced by their HELIX homes (see ADR-042 decision 2), and `helix.mjs`, `people.mjs`, `studies.mjs` and `migrate-docs.mjs` carry the new paths.*

## Scope

How FEAT-018 is built, in six phases, on the packages that exist. The
surface is CONTRACT-008; the decisions are ADR-036 to ADR-039. This design
covers the components, the algorithms behind the deterministic commands,
the skill's structure, the rubric's sources (FEAT-018 D-10) and the order
of work.

## Components

*[Amended 2026-10-25 — FEAT-018 GDL-77 to GDL-81, alignment]* **Paths.** CONTRACT-008's Layout section governs every path
(`@ux-builder/ui/blueprint/paths`). The design documents are in
`docs/ux-builder/` (until GDL-80, `docs/ux/`), the blueprint and its
alternatives in `docs/ux-builder/blueprint/`, exploratory prototypes in
`docs/ux-builder/prototypes/`; an app not yet migrated keeps the old paths.

| Component | Package | New or changed |
|---|---|---|
| `ux-builder-design` command and its functions | `@ux-builder/design` | New |
| `ux-builder-design` skill | `@ux-builder/design` | New |
| Artifact types (`artifacts/<type>/`) | `@ux-builder/design` | New: experience-brief, baseline, research-evidence, jobs, ux-decision, test-kit, usability-evaluation-report, insights, experiment |
| Design state schema | `@ux-builder/design` | New |
| Blueprint schema, `check`, `score`, `compare`, `simplify`, `alternative`, `prototype`, `--diff` | `@ux-builder/ui` (`blueprint/`) | Changed and new |
| `no-prototype-import` lint rule | `@ux-builder/ui` (`eslint`) | New |
| `JourneyProvider`, `useJourneyStep` | `@ux-builder/ui` | New |
| Rubric data and schema | `guidelines/` (copied into the catalogue) | New |
| Rules `simplicity.delta-decided`, `consistency.same-kind` | `guidelines/rules.json` | New |
| `assess heuristics`, `metrics.json`, finding `source` | `@ux-builder/audit` | New and changed |
| `decide` fields, `--kind addition` | `@ux-builder/trace` | Changed |
| MCP wrappers | `@ux-builder/mcp` | New tools |
| `--mcp`, design package and skill in new apps | `@ux-builder/create-app` | Changed |

```
person ──talks──▶ agent ──reads──▶ skill (ux-builder-design)
                    │
                    ├─runs─▶ ux-builder-design ─┬─ design state (.ux-builder/)
                    │                            ├─ docs/ux-builder/*  (templates from the package)
                    │                            ├─ trace (decisions, checkpoints)
                    │                            └─ propose ─▶ HELIX patches (ADR-030)
                    ├─runs─▶ ux-builder-blueprint (score, compare, simplify, prototype, check --diff)
                    ├─runs─▶ ux-builder-audit (audit, assess, heuristics, metrics)
                    └─(optional) MCP tools ── same functions
```

## The skill

`skill/ux-builder-design/SKILL.md` is the guide. It is written for the CLI;
MCP is mentioned only as an alternative when its tools are present
(ADR-036 rule 2). Its sections:

1. **Standing objective and challenge** (GDL-09 to GDL-11): the objective
   text, the six challenge questions, the five questions recorded with
   `decide --kind addition`.
2. **Starting** (GDL-72 to GDL-75): read `status`; new app → Define;
   existing app with no state history → `baseline`, then ask what to
   improve and route; choose full loop or change mode and say why.
3. **The four activities and eight capabilities** (GDL-01, GDL-04): one
   subsection per capability, each naming its commands and the documents
   it writes.
4. **Checkpoints** (GDL-05, GDL-06): when to stop, the one question to
   ask, and `state checkpoint` to record the answer.
5. **Pages to show** (GDL-05): which rendered page to open for each step.
6. **What the agent decides and what it must not claim**: hypotheses stay
   hypotheses; agent results are diagnostic; never write a new type into
   `docs/helix/`.

The skill grows sub-skills only if a section becomes too long to follow.

## Command architecture

- `packages/design/index.mjs` exports one function per command, each
  returning a plain object. `cli.mjs` parses arguments, calls the function
  and prints `--json` or a summary. MCP tools in `@ux-builder/mcp` import
  the same functions; `packages/mcp/test/design.test.mjs` compares each
  tool's result with the command's `--json` (GDL-71).
- Every write goes through one helper that resolves the app root, refuses
  paths outside `docs/ux/`, `.ux-builder/`, `prototype/` and the
  blueprint files (*[Amended 2026-10-24 — FEAT-018 GDL-80, US-149]* `docs/ux-builder/` and `.ux-builder/`, or the old
  paths for an app not yet migrated; CONTRACT-008 Layout), and records a trace event when an episode is open.
- A network guard in tests stubs `fetch`, `http`, `https`, `net` and
  `dns` to throw; every command's test runs under it.

## Design state

One JSON file validated with `ajv` against the schema on every read and
write. `state set` takes a dotted path and a JSON value. Checkpoint
answers are stored in the state and written to the trace as `decision`
events with `checkpoint: <id>`, so the history survives a rewritten state.

## Documents and templates

Each `artifacts/<type>/` has `meta.yml` (id pattern, output path, required
sections, links it expects), `template.md`, `prompt.md` (what the agent
fills in, and what it must not invent) and `example.md` (the river-finding
app). `validate` reads `meta.yml`: frontmatter shape, ID pattern, required
headings, links that resolve (to `docs/ux-builder/` or HELIX IDs found through the
marker), and the type rules in CONTRACT-008. Each example passes
`validate` in the package's tests.

The `usability-evaluation-report` template is the one already proposed to
HELIX in `docs/proposals/helix-ux-artifact-types`, copied with its
frontmatter adapted to `docs/ux-builder/`.

## Algorithms

### Baseline (GDL-74)

Reads the blueprint, the HELIX PRD and stories (through the marker), the
latest audit report and assessment run. *Retired by ADR-042: an existing app now starts
from HELIX's backfill.* Wrote `docs/ux-builder/baseline.md` with
the current destinations, screens, journeys, findings by journey and a
draft brief, jobs and task list, every item an `A-<n>` assumption with
status `current-state`. The agent then edits it with the person.

### Project rules (GDL-16)

`.ux-builder/principles.json` rules are drawn from a small fixed set the
check can evaluate on the blueprint:

| Kind | Checks |
|---|---|
| `no-step-before` | No journey's first steps before a goal step use a screen with the named pattern or tag (for example a sign-in gate) |
| `max-required-inputs` | No task needs more than N required inputs |
| `max-steps` | No journey has more than N steps |
| `no-modal-in` | Named journeys open no modal |

Findings carry `rule: "project.<PR-id>"` and the principle's text.

### Score (GDL-28)

The flow is a directed graph: screens and modals as nodes, actions as
edges. Per journey:
- **steps**: the journey's step count;
- **shortest path**: breadth-first search from the journey's entry to its
  last screen and state;
- **screens and modals visited**, **navigation hops** (steps that change
  destination);
- **required inputs and decisions**: sums over steps and the task;
- **check findings** on the journey's screens;
- **patterns reused versus introduced**: patterns already used elsewhere in
  the blueprint versus first uses.

Each value is labelled `predicted`.

### Compare (GDL-30)

Refuses when the alternatives' `tasks[].id` sets differ. Renders one HTML
page with `draw`'s flow SVG and `wireframes`' compact and expanded images
per alternative, the score table with the best value per dimension marked,
the agent's judgments from the design state, the rubric's predicted
column and each alternative's findings. Output is sorted and stable, so
the same inputs give the same bytes.

### Simplify (GDL-24)

Rule-based proposals over the task model and journeys:
- an input in `inputs.required` that another task's `systemActions` or the
  app's declared context (location, account) can supply → infer it;
- two consecutive steps on the same screen with no decision between them
  → combine;
- a step whose only outgoing action is primary → remove the decision;
- a decision with a dominant option recorded in evidence → default it;
- a hop to another destination and back → reduce navigation.

Each proposal states what it saves (steps, inputs, decisions) and what it
assumes.

### Complexity delta (GDL-12)

`check --diff <base>` compares two blueprints by IDs: screens, steps per
journey, required inputs and decisions. A journey that grows with no
`decision` event naming it (trace, or a UX decision ADR linking it) gets
`simplicity.delta-decided`.

### Impact and trace (GDL-47 to GDL-49)

An ID graph built from: jobs (`J-`) ← tasks (`T-`) ← journeys ← screens ←
prototype pages ← study tasks ← findings (`F-`), plus UX decision ADRs and
HELIX story and AC IDs. `trace <id>` walks it both ways. `impact` matches
the change's words to blueprint items (screen and action labels, task
goals, step names), lists everything reachable downstream, and sets
`checkpointRequired` when any reached item has a `tested` decision. With
`--apply` it edits the blueprint as the agent specifies through
`--set`, runs `check`, and only on success regenerates prototypes and the
kit and writes `propose` patches.

### Exploratory prototype (GDL-40 to GDL-42)

Reuses the wireframes renderer (server-side pattern rendering with
placeholder content in `plain`, or a named design system with
`--design-system`) and adds a small client script: actions become links to
their target's page, `back` uses history, `state:` actions switch the
state, and a toolbar switches states and size classes. Each page carries a
"Prototype: <question>" banner and `data-piq-screen`. Output:
`docs/ux-builder/prototypes/<alternative>/index.html` and one page per screen and state.

### Readiness (GDL-45, GDL-46)

`ready --for testing` runs lint, `check:blueprint` and the audit against
the branch. `ready --for production` adds the coverage check for every
acceptance criterion the prototype's journeys cover and prints the
design state's `faked[]` list, then the skill asks checkpoint `core-3`.

### Heuristic pass and task metrics (GDL-50, GDL-52)

`assess heuristics` adds a record listing each heuristic with the screens
inspected and its findings, or "none found". Task metrics come from the
assessment's replayable steps: interactions counted from recorded actions,
the shortest path from `score`, backtracks where a screen repeats,
failed actions from step outcomes, time per step from timestamps.

### Test kit and observations (GDL-54 to GDL-58)

The kit rewrites each journey's goal as a task with no screen or control
names (a check rejects any word matching a screen title or action label),
takes success criteria from the journey's ACs, and writes
`observations.csv` with one row per task and columns participant, task,
completed, seconds, errors, assists, remark. `observe import` validates
rows, masks remarks, and writes findings with `source: human`. Metrics
across participants: completion rate, median time, error rate, assists.

### Rubric (GDL-37 to GDL-39, GDL-59)

Predicted values come from computed measures where they exist:

| Dimension | Predicted from |
|---|---|
| Task effectiveness | Every journey walkable (`journey.walkable`) and its ACs reachable |
| Task efficiency | Steps against the shortest path; required inputs |
| Cognitive load | Decisions per step; content items per screen; required inputs |
| Discoverability | Navigation hops; actions reachable from a destination root |
| Learnability | Agent judgment |
| Consistency | `consistency.same-kind` findings; pattern reuse |
| Accessibility | Audit errors (zero is the baseline) |
| Error recovery | Declared error states and task exceptions with a recovery action |
| User confidence | Agent judgment |

Observed values come from imported observations. No total is computed.

### Journey events and insights (GDL-62, GDL-63)

`JourneyProvider` holds the sink in context; `useJourneyStep` emits `step`
on mount and `journey-start` for step 0; widgets that show an error, an
empty state or a no-results search emit when inside a provider. No sink,
no work. `insights` groups exported events by journey and step:
completion rate, abandonment by step, failed searches, median time per
step, and matches support and feedback rows to journeys by the IDs or
screen paths they carry.

### Target users and business rules (GDL-77, GDL-78)

Target users are the PRD's *User Segments* (ADR-042), rows named by who
they are, which `people.segmentsTable` parses (applied or proposed); the
brief's Target users section reads only them, and tasks and studies cite
users by name.
Business rules stay in HELIX as `**BR-<n>** — <rule>`
(`documents.businessRules` reads them through the marker); blueprint tasks
and journey steps cite them in `rules`, and the blueprint's
`businessRules[]` designs each (trigger, before, blocked, recover).
`validate` fails a citation HELIX does not define or a cited rule with no
designed experience; `testKit`, `report`, `trace` and `impact` follow
rules like any other node in the graph.

### The guided conversation (GDL-79)

`process.mjs` holds the eight steps and change mode's four (name,
activity, what the person does, what comes out, the terms introduced) and
`CLOSES`, the steps each checkpoint closes. `overview`, `explain` (from
`glossary.json`) and `step` print from it; `status` leads with "Step n of
8". `review.mjs` derives the reviewable items from the documents and the
blueprint (`user:U-1`, `story:US-3`, `screen:map`…), each with its step
and a hash of its content; `review approve` records the person's words and
that hash, so a changed item needs approving again; feedback (`FB-<n>`)
must be addressed before approval. A checkpoint, and `step next`, refuse
while items of the steps they close await review; `step` also refuses to
move past a step an unpassed core checkpoint closes.
*[Amended 2026-10-27 — FEAT-018 GDL-83]* The hash is now of the item's
meaning (see *The person's time* below), and items are reviewed by tier.

### Layout, migration and modality (GDL-80)

`paths.mjs` (in `@ux-builder/ui`) defines the current and old layouts and
`layoutOf(app)`: the old one only when old files exist and none of the
new. Every writer resolves paths through it; `writable()` is the write
fence. `migrate.mjs` plans the moves, refuses a destination that exists,
uses `git mv` for tracked files and rewrites the app's references.
`modality.mjs` validates the answer against the modality matrix, writes
the blueprint's `supports` and records `state.modality`; the blueprint
CLI's `wireframes` and `prototype --explore` call `modalityStatus` and
exit 1 until the record matches the blueprint.

### Design first (GDL-81)

`@ux-builder/create-app`'s `design-first.mjs`: `startDesign` writes the
design folder (its own templates in `design-folder/`, the skill and state
through `init` with `startedFrom: design`, HELIX's skill and marker);
`buildInPlace` checks the recorded modality, `--theme` and the blueprint,
scaffolds the app in a temporary folder, refuses any file in the way, then
moves it in, merges `package.json`, writes HELIX's starter documents from
the folder's installed copy where none exists, records `state.app` and
traces the create episode. `status` reports what a design folder's build
needs (`BUILD_NEEDS`).

### The person's time (GDL-83)

- **Tiers.** `review.mjs` gives each item a tier from its kind (`TIERS`):
  foundation (`brief`, `user`, `job`, `story`, `rule`, `decision`),
  derived (`task`, `journey`, `alternative`, `screen`, `kit`) or record
  (`evidence`, `report`, `insight`, `experiment`). `pendingReviews` leaves
  records out unless asked, so they hold no checkpoint. `reviewTable(kind)`
  gives a foundation kind's items; `review approve --kind` approves its
  pending items in one answer (`via: table`).
- **Meaning.** `meaningOf(content)` drops a document's frontmatter, trailing
  space and blank runs, and makes list markers one form; the item's `hash`
  is of that, `raw` of the whole content. An approval records `hash`, `raw`
  and `snapshot` (the meaning); it holds while `hash` matches (or, for an
  approval recorded before GDL-83, `raw`). A changed item carries
  `diffText(lineDiff(snapshot, meaning))`, an LCS line diff with one line
  of context, trimmed. `carried(app)` lists approvals that held through a
  change of `raw`.
- **Coverage map.** `coverageMap(app)` builds rows job → tasks (`t.jobs`) →
  journeys (`j.task`) → screens (entry and steps), and exceptions with
  stable IDs (`gap:J-n`, `untraced:<kind>:<id>`, `undefined:BR-n`,
  `assumption:A-n`, an assumption not in the last map approval's
  `assumptions`). `approveMap` refuses while an exception is neither fixed
  nor in `--accept`, then records every pending derived item (`via: map`)
  and a `map` entry with the accepted exceptions and the assumptions seen.
- **Intake and budget.** `intake.mjs` holds the six independent intake
  questions and marks each answered by a source (a brief section other than
  "None yet", HELIX's PRD, the users and jobs tables, evidence, `src/`).
  `budget(app)` lists the decisions left before the first prototype and
  multiplies by `MINUTES_PER_DECISION` (3); `status` prints it.
- **Claims.** `documents.mjs` reads each evidence record's `## Claims`
  table (`evidenceClaims`) and checks it (`claimChecks`): no source, basis
  or confidence is a problem; a direction-changing claim neither verified
  nor low confidence a warning. `research.mjs` writes rows (`claimAdd`,
  `claimVerify`), the section placed before the synthesis notes.
- **Proposals.** `proposals.mjs` reads `helix-proposals/proposals.json`
  and its patches and drafts; `proposalsApply` applies the accepted ones in
  memory, indexes `ddx.id` across the HELIX root, renumbers a clashing new
  ID to the next free one of its prefix (renaming the file and rewriting
  references in the accepted set), checks every result's frontmatter, then
  writes; a failed write restores the originals. Applied files move to
  `applied/`.
- **Advance.** `advance.mjs` runs `validate`, `carried`, `coverageMap`,
  `unverifiedClaims` and the pending proposals, lists the agent's own work,
  and picks the next decision in order: intake, a foundation table, the
  map, core-1, core-2, the modality, proposals, core-3. It writes nothing.
- **Metrics.** `metrics.mjs` appends events (`approval`, `checkpoint`,
  `step`, `feedback`, `turn`, `milestone`) to `.ux-builder/metrics.jsonl`;
  the writers call `logEvent`, which never fails a command. `metrics(app)`
  summarizes active time (gaps capped at 10 minutes), turns by kind,
  approvals before testing (before the `testing` milestone or step 7),
  reopened approvals and minutes to the `prototype` milestone, against
  `TARGETS`.

## Rubric and rule sources (FEAT-018 D-10)

Candidate sources, paraphrased, each checked by `npm run rules`'
provenance check (ADR-025 rule 7) when the data is written:

| Item | Sources |
|---|---|
| Effectiveness, efficiency, satisfaction framing | ISO 9241-11:2018, *Usability: definitions and concepts* |
| Heuristic pass; consistency; error recovery; user confidence | Nielsen Norman Group, *10 Usability Heuristics for User Interface Design* |
| Cognitive load; decisions per step | Nielsen Norman Group, *Minimize Cognitive Load to Maximize Usability*; Hick–Hyman law (Hick 1952; Hyman 1953) |
| Learnability; discoverability | Nielsen Norman Group, *Usability 101*; *Discoverability* articles |
| Accessibility | WCAG 2.2 (already cited by the audit's rules) |
| `simplicity.delta-decided` | Nielsen Norman Group, *Interaction Cost* |
| `consistency.same-kind` | Nielsen heuristic 4, *Consistency and standards* |
| Severity scale | Nielsen Norman Group, *Severity Ratings for Usability Problems* (already summarized in `docs/proposals/helix-ux-artifact-types/docs/resources/`) |

## Sequence

| Phase | Slices | First proof |
|---|---|---|
| 1 | Package and CLI skeleton with the network guard; design state; `init` and create-app; skill; checkpoints and mode; `decide` fields; `check --diff`; brief and project rules; `docs/ux/` types and `validate`; baseline; MCP wrappers | A fixture idea reaches `core-1` with no MCP configured |
| 2 | Evidence and masking; jobs and its rules; `tasks[]`; `simplify` | A fixture research set yields a valid jobs table |
| 3 | Alternatives; `score`; `compare`; `ux-decision`; content and purpose; consistency rule; rubric data and predicted column | Three fixture alternatives compared; one chosen at `core-2` |
| 4 | Exploratory prototype and its lint rule; validated prototype guidance and `ready`; ID graph, `trace`, `impact` | A plain-words change reaches every seeded artifact |
| 5 | Heuristic pass; metrics; test kit; observations and transcripts; rubric observed column; report | A fixture study yields a report with both columns |
| 6 | Journey events; insights; experiments | A fixture event export drives one experiment to a decision |

## Testing

- Each story's STP names its tests; every test runs under the network
  guard, with fixtures for apps, research, observations and events, and no
  model.
- Skill behaviour is tested by reading the installed skill's text, as
  US-107-AC3 does; agent judgment is not tested, but what the CLI accepts
  from the agent is.
- Package gate: `npm test --workspace @ux-builder/design`, added to
  `npm run check`.
- Every new criterion stays in `tools/coverage-exceptions.json` as planned
  until its test cites it.
