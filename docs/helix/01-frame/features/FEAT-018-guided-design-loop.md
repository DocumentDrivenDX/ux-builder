---
ddx:
  id: FEAT-018
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-008
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: FEAT-012
    - kind: informed_by
      to: FEAT-013
    - kind: informed_by
      to: FEAT-016
    - kind: informed_by
      to: ADR-025
    - kind: informed_by
      to: ADR-030
---

# Feature Specification: FEAT-018 — Guided design loop

**Feature ID**: FEAT-018
**Status**: Draft (2026-10-23). Expanded the same day to cover the whole of
ChatGPT's proposal, in six phases; the operator accepted every proposed
decision (D-1 to D-10) and asked for all six phases to be framed for
development. Stage 1 of the operator's plan: new artifact templates and
prompts live in ux-builder; mapping them into HELIX is stage 2, after the
concept is tested. Stage 1 built (2026-10-23): all six phases, B-018 to
B-036, every acceptance criterion cited by a test. Open: stage 2 (the
HELIX mapping), after a trial in a real app with real people (D-11).
**Priority**: P1
**Owner**: Operator
**Covered PRD Subsystem(s)**: Guided design (new); Interaction and
information architecture; UX assessment; Learning from builds; App SDK
**Covered PRD Requirements**: FR-75 to FR-88 (drafted with this feature)
**Cross-Subsystem Rationale**: The loop runs the whole UX process through
one guide. It extends the blueprint (FEAT-008, FEAT-012), the audit and the
assessment (FEAT-009, FEAT-013, FEAT-015), the episode trace (FEAT-016) and
the widgets (FEAT-004, for journey events). It drafts HELIX documents
through `blueprint propose`.

## Overview

The operator wants every app that ux-builder helps an AI agent build or
improve to end up with the simplest, most intuitive experience that lets
users reach their goals with the least effort. The process should be
**guided**: the agent leads and does most of the work, and the human sets
intent, makes the decisions and judges the results.

This feature takes in the whole of ChatGPT's human–agent UX design
proposal, shared by the operator on 2026-10-23. Its three principles are
this feature's principles:

- **Human-directed, AI-executed.** The human owns product decisions,
  priorities and acceptance criteria. The agent does the analysis,
  generation, evaluation and iteration.
- **Artifact-driven.** Each stage produces a structured artifact that the
  next stage reads, and the artifacts trace to each other.
- **Continuous evaluation.** The agent evaluates designs against usability
  principles; real users show whether the designs work. Agent findings are
  diagnostic and never stand in for user evidence.

The proposal's eight stages, its artifacts, its rubric, its agent
architecture and its production loop are all in scope. The stages are
delivered in six phases. A coverage table at the end of this section maps
every element of the proposal to its requirements.

ux-builder already provides part of this:

| Proposal element | Already in ux-builder |
|---|---|
| Flows, screens, states | `app.blueprint.json`: destinations, screens, patterns, actions, states, modalities, and journeys tied to stories and acceptance criteria (FEAT-008, FEAT-012, FEAT-014) |
| Flow checks and diagrams | `blueprint check` (`flow.*`, `journey.*` rules) and `blueprint draw` (IA map, flow, journey and state diagrams) |
| Static wireframes | `blueprint wireframes`: every screen in every declared state at every size class |
| Automated inspection | The audit, with cited rules (FEAT-004, FEAT-008, FEAT-011), and the assessment's heuristic findings with Nielsen 0–4 severity (FEAT-009) |
| AI-simulated task execution | `ux-builder-audit assess` walks blueprint journeys in a real browser and records replayable steps and walkthrough videos (FEAT-009, FEAT-013) |
| Decision history | The episode trace's `record_decision` (FEAT-016) |
| Keeping documents in step | `blueprint propose` drafts HELIX documents as patches (FEAT-012) |

What is missing is the guide that runs these as one process, and most of
the stages around them: user research synthesis, a task model, design
alternatives, prototypes a person can use, human usability testing, a
quality rubric, and learning from the app in production.

### Coverage of the proposal

| Proposal element | Requirements | Phase |
|---|---|---|
| Principles: human-directed, artifact-driven, continuous evaluation | Overview; GDL-01 to GDL-08 | 1 |
| Agent challenges the request; simplicity as a standing objective; the five questions | GDL-09 to GDL-12 | 1 |
| Stage 1: AI-guided experience definition; Product Experience Brief | GDL-13 to GDL-16 | 1 |
| Stage 2: hypothesis generation and evidence synthesis; evidence-linked jobs | GDL-17 to GDL-21 | 2 |
| Stage 3: user task model and its simplification | GDL-22 to GDL-25 | 2 |
| Stage 4: alternative flows, their comparison, interaction decision records | GDL-26 to GDL-31 | 3 |
| Stage 5: experience architecture and consistency | GDL-32 to GDL-36 | 3 |
| UX Quality Rubric, predicted side | GDL-37 to GDL-39 | 3 |
| Stage 6: exploratory and validated prototypes | GDL-40 to GDL-46 | 4 |
| Connected artifacts, traceability and change propagation | GDL-47 to GDL-49 | 4 |
| Stage 7A: automated UX inspection | GDL-50, GDL-51 | 5 |
| Stage 7B: AI-simulated task execution | GDL-52, GDL-53 | 5 |
| Stage 7C: human usability testing, including recordings and transcripts | GDL-54 to GDL-58 | 5 |
| UX Quality Rubric, observed side; UX Evaluation Report | GDL-59 to GDL-61 | 5 |
| Stage 8: continuous improvement in production; experiments | GDL-62 to GDL-69 | 6 |
| Agent architecture: one orchestrating agent, eight capabilities, state | GDL-01 to GDL-03 | 1 |
| Approval gates (intent, model, validated experience; significant changes, experiments, releases) | GDL-05, GDL-06 | 1 |
| Recommended workflow: Define, Explore, Experience, Validate | GDL-04 | 1 |
| Experience Specification as the system of record | *How This Reconciles the Proposal with HELIX* | All |
| Closing question: design only, or also build and keep changing the app | GDL-44 to GDL-46, GDL-62 to GDL-69; Decision D-7 | 4, 6 |
| How a designer or developer installs, starts and uses the guide (added by the operator, 2026-10-23) | GDL-70 to GDL-76 | 1 |

## Developer Experience

*Added 2026-10-23 at the operator's request: how people start and use the
guide, and what they install.*

- **One new package, `@ux-builder/design`**, installed as a dev dependency.
  It holds the guide skill, the new artifact templates and prompts, the
  design state's schema and the `ux-builder-design` command. Blueprint
  commands stay in `@ux-builder/ui`, assessment additions in
  `@ux-builder/audit`, journey events in `@ux-builder/ui` (ADR-036).
- **Started in conversation.** In Claude Code (terminal or the desktop Code
  tab) a person types `/ux-builder-design` or says what they want to
  design. The agent leads from there. People review pages in their browser:
  the brief, the comparison, the prototype and the reports.
- **CLI first, MCP optional.** Every capability is a CLI command with
  `--json` output and a JavaScript API. The skill drives the CLI through the
  agent's shell. MCP tools, where they exist, wrap the same functions.
  Nothing needs to be hosted: the CLI runs from the app's `node_modules`,
  and the MCP server, when used, is a local process the agent starts.
- **An agent does the judgment.** The CLI does the deterministic work:
  scores, comparisons, prototypes, kits, impact lists, the state and
  reports. The interview, synthesis, alternatives, judgments and diagnosis
  are the agent's. The CLI calls no model.
- **A new app** starts with `npm create @ux-builder/app`, which installs the
  package and the skill and points to `/ux-builder-design`. Its first
  session starts at Define.
- **An existing app** runs `npx ux-builder-design init`. Its first session
  starts with a baseline of what exists, then enters the loop where the
  person's request fits.
- **Two ways of working.** The full loop, for a new product or a substantial
  feature; change mode, for everyday changes, which challenges the request,
  shows its impact and complexity and records the decision without running
  the whole loop.
- **Stage 1 homes.** The new artifact types' templates and prompts live in
  the package; the documents they produce live in the app's `docs/ux/`,
  outside `docs/helix/`, linked to the HELIX documents they relate to.
  Mapping them into HELIX (the *Asks of HELIX*) is stage 2.

## Ideal Future State

A product owner opens a session with an agent and says, "I want an app that
helps people find rivers to fish."

1. **Define.** The agent asks the questions that change the design, one at
   a time: "What are the three most important things people should
   accomplish?" When the owner is unsure whether people start from a
   search, a map or an activity, the agent says it will design all three
   and compare them. It writes the experience brief, marking each point
   *confirmed*, *assumed* or *hypothesis*. Checkpoint: "Is this the outcome,
   and is this how we'll know it worked?"
2. **Understand.** The agent proposes user segments and jobs, labelled as
   hypotheses. The owner drops in six interview transcripts and a support
   ticket export. The agent synthesizes them, and the jobs table now shows
   importance, evidence and confidence for each job. "Compare river
   conditions" stays important but low-confidence.
3. **Model and explore.** The agent builds the task model and points out
   two inputs the app could infer. It drafts search-first, map-first and
   activity-first flows, checks them, scores them and shows a comparison
   with its own judgments beside the measured counts. It recommends map
   first with search. Checkpoint: "Which approach should we try?"
4. **Experience.** The agent builds an exploratory prototype of each of
   the two leading flows. The owner tries both, picks one, and says,
   "Don't make me pick an activity first." The agent traces the change
   through tasks, flows, screens, the prototype and the test plan, shows
   what it removed, and records the decision. It then builds the validated
   prototype in the app's theme with realistic sample data.
5. **Validate.** The agent inspects the prototype, walks every journey and
   measures the effort. It prepares a test kit. The owner runs five
   sessions and supplies the recordings' transcripts. The agent reports, per
   rubric dimension, what it predicted and what users showed: "Predicted
   discoverability medium; 3 of 5 found access points." Checkpoint: "Is
   this validated enough to build?"
6. **Improve.** In production, the app's journey events show that 40% of
   users abandon discovery after filtering. The agent diagnoses, proposes a
   simpler filter and asks to run an experiment. The owner approves. The
   agent builds the variant, the app runs it, and the agent compares task
   success and guardrail metrics before asking whether to adopt it.

Each session opens with where things stand: "Map first is chosen. Two
assumptions are untested. Next: test with users."

## Problem Statement

- **Current situation**: ux-builder's UX tools are separate commands that
  a person or agent chains by hand, and they cover only the middle of the
  process. Nothing synthesizes user research, models tasks, generates
  alternatives, produces a usable prototype, records human testing, scores
  designs against a rubric, or learns from the app in production.
- **Pain points**:
  1. Only people who already know the toolchain get its value. Everyone
     else talks to an agent that builds what it is asked for.
  2. Agents optimize for the feature requested. Each addition makes sense
     on its own, and the app gets more complicated one change at a time.
  3. The first design drafted is the one that gets built.
  4. AI guesses about users harden into requirements, because nothing
     separates hypothesis from evidence, or prediction from observation.
  5. Design ends at hand-off. What users do in production never comes back
     to the design.
- **Desired outcome**: One guided process, from intent to production and
  back, that the agent runs and the human steers. It makes alternatives
  cheap, makes complexity visible, puts working experiences in front of
  people, keeps agent predictions apart from user evidence, and keeps
  every artifact consistent as the design changes.

## Functional Areas

| Area | User question or job | Feature responsibility | Phase |
|------|----------------------|------------------------|-------|
| Setup | "How do I install and start it?" | The package, the CLI, new and existing apps, full loop and change mode, stage 1 homes | 1 |
| Guide | "What do we do next?" | One orchestrating skill, its state, checkpoints, the four-activity workflow | 1 |
| Simplicity | "Does this earn its complexity?" | Challenge questions, the standing objective, the complexity delta | 1 |
| Define | "What are we building, and for whom?" | The experience brief | 1 |
| Understand | "What do users need, and how sure are we?" | Hypotheses, evidence synthesis, evidence-linked jobs | 2 |
| Tasks | "What must users accomplish?" | The task model and its simplification | 2 |
| Explore | "What are the options, and which is simplest?" | Alternative flows, comparison, decision records | 3 |
| Architecture | "How does the app fit together?" | Screen inventory, content hierarchy, patterns, consistency | 3 |
| Rubric | "How good is this design?" | Nine dimensions, predicted and observed | 3, 5 |
| Experience | "Can I try it?" | Exploratory and validated prototypes, change propagation | 4 |
| Evaluate | "Does it work for real people?" | Inspection, simulated tasks, human testing, the report | 5 |
| Improve | "What happens after release?" | Journey events, diagnosis, experiments | 6 |

### Terms

- **Guide**: the orchestrating agent skill, `ux-builder-design`.
- **Checkpoint**: a point where the guide stops and asks the human one
  question. It is not a document sign-off. The answer is recorded as a
  decision.
- **Hypothesis / evidence**: a claim about users the agent proposed, versus
  one supported by research, observation or data.
- **Predicted / agent-measured / observed**: a quality judgment from the
  plan, from the agent's walk of the running app, or from real users.
- **Task**: something a user must accomplish, with its goal, trigger,
  inputs, actions, success criteria and exceptions.
- **Alternative**: one candidate blueprint for the same tasks.
- **Exploratory prototype**: a quick, disposable experience that answers
  one named design question.
- **Validated prototype**: the chosen design, built in the app's theme from
  the SDK's patterns with realistic data, ready to test with users.
- **Design state**: the guide's memory of where the process is.

## Requirements

### Functional Requirements by Area

#### Phase 1: The guide, simplicity and definition

##### Package and setup

GDL-70. A new package, `@ux-builder/design`, installed as a dev
dependency, holds the guide skill, the new artifact types' templates and
prompts, the design state's JSON Schema and the `ux-builder-design`
command. It depends on `@ux-builder/ui`, `@ux-builder/audit` and
`@ux-builder/trace`, and on nothing that calls a network service.

GDL-71. **CLI first, MCP optional.** Every capability in this feature is a
CLI command with `--json` output, backed by an exported JavaScript
function. The skill drives the CLI through the agent's shell and works
with no MCP server configured. MCP tools that wrap the same functions
return the same results, and a test checks that they match. Nothing is
hosted: the CLI runs from the app's `node_modules`, and the MCP server,
when used, is a local process over stdio.

GDL-72. **A new app.** `npm create @ux-builder/app` adds
`@ux-builder/design` to the app, installs the skill into
`.claude/skills/`, writes an empty design state, and points to
`/ux-builder-design` from `CLAUDE.md`, `AGENTS.md` and the starter's empty
Home panel. `--mcp` also writes `.mcp.json` for the ux-builder MCP server;
without it, none is written.

GDL-73. **An existing app.** `npx ux-builder-design init` installs the
skill and writes an empty design state. It handles three starting points:
- an app with ux-builder, a blueprint and HELIX: nothing more;
- an app with ux-builder and no blueprint: it runs `ux-builder-blueprint
  init`, and the guide helps describe the current screens;
- an app without ux-builder: the guide works on the blueprint alone, and
  says that the validated prototype and the audit need the SDK, pointing to
  the adoption path.

`init --mcp` also writes `.mcp.json`. `init` refuses to overwrite an
existing design state.

GDL-74. **Baseline for an existing app.** The first session in an existing
app reads the blueprint and HELIX documents, runs the audit and the
assessment, and drafts the current brief, jobs and task model, every point
marked *current state, assumed*. It then asks what the person wants to
improve and enters the loop where the request fits: a specific change goes
to impact and Explore; "too complicated" to the assessment and
`simplify`; user complaints to evidence; a new feature to Define.

GDL-75. **Full loop and change mode.** The guide runs the full loop for a
new product or a substantial feature. For an everyday change ("add a
filter to the list") it runs change mode: the challenge questions
(GDL-10), `impact` (GDL-48), the complexity delta (GDL-12) and a recorded
decision (GDL-11), stopping at a checkpoint only when the change touches
something already validated (GDL-06). The guide says which mode it is in
and why, and the person can switch.

GDL-76. **Stage 1 homes.** Each new artifact type has a template, a prompt,
an example and a `meta.yml` in the package, under
`artifacts/<type>/`, in the shape HELIX uses for its own types. The
documents produced live in the app's `docs/ux/`, outside `docs/helix/`,
each with frontmatter linking the HELIX documents it relates to.
`ux-builder-design status` lists them. The guide never writes a new type
into `docs/helix/`; existing HELIX documents change only through
`propose` (GDL-08). The types and paths are in CONTRACT-008.

`ux-builder-design status` also prints, for a person without a session
open, where the loop stands and what comes next.

##### Guide

GDL-01. `@ux-builder/design` ships one orchestrating skill,
`ux-builder-design`. `create-app` installs it beside `ux-builder-ui`. It has eight
capabilities, each a section of the skill that grows into a sub-skill or
subagent if it needs to:

| Capability | Responsibility |
|---|---|
| Requirements analysis | Clarify goals and constraints (Define) |
| UX research | Propose hypotheses and synthesize evidence (Understand) |
| Task modelling | Define goals and task structures (Tasks) |
| Interaction optimization | Generate and compare alternative flows (Explore) |
| UX design | Information architecture and interfaces (Architecture) |
| Prototyping | Exploratory and validated prototypes (Experience) |
| UX evaluation | Inspection, simulated tasks, human tests, production data (Evaluate, Improve) |
| Artifact management | Consistency and traceability across artifacts |

The human never has to name a command. The guide runs the tools itself
and shows their results as pages.

GDL-02. The guide keeps a **design state** in a committed file,
`.ux-builder/design-state.json`, with a JSON Schema. It holds:
- the current activity and the checkpoints passed or skipped;
- open questions;
- assumptions and hypotheses, each with a status (*assumed*, *hypothesis*,
  *confirmed*, *refuted*) and its evidence;
- the alternatives, with which was chosen, which were rejected, and why;
- unresolved usability issues;
- running experiments;
- the next action the guide proposes.

`ux-builder-design state get` and `state set` read and write it; MCP
`get_design_state` and `update_design_state` wrap the same functions
(GDL-71). Each session opens with a short summary of the state.

GDL-03. The guide reads from two sides, as the proposal's architecture
describes:
- **UX knowledge**: design principles (the rules and the rubric), research
  evidence, task models and decision history;
- **UX tooling**: browser automation (the assessment), prototype
  generation, accessibility testing (the audit) and analytics (journey
  events, Phase 6).

GDL-04. The human works through four recurring activities, and the guide
moves between the stages inside them without being asked:

| Activity | Stages | What the human does |
|---|---|---|
| Define | 1, 2, 3 | Describes what users should accomplish; answers questions; supplies research |
| Explore | 4, 5 | Compares alternatives and gives direction |
| Experience | 6 | Uses the prototype and asks for changes |
| Validate | 7, 8 | Runs or watches tests; reviews evidence; decides what to implement |

The human works mainly with the evolving experience, not the documents.
The guide keeps the documents up to date.

GDL-05. The guide stops at three **core checkpoints**:
1. after Define: the intended experience and its success criteria;
2. after Explore: the interaction model to pursue;
3. after Validate: whether the validated experience goes to production
   implementation.

GDL-06. The guide also stops at three **conditional checkpoints**:
- before a significant design change to something already validated;
- before any experiment that real users will see;
- before a production release of a changed experience.

At every checkpoint the guide asks one question, waits, and records the
answer as a decision (trace and design state). The human may skip a
checkpoint, and the skip is recorded with its reason.

GDL-07. The guide asks one question at a time, and only questions whose
answers materially change the design. It makes small, reversible
assumptions itself and lists them for review.

GDL-08. HELIX documents change only through `propose` patches. The guide
offers them as a batch at each checkpoint, and a person applies the ones
they accept (ADR-030).

##### Simplicity

GDL-09. The standing objective in `AGENTS.md` and the skill: design the
minimum viable interaction that lets the intended user accomplish the
intended outcome successfully, confidently and efficiently; prefer
eliminating interactions to adding features; challenge requirements that
add complexity without measurable user value.

GDL-10. When the human asks for a new feature, the guide challenges it
before designing it:
- What user goal does it support?
- Is it necessary?
- Could an existing interaction reach the same goal?
- Could the system do the task for the user?
- Would it increase cognitive load?
- Is there a simpler interaction model?

GDL-11. Before recommending a significant UX change, or adding a
destination, screen, modal, required input or journey step, the agent
records a decision answering five questions: the user goal; whether the
goal can be reached without it; the simplest viable alternative; the
assumptions about user behaviour; and how the team will know the result
is better. `record_decision` gains these fields (an amendment to
CONTRACT-007), and the skill requires them.

GDL-12. `blueprint check --diff <base>` reports the **complexity delta**
against a base blueprint: added and removed screens, steps, required
inputs and decisions, per journey. It warns when a journey grows and no
GDL-11 decision names the change. The warning is a cited rule in
`rules.json` (ADR-025 rule 7).

##### Define (stage 1)

GDL-13. Define runs as a structured interview through HELIX's `grill` and
frame activities, which draft or update the PRD and stories. Where the
human is unsure between interaction models, the guide does not force an
answer: it records an open question and carries it to Explore.

GDL-14. `ux-builder-design brief` writes the **experience brief**,
`docs/ux/brief.md` and a rendered page, from the PRD, stories and design
state: product, target users, primary outcome, primary jobs, experience
principles, constraints and open questions. It is a living document,
regenerated whenever its sources change.

GDL-15. Every point in the brief is marked *confirmed*, *assumed* or
*hypothesis*, and the brief lists what would confirm each hypothesis.

GDL-16. Experience principles from the brief (for example "no mandatory
account creation") become project-level rules the blueprint check applies,
where a check can express them, and rubric notes where it cannot.

#### Phase 2: Users and tasks

##### Understand (stage 2)

GDL-17. **Hypothesis mode.** The research capability proposes user
segments, jobs to be done, motivations, frustrations, usage contexts and
accessibility needs from the brief and domain knowledge. Every item is
labelled *hypothesis* and carries no evidence.

GDL-18. **Evidence mode.** The human supplies research material: interview
notes or transcripts, analytics exports, support tickets, survey results,
or usability observations. `ux-builder-design evidence add` records each
source, with its kind, date and provenance, as `docs/ux/evidence/EV-<n>.md`.
The research capability
synthesizes them and reports:
- repeated frustrations;
- common task sequences;
- unmet needs;
- differences between segments;
- conflicts between what users say and what they do.

GDL-19. Evidence is masked before it is stored (the trace's masking), and
participants appear only by pseudonym. Raw material stays where the owner
keeps it; ux-builder stores the excerpts it cites and a reference to the
source.

GDL-20. The result is an **evidence-linked jobs table**. Each job has
importance, evidence (the sources that support it) and confidence, rated
separately. A job can be important and low-confidence. In stage 1 the
table lives in `docs/ux/jobs.md`; in stage 2 it moves to the PRD's user
needs section (D-4, H-2).

GDL-21. Each job has a stable ID (`J-<n>`) so tasks, journeys and test
results can trace to it. A job whose confidence is low is flagged wherever
a design decision relies on it.

GDL-77. **Structured target users** *(added 2026-10-24)*. The people the
product is for are records, not a list of names: `docs/ux/users.md` holds a
row per target user (`U-<n>`) with their context (where, on what device,
with what expertise), their needs (accessibility needs and constraints),
the jobs they hold with an importance for each (the same job can matter
more to one user than another), and evidence, confidence and status rated
as for jobs. They are evidence-backed segments, not personas with invented
biographies. The brief's *Target users* is generated from them; tasks name
the users they serve; the test kit's screener and scenarios, the
observation sheet and the evaluation report are organized by them; and
`trace` follows a user to its jobs, tasks and journeys.

##### Tasks (stage 3)

GDL-22. The blueprint gains `tasks[]` (an amendment to CONTRACT-005). Each
task has:

| Field | Meaning |
|---|---|
| `id` | `T-<n>` |
| `goal` | The outcome the user wants |
| `jobs` | The jobs it serves (`J-<n>`) |
| `trigger` | What starts it |
| `inputs.required` | Information the user must give |
| `inputs.optional` | Information the user may give, or that can be inferred or deferred |
| `systemActions` | Work the system does automatically |
| `userActions` | Interactions the user must perform |
| `success` | The observable completion condition, as acceptance criteria IDs |
| `exceptions` | Error and recovery scenarios |
| `subtasks` | Ordered subtasks, each with its alternative ways (for example "use current location", "enter destination", "explore without location") |

GDL-23. A journey names the task it realizes (`journeys[].task`), so one
task can be compared across alternative flows.

GDL-24. `blueprint simplify` analyses the task model and proposes, per
task: steps to eliminate, interactions to combine, inputs to infer,
sensible defaults, decisions to remove and navigation to reduce. Each
proposal states what it saves and what it assumes. Nothing changes until
the human accepts it.

GDL-25. The guide drafts the task model from the jobs and stories, and the
human confirms the essential goals before Explore (part of checkpoint 1).

#### Phase 3: Alternatives, architecture and the rubric

##### Explore (stage 4)

GDL-26. The blueprint can have named **alternatives** for the same tasks,
stored as separate files (`app.blueprint.<name>.json`). Each is a complete
blueprint and is checked like the main one. Choosing one makes it the
app's `app.blueprint.json`; the others are kept with the reason they were
rejected.

GDL-27. The interaction optimization capability generates alternatives
from the task model: at least two for every open question about the
interaction model, and a recommendation.

GDL-28. `blueprint score` computes, per journey: steps, screens and modals
visited, required inputs and decisions, navigation hops, check findings,
and patterns reused versus introduced. Each is labelled *predicted*.

GDL-29. The agent adds **design judgments** per alternative against
criteria that fit the product (for example initial effort, support for
known destinations, support for exploration, required user knowledge,
mobile suitability, personalization potential). Each judgment is labelled
a preliminary judgment, not a measured result, with its reasoning.

GDL-30. `blueprint compare` writes one HTML page for two or more
alternatives: their flows and wireframes side by side, the scores with
the best value per dimension marked, the agent's judgments, the rubric's
predicted column (GDL-38) and each alternative's check findings. It is
deterministic. *(Built 2026-10-23: the rubric's predicted column is
`ux-builder-design rubric --alternative <name>`, since the page is
rendered by `@ux-builder/ui` without the design package.)*

GDL-31. Each major UX decision is recorded as an **interaction decision
record**: the question, the alternatives, the recommendation, the
rationale, the assumptions, and a validation status (*not tested*,
*tested*, *refuted*) with the validation it requires. In stage 1 it is
written as `docs/ux/decisions/UXD-<n>.md`; in stage 2 it maps to a HELIX
ADR or the solution design's *Solution Approaches* (H-3).

##### Architecture (stage 5)

GDL-32. The blueprint covers the experience architecture's seven parts.
Five exist today; this feature adds the rest:

| Part | Where |
|---|---|
| Navigation model | `destinations`; per-size-class navigation (open bead `ux-builder-31d6f155`) |
| Screen inventory | `screens[]` with purposes (adds `screens[].purpose`) |
| Interaction patterns | `screens[].pattern` and the recipes |
| Content hierarchy | New: `screens[].content`, the information on the screen in priority order |
| State model | `screens[].states` |
| Responsive behaviour | `supports.sizeClasses` and the patterns' adaptation |
| Accessibility requirements | The audit's rules; new per-screen notes where a screen needs more |

GDL-33. Information architecture, interaction design and interface design
are generated together from the chosen flow, not one after another.

GDL-34. **Consistency.** Where two or more tasks need the same kind of
interaction (for example choosing a location), the check reports screens
that use different patterns or different flows for it, and recommends one.
Tasks declare the interaction kinds they need for this.

GDL-35. Wireframes show the content hierarchy: the highest-priority content
is placed and labelled first.

GDL-36. `propose` drafts the architecture into HELIX's design system
(*Destinations by Size Class*), screen-flow and wireframe documents (H-1).

##### Rubric, predicted side

GDL-37. ux-builder ships a **UX quality rubric** as cited data,
`guidelines/rubric.json`, with nine dimensions: task effectiveness, task
efficiency, cognitive load, discoverability, learnability, consistency,
accessibility, error recovery and user confidence. Each has its
evaluation question and the measures that inform it.

GDL-38. For each alternative, the guide fills the rubric's *predicted*
column: computed measures where they exist (efficiency from steps and
inputs, consistency from GDL-34, accessibility from the audit, error
recovery from declared states and exceptions), and an agent judgment with
its reasoning where they do not.

GDL-39. The rubric is never averaged into one score. Task effectiveness and
accessibility are baselines: an alternative that fails either is not
recommended, whatever its other scores. The other dimensions are optimized
after that.

#### Phase 4: Prototypes and change propagation

##### Exploratory prototypes (stage 6, level 1)

GDL-40. `blueprint prototype --explore` writes a **disposable, clickable
prototype** for each alternative, to `prototype/<alternative>/`, outside
the app's source:
- each screen renders its pattern with placeholder content;
- each action navigates to its `to`;
- each screen has a switcher for its declared states and size classes;
- every page is marked as a prototype and names the design question it
  answers.

GDL-41. The prototype can be generated in more than one interface design
for the same flow (for example two design systems' variants), so the human
can compare presentation as well as flow.

GDL-42. Lint refuses any import of `prototype/` from the app's source.
Exploratory prototypes are deleted or archived when their question is
answered.

GDL-43. The human evaluates prototypes by using them. The guide asks what
they noticed and records it as an observation from the design team, not
as user evidence.

##### Validated prototype (stage 6, level 2)

GDL-44. The **validated prototype** is the chosen design built in the
app's source, on a branch, by the agent: the app's theme, the SDK's
patterns, the selected navigation, and realistic sample data (HELIX's
`sample-data` concern). It is ordinary app code built from the SDK, which
is what ux-builder exists for; the SDK still generates no screen code for
it (see Decision D-2).

GDL-45. It passes lint, `check:blueprint` and the audit before it is shown
to test users.

GDL-46. **Prototype is not production.** Before the validated prototype
becomes production code, the guide runs a production-readiness pass:
tests for every acceptance criterion it covers, the audit with no errors,
data and error handling the prototype faked, and the third core
checkpoint. Until then the branch is marked as a prototype.

##### Traceability and change propagation (section 10)

GDL-47. Every artifact carries IDs that link it: job → task → journey →
screen → prototype page → test task → finding. `ux-builder-design trace
<id>` shows everything linked to an item, upstream and down.

GDL-48. `ux-builder-design impact "<change>"` takes a change in plain words
(for example "remove activity selection before exploring"). It lists every
affected task, flow, screen, pattern, prototype page, test-kit task,
finding and HELIX document. On the human's go-ahead it updates the
blueprint, regenerates the prototypes and the test kit, proposes the HELIX
patches and records the decision.

GDL-49. The human reviews the result, not each artifact. The guide shows
one summary of what changed, with the complexity delta (GDL-12).

#### Phase 5: Evaluation

##### Automated inspection (stage 7A)

GDL-50. The assessment adds a heuristic inspection pass: each of Nielsen's
ten heuristics, error prevention and recovery, information hierarchy
(against the declared content order, GDL-32) and navigation complexity. It
reports every heuristic it checked, with findings and the screens where it
found none, so coverage is visible.

GDL-51. Inspection runs on exploratory prototypes as well as on the app,
so obvious problems are fixed before any user sees them.

##### Simulated task execution (stage 7B)

GDL-52. For each journey, the assessment records *agent-measured* task
metrics: completion, interactions taken versus the blueprint's shortest
path, the path taken, backtracks, failed actions, information the agent
could not find, interface errors and time per step.

GDL-53. Every report of simulated tasks states that they are diagnostic:
agents navigate differently from people and may infer what a person would
not see.

##### Human usability testing (stage 7C)

GDL-54. `ux-builder-design test-kit` writes a test kit,
`docs/ux/tests/TK-<n>/`, from the journeys:
test scenarios phrased as user goals with no interface words, success
criteria from the acceptance criteria, a facilitator script, a consent
note, a recruiting screener from the brief's target users, and an
observation sheet with one row per task.

GDL-55. Observations are imported as findings with `source: human`: the
participant's pseudonym, the task, completed or not, time, errors,
assistance needed, and a paraphrased remark. They use the assessment's
`F-` IDs and findings shape (CONTRACT-006).

GDL-56. **Recordings and transcripts, when authorized.** The owner can
supply session transcripts, or recordings that are transcribed locally.
The guide analyses them only after the owner confirms participant consent
for that session. It extracts observations with timestamps, masks them,
and stores the excerpts it cites. Recordings themselves are never copied
into the repository (Decision D-5).

GDL-57. The guide calculates task metrics across participants (completion
rate, median time, error rate, assists) and identifies recurring problems.

GDL-58. Every finding is labelled as a verified human observation or an
agent recommendation. A recommendation never appears as an observation.

##### Rubric, observed side, and the report

GDL-59. The rubric's *observed* column is filled from human testing (for
example "90% completion", "median 45 seconds", "3 of 5 found the
feature"). Where predicted and observed disagree, the report highlights
it, and the assumptions behind the prediction move to *refuted*.

GDL-60. The results are written as a **UX evaluation report**: method,
tasks, findings by journey with evidence and severity, proposed
corrections, the rubric with both columns, and what was not tested. In
stage 1 it is `docs/ux/evaluations/UER-<n>.md`, from the
`usability-evaluation-report` template already proposed to HELIX; in
stage 2 it becomes HELIX's type (H-1).

GDL-61. Findings are prioritized into proposed improvements. At the third
checkpoint the human decides which to implement; they go to HELIX's
improvement backlog through `propose`, and decision records move to
*tested* or *refuted*.

#### Phase 6: Continuous improvement in production (stage 8)

GDL-62. `@ux-builder/ui` gains **journey events**: when an app opts in,
the SDK emits events for journey start, each step reached, completion,
abandonment, errors shown, empty results and searches with no results,
tagged with blueprint journey, screen and step IDs. The SDK delivers them
only to a sink the app provides (for example the app's own analytics). The
SDK sends nothing anywhere itself (Decision D-1).

GDL-63. The app's owner exports journey events, support requests and
feedback as files. `ux-builder-design insights` reads them and writes
`docs/ux/insights/INS-<date>.md`, reporting per journey: completion, abandonment points, failed searches, feature use and
the steps where time is spent. It never fetches data itself.

GDL-64. The guide runs the loop *observe → diagnose → hypothesize → design
→ test → measure → refine*: it turns an observation into a diagnosis with
alternative explanations, a hypothesis and a proposed design change (a new
blueprint alternative).

GDL-65. An experiment needs the conditional checkpoint before users see it
(GDL-06). The guide states the variant, the success metric, the guardrail
metrics and how long it runs.

GDL-66. With approval, the agent builds the variant in the app behind the
app's own feature flag, through the validated-prototype path (GDL-44 to
GDL-46).

GDL-67. When the experiment ends, the guide compares task success and
guardrail metrics, records the result against the hypothesis, and asks
whether to adopt the change (the release checkpoint).

GDL-68. Metric definitions, dashboards and the improvement backlog are
HELIX's (metric-definition, metrics-dashboard, improvement-backlog, and
its experiment mode). The guide drafts them through `propose`.

GDL-69. Production findings feed the same evidence store as research
(GDL-18), so the jobs table's confidence and the rubric's observed column
update as the app is used.

### Non-Functional Requirements

- **Deterministic**: `score`, `compare`, `simplify`, `prototype`,
  `test-kit` and `impact` give the same output for the same input.
- **Nothing reported by the SDK**: no ux-builder tool or package makes a
  network request to report usage. Journey events go only to the app's own
  sink; insights read files the owner supplies.
- **Masked and pseudonymous**: research evidence, observations and
  transcripts pass through the trace's masking; participants appear only
  by pseudonym.
- **Consent recorded**: no recording or transcript is analysed without a
  recorded consent confirmation for that session.
- **Works without HELIX, better with it**: without a `.helix.yml`, the
  brief, jobs and decisions live in the design state, and `propose` is
  skipped.

## Asks of HELIX

These belong in HELIX and are proposed to it, not built here.

- **H-1. Accept the five UX artifact types** in
  `docs/proposals/helix-ux-artifact-types`: user-journey-map, screen-flow,
  wireframe, interaction-state-diagram and usability-evaluation-report.
  HELIX v0.19.1 (2026-10-22) has none of them.
- **H-2. Evidence-rated user needs**: a section of the PRD or research
  plan that rates each need for importance, evidence and confidence
  separately, with stable IDs.
- **H-3. Validation status on UX decisions**: *not tested*, *tested* or
  *refuted*, on ADRs or a UX form of them.
- **H-4. Checkpoints as stop triggers**: the core and conditional
  checkpoints added to `stop-triggers.yml`, so HELIX stops for a human at
  these moments without adding document approval gates.
- **H-5. A UX lane** in the HELIX skill that hands design work to
  `ux-builder-design` when the repository has a blueprint.
- **H-6. A task model home**: either a section of the feature
  specification or the screen-flow type (H-1), so the blueprint's tasks
  project into a HELIX document.
- **H-7. Experiments linked to UX decisions**: HELIX's experiment mode
  records which UX decision and hypothesis an experiment tests.

## How This Reconciles the Proposal with HELIX

| Proposal idea | Here |
|---|---|
| One Experience Specification as the system of record | Split by kind, as ADR-030 decided: HELIX documents hold intent, evidence and rationale and govern; the blueprint holds structure (tasks, flows, journeys, screens, states) and projects them. The guide's artifact management keeps them consistent through `check`, `impact`, `propose` and the design state. The prototype is generated from the blueprint, as the proposal intends |
| Approval gates | Checkpoints where the guide stops and asks (GDL-05, GDL-06, H-4). Documents need no sign-off |

The proposal's seven connected artifacts, and its rubric:

| Proposal artifact | Where it lives |
|---|---|
| Product Experience Brief | HELIX PRD and stories, rendered as the brief (GDL-14) |
| User Jobs and Task Model | Jobs in the PRD (GDL-20, H-2); tasks in the blueprint (GDL-22) |
| Optimized Interaction Flows | Blueprint alternatives and journeys; screen-flow documents (H-1) |
| Experience Architecture | The blueprint (GDL-32); design system and wireframe documents |
| Executable Prototype | Exploratory and validated prototypes (GDL-40 to GDL-46) |
| UX Evaluation Report | GDL-60, H-1 |
| UX Decision Log | Interaction decision records in HELIX (GDL-31); design state; trace |
| UX Quality Rubric | `guidelines/rubric.json` (GDL-37) |

## User Stories

**Phase 1**

- [US-114 — Install the design package and start a guided session in a new app](../user-stories/US-114-install-the-design-package-and-start-a-guided-session-in-a-new-app.md)
- [US-115 — Start the guide in an existing app from a baseline](../user-stories/US-115-start-the-guide-in-an-existing-app-from-a-baseline.md)
- [US-116 — Use the guide with or without MCP](../user-stories/US-116-use-the-guide-with-or-without-mcp.md)
- [US-117 — The guide keeps its state and resumes where it stopped](../user-stories/US-117-the-guide-keeps-its-state-and-resumes-where-it-stopped.md)
- [US-118 — The guide stops at checkpoints and records the answers](../user-stories/US-118-the-guide-stops-at-checkpoints-and-records-the-answers.md)
- [US-119 — The agent challenges a request and records the five answers](../user-stories/US-119-the-agent-challenges-a-request-and-records-the-five-answers.md)
- [US-120 — See the complexity a blueprint change adds](../user-stories/US-120-see-the-complexity-a-blueprint-change-adds.md)
- [US-121 — Make an everyday change in change mode](../user-stories/US-121-make-an-everyday-change-in-change-mode.md)
- [US-122 — See the experience brief with confirmed, assumed and hypothesis points](../user-stories/US-122-see-the-experience-brief-with-confirmed-assumed-and-hypothesis-points.md)
- [US-123 — New artifact types live in docs/ux and are validated](../user-stories/US-123-new-artifact-types-live-in-docs-ux-and-are-validated.md)

**Phase 2**

- [US-124 — The agent proposes user hypotheses, labelled as such](../user-stories/US-124-the-agent-proposes-user-hypotheses-labelled-as-such.md)
- [US-125 — Add research evidence and get it synthesized](../user-stories/US-125-add-research-evidence-and-get-it-synthesized.md)
- [US-126 — Read an evidence-linked jobs table](../user-stories/US-126-read-an-evidence-linked-jobs-table.md)
- [US-127 — Model tasks in the blueprint](../user-stories/US-127-model-tasks-in-the-blueprint.md)
- [US-128 — Accept simplifications of the task model](../user-stories/US-128-accept-simplifications-of-the-task-model.md)

**Phase 3**

- [US-129 — Draft and check alternative blueprints](../user-stories/US-129-draft-and-check-alternative-blueprints.md)
- [US-130 — Score and compare alternatives side by side](../user-stories/US-130-score-and-compare-alternatives-side-by-side.md)
- [US-131 — Record an interaction decision with its validation status](../user-stories/US-131-record-an-interaction-decision-with-its-validation-status.md)
- [US-132 — Describe the experience architecture in the blueprint](../user-stories/US-132-describe-the-experience-architecture-in-the-blueprint.md)
- [US-133 — Keep the same interaction consistent across tasks](../user-stories/US-133-keep-the-same-interaction-consistent-across-tasks.md)
- [US-134 — See each alternative's predicted rubric](../user-stories/US-134-see-each-alternatives-predicted-rubric.md)

**Phase 4**

- [US-135 — Try exploratory prototypes of each alternative](../user-stories/US-135-try-exploratory-prototypes-of-each-alternative.md)
- [US-136 — Build a validated prototype and pass the readiness check](../user-stories/US-136-build-a-validated-prototype-and-pass-the-readiness-check.md)
- [US-137 — Trace an item and apply a change everywhere it reaches](../user-stories/US-137-trace-an-item-and-apply-a-change-everywhere-it-reaches.md)

**Phase 5**

- [US-138 — The assessment runs a heuristic inspection pass](../user-stories/US-138-the-assessment-runs-a-heuristic-inspection-pass.md)
- [US-139 — See agent-measured task effort per journey](../user-stories/US-139-see-agent-measured-task-effort-per-journey.md)
- [US-140 — Get a usability test kit from the journeys](../user-stories/US-140-get-a-usability-test-kit-from-the-journeys.md)
- [US-141 — Import observations and consented transcripts](../user-stories/US-141-import-observations-and-consented-transcripts.md)
- [US-142 — Read the UX evaluation report with predicted and observed results](../user-stories/US-142-read-the-ux-evaluation-report-with-predicted-and-observed-results.md)

**Phase 6**

- [US-143 — Send journey events to the app's own analytics](../user-stories/US-143-send-journey-events-to-the-apps-own-analytics.md)
- [US-144 — Read production insights per journey](../user-stories/US-144-read-production-insights-per-journey.md)
- [US-145 — Run an experiment through its checkpoints](../user-stories/US-145-run-an-experiment-through-its-checkpoints.md)

**Amendment, 2026-10-24**

- [US-146 — Describe target users with their context and evidence](../user-stories/US-146-describe-target-users-with-their-context-and-evidence.md)

## Edge Cases and Error Handling

- **The human skips a checkpoint and asks to build**: the guide records the
  skip and its reason and continues.
- **No research is available**: Phase 2 continues on hypotheses, every job
  stays *hypothesis*, and the brief and report say so.
- **No real users are available**: Validate ends with agent results only,
  and the report says that no human evidence exists.
- **Alternatives cover different tasks**: `compare` refuses and names the
  tasks that differ.
- **A change breaks a journey**: the check fails, and prototypes and the
  test kit are not regenerated until it passes.
- **Observed results contradict a confirmed assumption**: it moves to
  *refuted*, and the guide proposes reopening the decisions that relied on
  it.
- **A transcript arrives without consent recorded**: the guide refuses to
  analyse it and says why.
- **Journey events name a journey the blueprint no longer has**: insights
  reports them as unmatched rather than dropping them.
- **Someone imports from `prototype/` in app code**: lint fails.

## Success Metrics

- On a fixture app, a person goes from a one-line idea to a chosen,
  prototyped and evaluated design by following only the guide's prompts,
  without naming a command.
- Every checkpoint answer appears in the design state and the trace.
- On seeded fixtures: `simplify` finds every seeded inferable input;
  `compare` marks the alternative with the fewest steps and inputs;
  `impact` lists every seeded dependent artifact.
- On a fixture study, the report's observed column matches the imported
  observations exactly, and every finding is labelled human or agent.
- In replayed evaluation tasks (FEAT-016 TRC-11), apps built through the
  guide have no more steps per journey than the same goal built without it.

## Constraints and Assumptions

- ADR-030 holds: HELIX governs, and the blueprint projects it.
- The guide runs in an agent that can use skills and MCP (Claude Code
  first). Other agents use the commands directly.
- AI task execution and AI judgments are diagnostic. They never replace
  observing real users, and no report presents them as if they did.

## Decisions

The operator accepted every proposed answer on 2026-10-23 ("Accept all
proposed"). Each is recorded in an ADR.

| ID | Decision | Recorded in |
|---|---|---|
| D-1 | Journey events: the SDK may emit events to a sink the app supplies, and never sends anything itself. The "nothing reported" principle stands, clarified | ADR-038 |
| D-2 | Generated *exploratory* prototypes are allowed outside the app's source; the validated prototype is app code the agent builds from the SDK's patterns. ADR-025 decision 3 stands for app code | ADR-037 |
| D-3 | The guide is a ux-builder skill; HELIX hands design work to it (H-5) | ADR-036 |
| D-4 | Jobs and evidence: `docs/ux/` in stage 1; the PRD's user needs section in stage 2 (H-2) | ADR-036, ADR-039 |
| D-5 | Transcripts only; recordings stay with the owner, outside the repository | ADR-039 |
| D-6 | Building the validated prototype and experiments in the app stays within the vision: the agent builds them with the SDK in the app's own code | ADR-037 |
| D-7 | Design and build: the guide designs, then builds the validated prototype and experiments, always behind checkpoints | ADR-037 |
| D-8 | Alternatives are separate blueprint files, `app.blueprint.<name>.json` | ADR-036 |
| D-9 | The design state is committed in the app's repository | ADR-036 |
| D-10 | Rubric and new rules cite published sources, paraphrased, under ADR-025 rule 7; the candidate sources are listed in SD-006 and pass `npm run rules` | SD-006 |

**D-11, priority against open work**, set by the operator on 2026-10-24,
after stage 1 was built: first FEAT-005's release work (publish on merge,
ADR-034), since nothing new reaches users without it; then FEAT-016,
learning from builds; then FEAT-018 stage 2, the HELIX mapping, only after
the guide has been used in a real app with real people; FEAT-013's
remaining comprehension check last. Bead priorities follow that order.

## Dependencies

- **Features**: FEAT-004, FEAT-008, FEAT-009, FEAT-010, FEAT-012, FEAT-013,
  FEAT-015, FEAT-016.
- **ADRs**: ADR-036 (package, CLI first, stage 1 homes), ADR-037
  (prototypes; amends ADR-025 decision 3), ADR-038 (journey events),
  ADR-039 (evidence and test sessions); ADR-025, ADR-026, ADR-030, ADR-035.
- **Contracts**: CONTRACT-008 (the design package, its CLI, the design
  state and the `docs/ux/` types), which also amends CONTRACT-004 (journey
  events, the new package), CONTRACT-005 (tasks, alternatives, content,
  new blueprint commands), CONTRACT-006 (task metrics, heuristic pass,
  human findings) and CONTRACT-007 (decision fields).
- **Solution design**: SD-006.
- **HELIX**: H-1 to H-7, in stage 2. The guide works without them.

## Out of Scope

- The SDK sending data anywhere (D-1).
- Recruiting or paying test participants.
- A hosted analytics service or dashboard; dashboards are HELIX's and the
  app's.
- A visual blueprint editor.

## Delivery Phases

Each phase is usable on its own and ends at a point where the operator can
stop.

| Phase | Delivers | Requirements | Decided in | Exit criterion |
|---|---|---|---|---|
| 1. Guide and define | The package and CLI, new and existing apps, change mode, the guide, design state, checkpoints, challenge questions, complexity delta, experience brief | GDL-01 to GDL-16, GDL-70 to GDL-76 | ADR-036 | A fixture idea reaches checkpoint 1 through the guide alone |
| 2. Users and tasks | Hypotheses, evidence synthesis, jobs table, task model, `simplify` | GDL-17 to GDL-25 | ADR-039 | A fixture research set yields a jobs table with evidence and confidence |
| 3. Explore and architecture | Alternatives, `score`, `compare`, decision records, architecture additions, rubric (predicted) | GDL-26 to GDL-39 | ADR-036, SD-006 sources | Three fixture alternatives are compared and one is chosen at checkpoint 2 |
| 4. Experience | Exploratory and validated prototypes, traceability, `impact` | GDL-40 to GDL-49 | ADR-037 | A plain-words change propagates to every seeded artifact |
| 5. Evaluate | Heuristic pass, task metrics, test kit, observations, transcripts, rubric (observed), report | GDL-50 to GDL-61 | ADR-039 | A fixture study produces a report with both rubric columns |
| 6. Improve | Journey events, insights, experiments | GDL-62 to GDL-69 | ADR-038 | A fixture event export shows drop-off and drives one experiment to a decision |

Phase 4's exploratory prototype can move ahead of Phase 3 if the operator
wants a usable experience sooner; it needs only ADR-037 and the existing
blueprint. The HELIX asks wait for stage 2; H-1 is already drafted.
