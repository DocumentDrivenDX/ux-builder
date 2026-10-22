---
ddx:
  id: ADR-033
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: ADR-025
    - kind: informed_by
      to: ADR-026
    - kind: informed_by
      to: ADR-030
    - kind: informed_by
      to: ADR-031
    - kind: informs
      to: FEAT-015
    - kind: informs
      to: CONTRACT-004
    - kind: informs
      to: CONTRACT-006
---

# ADR-033: Every finding names its rule, and reports follow the user's journey

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-21 | **Accepted** 2026-10-21 (operator's review: "it doesn't specify the usability rules/guidelines or theme rules that were broken. Both should be broken down by user journey or screen flow"; "spell out the actual rule in the HTML report and video"; "the video audit moved too fast") | Operator | ADR-025, ADR-026, ADR-030, ADR-031, FEAT-015 | High |

## Decision

1. **Theme checks are rules.** Every audit check has a catalogue rule (`theme.*`
   for the theme and design-system checks), so every finding has an ID, a
   statement, sources and a fix.
2. **Reports are journey-first.** The audit's HTML report, the assessment's
   report and the video all use the order *journey → step → finding*. A page
   is matched to its blueprint screen by `data-piq-screen` or the screen's
   `path`. Without journeys, they group by screen.
3. **The rule is spelled out.** Each finding shows the rule's full statement
   where it is reported: in the report, beside the screenshot, and in the
   video's caption.
4. **Human pace.** The video's timing is derived from reading time (200
   words a minute, at least 5 s a finding, about 2 s a step), and can be
   scaled.
5. **HELIX artifacts.** The usability report is a HELIX artifact.
   ux-builder drafts HELIX's UX artifact types (journey map, screen flow,
   wireframe, interaction-state diagram) from its templates once HELIX
   defines them. Until then it uses its own drafts and the proposed
   templates in `docs/proposals/helix-ux-artifact-types/`.

## Alternatives Considered

| Option | Evaluation |
|---|---|
| Keep grouping by check, add a journey index | The operator reads by journey; checks are an index, not the order. Rejected |
| Rule IDs only, linking to the catalogue | The operator asked to spell the rule out. Rejected |

## Consequences

- Positive: a reader sees what broke, where in the journey, why it matters
  and how to fix it, without leaving the report.
- Negative: reports are longer. A *Rules broken* table at the top keeps them
  scannable.
