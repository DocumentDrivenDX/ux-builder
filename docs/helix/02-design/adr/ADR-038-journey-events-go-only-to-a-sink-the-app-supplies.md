---
ddx:
  id: ADR-038
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-023
    - kind: informed_by
      to: ADR-035
    - kind: informs
      to: CONTRACT-008
    - kind: informs
      to: CONTRACT-004
---

# ADR-038: Journey events go only to a sink the app supplies; the SDK still reports nothing

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-23 | **Accepted** 2026-10-23 (operator: accepted FEAT-018's proposed decision D-1). Clarifies ADR-023 rule 8 and the product vision's "nothing reported" principle; changes neither | Operator | FEAT-018, ADR-023, ADR-035, CONTRACT-004, CONTRACT-008 | Medium |

## Context

FEAT-018's sixth phase learns from the app in production: where users
abandon a journey, which searches fail, where time goes. The vision says
"Licences checked, nothing reported": nothing the SDK ships reports usage.
ADR-023 rule 8 forbids telemetry. ADR-035 kept that by making the trace a
file the owner exports by choice.

Apps already have their own analytics. What they lack is events that name
the blueprint's journeys, screens and steps, so production data can be
read against the design.

## Decision

1. **Events, not reporting.** `@ux-builder/ui` exports `JourneyProvider`
   and `useJourneyStep(journeyId, step)`. With a `sink` the app supplies,
   the SDK calls it with events: `journey-start`, `step`, `complete`,
   `abandon`, `error-shown`, `empty-result`, `no-results-search`, each with
   journey, screen and step IDs and a timestamp, and no user content.
2. **No sink, no events.** Without a `sink`, nothing is emitted or stored.
3. **The SDK sends nothing.** No ux-builder package calls `fetch`,
   `sendBeacon`, `XMLHttpRequest` or a WebSocket for these events; a test
   proves it. Where the events go is the app's choice and its code.
4. **Insights read files.** `ux-builder-design insights` reads files the
   owner exports from their analytics, support and feedback tools. It
   never fetches data.
5. **The principle, clarified.** The vision's "nothing reported" and
   ADR-023 rule 8 stand. They are read as: ux-builder never sends data
   anywhere; an app may route SDK events into its own systems.

## Alternatives Considered

| Option | Evaluation |
|---|---|
| A ux-builder analytics endpoint | Telemetry; contradicts ADR-023 rule 8. Rejected |
| No events; the app instruments journeys itself | Works, but every app invents its own names and the guide can't match data to the blueprint. Rejected as the default; still possible |
| Events written to a local file by the SDK | Browsers can't write files; a server-side writer would be a reporting channel by another name. Rejected |

## Consequences

| Type | Impact |
|---|---|
| Positive | Production data lines up with the design's journeys and steps; no data leaves through ux-builder |
| Negative | Apps must wire a sink and export the data themselves |
| Neutral | Events carry IDs only; anything personal the app adds is the app's responsibility |
