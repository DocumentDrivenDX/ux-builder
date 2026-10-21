---
ddx:
  id: FEAT-012
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
      to: FEAT-011
    - kind: informed_by
      to: ADR-025
    - kind: informed_by
      to: ADR-030
---

# Feature Specification: FEAT-012 — Screen flows and user journeys in the blueprint

**Feature ID**: FEAT-012
**Status**: Draft (2026-10-21, with ADR-030; awaiting review)
**Priority**: P2 (flow and journey fields and checks first; drafting and drawing after)
**Owner**: Operator
**Covered PRD Subsystem(s)**: Interaction and information architecture
**Covered PRD Requirements**: FR-53, FR-54, FR-55, FR-56 (drafted with this feature)
**Cross-Subsystem Rationale**: Extends FEAT-008's blueprint (FR-33). The assessment (FEAT-009) reads its journeys, and FEAT-011's scenarios attach to its steps.

## Overview

The blueprint (CONTRACT-005) lists an app's destinations and screens. It
does not say how screens connect or how a person moves through them to do
a job. So nothing can check a flow, the assessment restates journeys in
its own manifest, and the flow lives only in prose (story walkthroughs) or
in nobody's head. HELIX has no artifact type for screen flows (`ux-design`
is retired). Its 02-design guide puts flow rationale and wireframes in the
solution or technical design, and architecture's *Data Flow* is a single
sequence-diagram placeholder.

Today the blueprint is a tree. A destination points to one screen, and a
screen holds its modals, which can nest:

```
app (kind, supports: sizeClasses, inputs)
├─ destinations ──► screen      (e.g. "Review" → queue)
└─ screens
   ├─ queue    pattern, primaryAction, destructiveActions, states
   │   └─ modals ─ reject-reason (dialog) ─ nested modals…
   └─ settings pattern
```

Those are its only links. Nothing records that an action on one screen
leads to another, so the checks can reason about a screen and its modals
but not about how a user moves through the app. With `actions[].to`, the
blueprint becomes a directed graph, with screens and modals as nodes and
actions as edges. Journeys are named paths through it, each tied to a
HELIX story:

```
queue ──open──► entry ──approve──► queue (empty)
  │               └──reject──► modal:reject-reason ──back──► entry
  └──help──► external
```

It stays a plain JSON file: diffable, reviewable, and readable by agents
over MCP.

This feature adds three things to the blueprint:
- **actions**, where each leads;
- **journeys**: a story's path through those actions, with alternates;
- **checks**, for screens no one can reach, dead ends, journeys that cannot
  be walked, and risky steps without a safeguard.

Later, the SDK uses the same data to draft HELIX content as proposals and
to draw IA maps, flows and wireframes from the real patterns.

## Ideal Future State

A developer, or their agent, plans the review queue: queue → entry → reject
modal → back to the queue. They tie journey J-review to US-012's criteria.
The check reports that Settings is unreachable at compact and that the
reject step has no safeguard.

The assessment walks J-review from the blueprint with no second copy. One
command proposes:
- US-012's walkthrough;
- a Mermaid flow for the solution design;
- the design system's navigation table;
- wireframes of each screen at compact and expanded.

A person accepts some proposals and rejects others.

## Problem Statement

- **Current situation**: The blueprint has no transitions. Journeys exist
  only in FEAT-009's manifest and in story prose. There is no flow diagram
  or wireframe, and HELIX offers no template for one.
- **Pain points**:
  1. Unreachable screens and dead ends are found in testing, or by users.
  2. The same journey is written three times (story, manifest, test) and
     drifts.
  3. Flow documentation is skipped because there is nowhere to put it.
- **Desired outcome**: One flow and journey model, checked before code, that
  feeds the assessment and drafts the HELIX documents a person still
  approves.

## Functional Areas

| Area | User question or job | Feature responsibility |
|------|----------------------|------------------------|
| Flow | "How do screens connect?" | Actions with targets; flow checks |
| Journeys | "What path does a user take for this story?" | Journeys tied to stories and criteria; journey checks |
| Assessment | "Do I describe journeys twice?" | The manifest references blueprint journeys |
| Drafting | "Can the flow write my HELIX docs?" | Proposals for walkthroughs, flow diagrams, navigation, test scenarios |
| Drawing | "Can I see it?" | IA map, flow diagrams, wireframes from real patterns |

### Terms

- **Action**: something a user does on a screen that moves them somewhere:
  another screen, a modal, back, another state of the same screen, or out
  of the app.
- **Flow**: the graph of screens (and modals) joined by actions.
- **Journey**: an ordered path through the flow for one story, with the
  story's acceptance criteria it exercises, and alternates (error, cancel,
  empty).
- **Proposal**: a drafted change to a HELIX document, written as a patch
  beside it, applied only by a person (the FEAT-009 proposals pattern).

## Requirements

### Functional Requirements by Area

#### Flow

FLW-01. A screen may declare `actions[]`, each `{ id, label, to }`, with
optional `primary`, `destructive` (its safeguard: `undo`, `confirm` or
`none`) and `highImpact` (its approval, FEAT-011). `to` is a screen `id`, `modal:<id>`, `back`,
`state:<state>` or `external` (CONTRACT-005 *Flows and journeys*).

FLW-02. The blueprint check reports, as warnings:
- a screen that no destination and no action reaches (`flow.reachable`),
  per supported size class when navigation differs;
- a screen or modal with no way onward or back (`flow.no-dead-end`);
- an action whose `to` names nothing (`flow.target-exists`, an error, as
  `blueprint.valid`);
- a primary action that is not among the screen's actions, when both are
  given (`flow.primary-consistent`).

FLW-03. `primaryAction` and `destructiveActions` keep working. A screen with
`actions` treats them as views of the same list.

#### Journeys

JRN-01. A blueprint may declare `journeys[]`, each with:
- `id` (`J-` + kebab-case), `story` (a HELIX `US-<n>`) and `criteria`;
- `entry` (a screen);
- `steps[]`, each `{ screen, action?, state?, expect? }`;
- `alternates[]`, each `{ from, steps }` with an optional `reason`;
- optionally FEAT-011's `scenario` (`normal`, `errorProne`, `risky`) on a
  step or an alternate.

JRN-02. The blueprint check reports, as warnings:
- a step whose action is not on its screen, or whose next step is not where
  the action leads (`journey.walkable`);
- a destructive or high-impact step with no safeguard or approval
  (`journey.safeguarded`);
- a journey with no alternate for an error state its screens declare
  (`journey.covers-errors`).

JRN-03. With a HELIX marker, the check also reads the flow's stories:
- it reports a story an app screen serves that no journey covers
  (`journey.story-covered`);
- it reports a criterion ID a journey names that the story lacks;
- it reads, and never writes, HELIX documents.

#### Assessment

ASM-01. A FEAT-009 manifest journey may reference a blueprint journey
(`blueprint: "J-…"`) instead of restating its story, criteria and entry
(CONTRACT-006 amendment). The two definitions may not both be given.

#### Drafting

DRF-01. `ux-builder-blueprint propose` drafts HELIX content from the
blueprint, as patches in a proposals folder, never applied:
- a story's *Walkthrough* from its journey;
- a Mermaid flowchart of the flow for the solution design;
- a sequence diagram of the primary journey for architecture's *Data Flow*;
- the design system's navigation table (destinations by size class);
- story test plan scenarios from steps and alternates.

DRF-02. Drafts use the installed HELIX's templates (FEAT-010 style heading
merge) and leave a person's text alone. Where the HELIX document already
says something different, the proposal is a reported disagreement, not a
rewrite (ADR-030 decision 1).

#### Drawing

DRW-01. `ux-builder-blueprint draw` writes:
- an IA map (destinations and screens by size class);
- a flow diagram (Mermaid, and SVG rendered from it);
- one journey diagram per journey.

DRW-02. `ux-builder-blueprint wireframes` renders each screen's pattern
with placeholder content in a neutral theme, at each supported size class,
to static HTML and PNG. The SDK's real components draw it, so a wireframe
is what the app will get.

### Non-Functional Requirements

- **Compatibility**: a blueprint without `actions` or `journeys` gives the
  same findings as before.
- **Performance**: the flow and journey checks keep FEAT-008's bound (50
  screens in under 1 s).
- **Determinism**: drafts and drawings are identical for the same blueprint
  and HELIX documents.

## User Stories

- [US-086 — Plan the screen flow in the blueprint](../user-stories/US-086-plan-the-screen-flow-in-the-blueprint.md)
- [US-087 — Describe a story's journey in the blueprint](../user-stories/US-087-describe-a-storys-journey-in-the-blueprint.md)
- [US-088 — The assessment walks the blueprint's journeys](../user-stories/US-088-the-assessment-walks-the-blueprints-journeys.md)
- [US-089 — Draft HELIX content from the blueprint as proposals](../user-stories/US-089-draft-helix-content-from-the-blueprint.md)
- [US-090 — See the IA map, flows and wireframes](../user-stories/US-090-see-the-ia-map-flows-and-wireframes.md)

Build tracked as DDx beads: epic `ux-builder-b7859050`, steps 1–5 (schema; checks; manifest
reference; proposals; drawings).

## Edge Cases and Error Handling

- **A view blueprint (`kind: view`)**: flows within the view and its modals
  only; `external` for anything the host does.
- **A journey that leaves the app** (`to: external`): it ends there, or
  resumes with `entry` on return.
- **A HELIX document and the blueprint disagree**: the check reports it,
  and `propose` writes no change to that section (ADR-030).
- **No HELIX marker**: the journey checks that need stories are skipped and
  say so.

## Success Metrics

- On the fixture app, every seeded flow and journey defect is reported, and
  none is reported on its clean twin.
- A journey defined in the blueprint is walked by the assessment with no
  second copy in the manifest.

## Constraints and Assumptions

- HELIX v0.18.0 has no flow or wireframe artifact type. Drafts go into the
  solution design, the architecture's *Data Flow*, `DESIGN.md`, story
  walkthroughs and story test plans, as its 02-design guide advises.
- Authority runs one way: HELIX stories and designs govern, and the
  blueprint projects them.

## Dependencies

- **Features**: FEAT-008 (blueprint and checks), FEAT-009 (manifest,
  proposals pattern), FEAT-010 (template drafting), FEAT-011 (scenarios,
  high-impact approvals).
- **ADRs**: ADR-030, ADR-025, ADR-026.
- **Contracts**: CONTRACT-005 (*Flows and journeys*), CONTRACT-006
  (`journeys[].blueprint`), CONTRACT-004 (commands).

## Out of Scope

- Generating screen code from the blueprint (ADR-025 decision 3 stands).
- A visual flow editor.
- Writing HELIX documents without a person accepting the proposal.
