---
ddx:
  id: ADR-040
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-036
    - kind: informs
      to: CONTRACT-008
    - kind: informs
      to: SD-006
---

# ADR-040: Review effort goes to the foundations, and approvals are of meaning

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-27 | **Accepted** 2026-10-27 (operator: asked for the human-time review's changes, keeping deliberate review of the foundations) | Operator | FEAT-018 GDL-79, GDL-83, CONTRACT-008, SD-006 | Medium |

## Context

GDL-79 had the person approve every item the guide produces, one at a
time, each approval tied to a hash of the item's whole file. In the first
real session 52 of 100 human turns were approvals, most of items derived
from facts already approved, and a metadata edit to seven stories reopened
all seven. The operator wants the foundational artifacts reviewed
deliberately early, without reviewing the same or similar content again,
and without weakening what the prototype and app are built from.

## Decision

1. **Three tiers.** Foundations (the brief, target users, jobs, stories,
   business rules, decisions) are reviewed a table per kind, every row in
   full. What is built from them (tasks, journeys, alternatives, screens,
   kits) is reviewed as one coverage map; its exceptions (a gap, something
   untraced, an undefined rule, a new assumption) are each fixed or
   accepted by the person, and approving the map approves the built items.
   Records (evidence, reports, insights, experiments) need no approval;
   their findings reach the person as the decisions at the checkpoints.
2. **Approvals are of meaning.** An approval records the item's meaning
   (content without frontmatter, formatting made one form), its hash, the
   whole content's hash, and the meaning itself. Metadata and formatting
   changes keep it; a change of meaning reopens it and shows the diff.
   Judging whether a reworded sentence keeps its meaning is left to the
   person, who sees the diff.
3. **Checkpoints keep their gates.** Every core checkpoint still waits on
   the foundations and the map of the steps it closes.

## Alternatives Considered

| Option | Evaluation |
|---|---|
| Keep one-at-a-time approval of every item | Most of the person's turns go to content they already approved. Rejected |
| Bundle everything, foundations included, at each checkpoint | Saves the most turns, but the foundations are where a mistake costs most. Rejected for the foundations; adopted for derived items |
| Carry approvals through "wording clarifications" automatically | Needs the agent to judge meaning; the diff costs the person seconds. Rejected |

## Consequences

| Type | Impact |
|---|---|
| Positive | About 52 approvals become about 10 decisions; no reapproval for metadata or formatting; changes are reviewed as diffs |
| Negative | A derived item is seen in full only on request; the map's exceptions must be complete for this to be safe |
| Neutral | Approvals recorded before this decision hold while the whole content is unchanged |
