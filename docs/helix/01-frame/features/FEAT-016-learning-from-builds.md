---
ddx:
  id: FEAT-016
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: FEAT-010
    - kind: informed_by
      to: FEAT-014
    - kind: informed_by
      to: ADR-035
---

# Feature Specification: FEAT-016 — Learning from builds

**Feature ID**: FEAT-016
**Status**: Draft (2026-10-22, with ADR-035)
**Priority**: P1
**Owner**: Operator
**Covered PRD Subsystem(s)**: Learning from builds
**Covered PRD Requirements**: FR-67, FR-68, FR-69, FR-70, FR-71, FR-72 (drafted with this feature)
**Cross-Subsystem Rationale**: The starter (FEAT-010, FEAT-014) opens the first episode. The MCP server, the lint plugin and the audit (CONTRACT-004) write to it. The assessment (FEAT-009) supplies its outcome. ux-builder's own planning (beads, HELIX) receives what is learned.

## Overview

The operator's goal is the full train of thought, from the app back to
ux-builder, whenever an app is created or its UI or UX is changed, "so we
can learn from it and optimize".

ux-builder already records:
- the intent: HELIX stories and the blueprint;
- the outcome: the audit's report, the assessment's run package, and
  `assess compare`.

This feature records the middle, in the app, as an **episode trace**:
- what ux-builder told the agent;
- every check, and how many tries it took;
- what the agent decided and why;
- the agent's full transcript;
- the change and its outcome.

An owner exports episodes by choice. ux-builder learns from the exports of
every app, its own, Synaptiq's and clients', to improve its guidance, rules,
components, checks and starter.

## Problem Statement

- **Current situation** (before `@ux-builder/trace` 0.1.0, `@ux-builder/mcp` 0.6.0 and `@ux-builder/create-app` 0.7.0, which shipped this feature):
  - The MCP server logs nothing.
  - `create-app` keeps no record.
  - Checks keep only their last result.
  - The agent's reasoning sits in its own transcript, unlinked to the app.
  - Nothing collects across apps.
- **Pain points**: Where ux-builder's guidance fails, we see only the end
  state, never the failed attempts, the rule the agent misread, or the
  component it had to work around.
- **Desired outcome**:
  - Every build can be reviewed from goal to outcome.
  - ux-builder's shortfalls show up as measurable signals across apps.
  - Each signal turns into a bead or a proposal.

## Requirements

### Episodes

TRC-01. Every app creation and every UI or UX change is an episode
(CONTRACT-007):
- `create-app` opens the first one;
- `ux-builder-trace start` and MCP `start_episode` open the others.

Each episode names its goal (stories, screens, journeys), its trigger, and
the agent and model. Commits made in an episode carry `UX-Episode: <id>`.

TRC-02. A tool event with no open episode goes to a per-branch unscoped
episode, and the trace marks it unscoped. A trace never breaks a build: if
writing fails, the tool warns and carries on.

### The trace

TRC-03. ux-builder's tools append their own events:
- `create-app` writes `created`;
- the MCP server writes `guidance` on every call, with its inputs, the rule
  IDs, components and recipes it returned, and the guidance version;
- lint, `check:blueprint`, `checkCard` and the audit write `check` on every
  run, failures included, with an attempt count and the rule IDs found;
- `trace end` writes `change` and `outcome`: commits, audit verdicts, the
  assessment's `compare`, and the attempts each check took to pass.

TRC-04. The trace is committed with the app. Events hold IDs, counts and
short text, never source code.

### Decisions and transcripts

TRC-05. The agent records its decisions with MCP `record_decision`: what it
chose, what it considered, why, and the rules and stories it relied on. It
also marks departures from guidance and workarounds for missing
components. The app's `AGENTS.md` and the skill ask for a decision at every
pattern choice, departure and workaround.

TRC-06. The agent's full transcript is attached to its episode:
- for Claude Code, by a session-end hook that `create-app` installs;
- for other agents, with `ux-builder-trace attach-transcript --file`.

Secrets are masked before anything is written. An owner can turn
transcripts off (`.ux-builder/config.json`).

### Sharing and learning

TRC-07. `ux-builder-trace export` writes a bundle of chosen episodes and
their transcripts:
- it masks again and fails on any secret pattern left;
- it is checked against its schema;
- it lists every file before writing.

It makes no network request. Where the bundle goes is the owner's choice
(ADR-023 rule 8).

TRC-08. Bundles from any app are kept in a private learning store, never in
this repository.

TRC-09. `ux-builder-learn` reads the store and writes a learning report.
Each signal comes with its evidence (episodes, rule IDs, counts) and a
suggested change. The signals:

| Signal | What it suggests changing |
|---|---|
| A rule fetched in `guidance` and then broken in the same episode's first `check` | The rule's statement or guidance |
| Attempts to a passing lint, blueprint check and audit, per modality and pattern | Recipes and starter shells |
| Decisions marked `workaround`, or UI built by hand where a catalogue component exists | Components |
| Assessment findings the deterministic audit did not report | Checks to automate |
| Findings resolved in one episode and regressed in a later one | Guidance that doesn't stick |
| The same guidance asked for repeatedly in one episode | Gaps in `AGENTS.md` or the skill |

TRC-10. `ux-builder-learn --beads` turns signals over a threshold into
ux-builder beads, with paraphrased lessons and counts. No client content
enters this repository.

TRC-11. `ux-builder-learn --evals` turns episodes into evaluation tasks: the
goal, the starting commit and the outcome to beat. They can be replayed
against a new SDK version and graded. That supplies the graded agent runs
that US-014-AC4 and US-031-AC5 wait on. *[Amended 2026-10-23 — AR-2026-10-22
D-5]* A maintainer replays a task by the manual procedure in
`docs/learning/replay-an-evaluation-task.md`; a runner that does it with an
agent is planned (bead `ux-builder-9f2522e0`).

## User Stories

- [US-105 — Every build is an episode](../user-stories/US-105-every-build-is-an-episode.md)
- [US-106 — The trace records what ux-builder said and every check](../user-stories/US-106-the-trace-records-guidance-and-checks.md)
- [US-107 — The agent records its decisions](../user-stories/US-107-the-agent-records-its-decisions.md)
- [US-108 — The full transcript stays with its episode](../user-stories/US-108-the-full-transcript-stays-with-its-episode.md)
- [US-109 — Export episodes to share them](../user-stories/US-109-export-episodes-to-share-them.md)
- [US-110 — Learn from episodes across apps](../user-stories/US-110-learn-from-episodes-across-apps.md)
- [US-111 — Replay episodes as evaluation tasks](../user-stories/US-111-replay-episodes-as-evaluation-tasks.md)

## Edge Cases

- **Two agents in one episode**: each attaches its transcript, and events
  carry `by`.
- **An episode never ended**: `trace status` lists it, and the next `start`
  refuses until it is ended or abandoned.
- **A client asks for its bundles to be removed**: the learning store
  deletes them. Aggregated beads carry no client content, so they stay.

## Success Metrics

- 100% of the starter's episodes in the e2e fixtures have `start`,
  `created`, at least one `guidance` and `check`, `change`, `outcome` and
  `end`, and their commits carry the trailer.
- No fixture bundle contains source code or an unmasked secret pattern.
- The learning report finds every signal seeded into the fixture store.

## Out of Scope

- Sending anything automatically (ADR-023 rule 8).
- Hooks for agents other than Claude Code (their transcripts are imported).
- The learning store's hosting.
