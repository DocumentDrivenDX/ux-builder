---
ux:
  id: INS-2026-10-23
  type: insights
---

# INS-2026-10-23: First week in production

## Sources

- events-2026-10-16..22.jsonl, exported from the app's analytics

## Journeys

| Journey | Started | Completed | Completion | Most abandoned step |
|---|---|---|---|---|
| J-find | 1,200 | 720 | 60% | filters:apply |

## Unmatched events

- None.

## Diagnosis

- 40% abandon after filtering. Either the filters are hard to use, or results do not meet expectations; a simpler filter tested against the current one would tell them apart.
