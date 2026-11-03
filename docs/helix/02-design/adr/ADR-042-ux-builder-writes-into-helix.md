---
ddx:
  id: ADR-042
  authoring:
    home: repo
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: ADR-030
    - kind: informed_by
      to: ADR-036
    - kind: informed_by
      to: ADR-039
    - kind: informed_by
      to: FEAT-018
    - kind: informs
      to: CONTRACT-008
    - kind: informs
      to: SD-006
---

# ADR-042: ux-builder writes into HELIX's documents and keeps none of its own

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-29 | **Accepted** 2026-10-29 (operator: "Accept and commit"; plan "UX Builder on HELIX", 2026-10-27, `docs/proposals/ux-builder-on-helix.md`; its open questions answered by the operator 2026-10-28; HELIX's side merged as DocumentDrivenDX/helix#103 and #104, released in v0.20.0) | Operator, Erik (HELIX) | ADR-030, ADR-036, ADR-039, FEAT-018, CONTRACT-008, SD-006 | High |

## Problem

ADR-036 put guided design's new document types in ux-builder for a first
stage: a brief, users, jobs, UX decisions, evidence, test kits, evaluation
reports, insights, experiments and a baseline, in `docs/ux-builder/`, each
linking the HELIX documents it relates to. The stage worked, and it showed
the cost. A HELIX user met a second document set beside HELIX's, with its
own approvals, checks and 17 kinds of ID (U-, J-, T-, A-, PR-, UXD-, EV-,
TK-, F-, UER-, INS-, D-, EXP-, FB-, O- and more). Much of it repeated what
HELIX already holds: decisions, principles, research plans, an improvement
backlog, concerns, and modes for framing, validating and evolving.

FEAT-018 asked HELIX for seven things (H-1 to H-7). Erik agreed to a
shorter list, and it has shipped: the user-flow, wireframe and
user-journey-map types, and optional sections on the PRD, principles,
feature specification, solution design, ADR, DESIGN.md, research plan,
story test plan and metrics dashboard (HELIX v0.20.0).

## Decision

We will make ux-builder a design tool that writes into HELIX's documents and
uses HELIX's process, and stop it keeping a document set of its own.

1. **Each fact has one home.** HELIX (`docs/helix/`) holds what the product
   is for and for whom, the decisions, the studies and what they found, and
   the user flows and wireframes. The blueprint (`docs/ux-builder/blueprint/`)
   holds how the interface is built, in a form tools read. ux-builder's tools
   generate wireframes, prototypes and audits. DDx holds work items and
   experiments. Nothing lives in two homes. This takes ADR-030's "HELIX
   governs; the blueprint is derived" to its end.
2. **ux-builder stops writing its own documents.** Each moves to its HELIX
   home:

   | ux-builder today | Its home |
   |---|---|
   | users.md, jobs.md | The PRD's User Segments and User Needs tables |
   | Tasks in the blueprint | The feature specification's Task Model; journeys say which task they carry out |
   | UX decisions | ADRs labelled `area:ui`, with Assumptions and Validation |
   | Experience principles | principles.md, Experience Principles |
   | Evidence, test kits, evaluation reports | One research plan per study, `docs/helix/01-frame/research/<study>.md`: scenarios, success criteria and screener under Methods; claims under Findings. Fixes go to the improvement backlog |
   | Insights | The metrics dashboard's Journey Funnels |
   | Experiments | A DDx bead; the result goes in the ADR's Validation |
   | Screen flows and wireframes | user-flow `UF-<n>` and wireframe `UF-<n>-<nn>-<view>`, in `docs/helix/02-design/flows/UF-<n>-<feature>/` |
   | The coverage map | The solution design's Experience Traceability |
   | Modality, size classes, app frame | DESIGN.md's Modalities, Size Classes and App Frame |
   | baseline.md | HELIX's backfill, with the blueprint drawn from the app's screens |

   ux-builder still writes these only as proposals the person applies
   (ADR-030 decision 5).
3. **The brief stays, compiled.** `docs/ux-builder/brief.md` is built from the
   PRD, principles.md and the stories, and rebuilt when they change. It holds
   no fact of its own and is not a HELIX type.
4. **HELIX's process, not a second one.** The guide keeps its steps and
   checkpoints, but uses HELIX's frame and grill for intent, evolve for a
   changed requirement, validate and align for drift, and backfill for an
   existing app. create-app selects HELIX's `packaged-design-system`,
   `ux-interaction-patterns` and `a11y-wcag-aa` concerns. `ux-builder-design
   validate` checks only the blueprint and its links into HELIX.
5. **A person sees HELIX's IDs and plain names.** FEAT-, US-, US-n-ACm, ADR-,
   BR-, UF- and UJM- stay; screens and journeys go by their blueprint names
   (`capture`, not `J-capture`); participants by pseudonym (ADR-039). Users,
   needs, tasks, assumptions and questions are named by what they say. A
   journey links to its task by the task's name and by the Task Model's `Key`
   column, which tools read and people need not.
6. **Run output stays out of the repository.** Assess and audit runs,
   evaluation results, insight exports, blueprint checks and test-session
   material go to a gitignored run folder, listed by path on `reports.html`
   (Erik: reports and "all the various test / audit runs" should be out).
   When a HELIX document cites a run, as the story test plan's UX Coverage
   Evidence column does, it records the run's date, command and where the
   report is kept. The project keeps a cited report in a durable place it
   already has, such as retained CI artifacts, as HELIX's verification
   practices require.
7. **What stays ux-builder's own.** The guided conversation, the blueprint
   and its alternatives, generated wireframes and prototypes, the audit and
   assessment, and the session's approval and time bookkeeping in
   `.ux-builder/`.
8. **FEAT-018's asks are settled.** H-1 became the three types; H-2, H-3 and
   H-6 became the PRD, ADR and Task Model sections. H-4 (checkpoints as HELIX
   stop triggers), H-5 (a UX lane in the HELIX skill) and H-7 (experiments
   linked from HELIX) are withdrawn: HELIX need not know ux-builder exists.
9. **Existing apps move over.** `ux-builder-design migrate` moves an app's
   `docs/ux-builder/` documents into HELIX as proposals, then removes the
   originals. The old document types and their commands go after that.

This replaces ADR-036 decisions 4 and 5 and ADR-039 decision 5. ADR-039's
rules on excerpts, masking, consent, transcripts and labelled origin stand,
and now apply to a research plan's Findings.

## Why We Chose This

### Over keeping ux-builder's documents and asking HELIX for matching types
FEAT-018's first H-1 asked for five types, and the stage also kept evidence,
test kits, evaluation reports and experiments. Two document sets and their IDs
would remain, and HELIX would carry types only a UI project uses. One set
matters more than ux-builder owning its formats.

### Over a UX lane in the HELIX skill (H-5)
HELIX would have to know ux-builder exists and hand work to it. Writing into
HELIX's own documents needs no handoff, and keeps HELIX independent of us.

### Over keeping both sets and synchronizing them
Every fact would sit in two places, behind a sync that has to be maintained
and trusted. A drifted copy is worse than no copy.

### Over dropping the brief
The agent could summarize the PRD on request, but a person loses a single
page to read and share. Compiling it keeps the page without a second source.

### Over committing run output in DDx execution records
A committed run is citable by path, but the repository fills with run material
Erik wants kept out. A cited run records where its report is kept instead.

## Consequences

**Good**: One document set. HELIX's validators, concerns, reviews and modes
apply to UX work. A HELIX user gets a design without learning a second set of
documents or IDs.

**Trade-offs**: A large, breaking change to `@ux-builder/design`. Existing apps
need `migrate`. ux-builder depends on HELIX v0.20.0's types and sections. The
blueprint, its checks and the generated wireframes and prototypes are
unchanged.

**Drift signals to watch**: a new file type under `docs/ux-builder/` other
than the blueprint, generated output or the brief; a fact written in the brief
and not in HELIX; a new ID prefix shown to a person; run output committed to
the repository; ux-builder validating a HELIX document's content itself.

## Assumptions

- HELIX keeps the v0.20.0 types and sections stable enough for `propose` to
  fill them by heading: a HELIX release that renames or drops one of them.
- A team can keep a cited run's report somewhere durable without ux-builder
  choosing the place: a reviewer who can't open a cited report.
- People read the brief, so compiling it earns its place: sessions where
  nobody opens it.

## Validation

**Result**: not tested
**Evidence**: FEAT-018's guided session with real people (ux-builder-1ec226e9)
and its time metrics against the GDL-83 targets (ux-builder-fc0a77a7). It
holds if a person completes the guide reading only HELIX's documents, the
brief and the blueprint, and is never shown an ID outside decision 5.

## Concern Impact

- **No concern impact** on this project: no override or deviation. Apps
  created by create-app select `packaged-design-system`,
  `ux-interaction-patterns` and `a11y-wcag-aa` (decision 4).

## References

- `docs/proposals/ux-builder-on-helix.md`, the plan and its answered questions.
- HELIX v0.20.0: DocumentDrivenDX/helix#103 (user-flow, wireframe,
  user-journey-map) and #104 (the optional sections).
