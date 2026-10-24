---
"@ux-builder/ui": minor
---

Journey events (FEAT-018, ADR-038): `JourneyProvider` hands the app's own `sink` the moments a journey passes through — `journey-start`, `step`, `complete`, `abandon`, `error-shown`, `empty-result` and `no-results-search`, each with journey, screen and step IDs and a timestamp, never user content. `useJourneyStep(journeyId, step)` marks a step; `StatePanel` reports its error, empty and no-results states. No sink, no events; the SDK sends nothing anywhere.
