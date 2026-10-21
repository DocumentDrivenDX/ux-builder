---
ddx:
  id: ADR-030
  type: adr
  status: proposed
  links:
    - kind: informed_by
      to: ADR-025
    - kind: informed_by
      to: ADR-026
    - kind: informed_by
      to: ADR-027
    - kind: informs
      to: FEAT-012
    - kind: informs
      to: CONTRACT-005
    - kind: informs
      to: CONTRACT-006
---

# ADR-030: The blueprint holds screen flows and journeys, and projects HELIX rather than replacing it

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-21 | **Proposed** (operator 2026-10-21: "can the blueprint be extended to include screen flow and user journey data so that can be used, in the future, to generate helix artifacts?") | Operator | ADR-025, ADR-026, ADR-027, FEAT-012, CONTRACT-005, CONTRACT-006 | Medium |

## Context

The blueprint (ADR-025 decision 3) plans screens but not their
connections. Journeys are written three times: in a story's walkthrough, in
the assessment manifest (CONTRACT-006) and in tests. HELIX v0.18.0 has no
flow or wireframe artifact type. `ux-design` is retired, and its 02-design
guide puts flow rationale and wireframes in the solution or technical
design, with a single sequence-diagram placeholder in architecture's *Data
Flow*. The operator wants the blueprint to carry flows and journeys so that
HELIX artifacts can be generated from it later.

## Decision

1. **HELIX governs; the blueprint projects it.** Stories and designs are
   the authority. The blueprint is the structured plan an agent or
   developer derives from them. Anything generated from the blueprint into
   HELIX is a proposal a person applies (the FEAT-009 proposals pattern,
   ADR-026), never a silent write. Where the two disagree, the check and
   `propose` report it, and nothing is overwritten.
2. **Flows are actions with targets.** `screens[].actions[]` (`to`: a
   screen, `modal:<id>`, `back`, `state:<state>`, `external`) makes the
   screen list a graph. `primaryAction` and `destructiveActions` remain,
   as views of that list.
3. **Journeys live in the blueprint, once.** `journeys[]` ties a story and
   its criteria to steps and alternates. The assessment manifest references
   a blueprint journey by ID (`journeys[].blueprint`) instead of restating
   it. Tests keep citing criteria with `@covers`.
4. **Checks before code, as warnings.** The checks are `flow.*` and
   `journey.*` (reachability, dead ends, targets, walkability,
   safeguards, error coverage, story coverage). Like ADR-025's, they are
   warnings, except that a target that does not exist is an error, as
   schema errors are.
5. **Drafts go where HELIX already has a place.** They are drafted from the
   installed HELIX's templates by heading merge (ADR-027):
   - story walkthroughs;
   - a Mermaid flowchart for the solution design;
   - the primary journey's sequence diagram for architecture's *Data Flow*;
   - `DESIGN.md`'s navigation table;
   - story test plan scenarios.

   No new HELIX artifact type is invented.
6. **Drawings use the real SDK.** IA maps and flow diagrams are Mermaid
   (and SVG). Wireframes render each screen's catalogue pattern with
   placeholder content at each supported size class, so a reviewed
   wireframe is the built layout.
7. **Optional and additive.** Every new field is optional. A blueprint
   without them behaves exactly as before, and unknown fields stay errors.

## Alternatives Considered

| Option | Pros | Cons | Evaluation |
|---|---|---|---|
| The blueprint is the source and HELIX is generated from it | One source of truth, no drift | Inverts HELIX's authority; loses rationale and decisions that are not structure | Rejected |
| A new HELIX artifact type for flows (local catalogue) | A home for diagrams | HELIX retired `ux-design` and points to existing types; a local type would diverge from the catalogue | Rejected |
| Journeys only in the manifest (today) | No contract change | Not checkable before code; restated in stories and tests | Rejected |
| A visual flow editor | Friendly | Large; out of scope; the blueprint stays text for agents | Deferred |

## Consequences

| Type | Impact |
|------|--------|
| Positive | Flow defects found before code; journeys defined once; HELIX gets flow documentation drafted where it already expects it |
| Negative | A larger blueprint schema; drafts to keep in step with HELIX template changes |
| Neutral | CONTRACT-005 and CONTRACT-006 gain optional fields |

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| The blueprint drifts from the stories | Medium | Medium | `journey.story-covered` and criterion checks; disagreement reports in `propose` |
| Generated proposals applied without review | Low | Medium | Patches only; nothing is applied; the HELIX review gate |
| HELIX templates change their headings | Medium | Low | Heading merge (ADR-027); a missing section goes to the end and is reported |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| FEAT-012's success metrics | A HELIX release that adds a flow or wireframe artifact type |

## Concern Impact

No slot changes. `ux-interaction-patterns` gains the flow and journey
checks.

## References

- HELIX v0.18.0 `activities/02-design/README.md` (`ux-design` retired);
  `architecture/template.md` *Data Flow*.
