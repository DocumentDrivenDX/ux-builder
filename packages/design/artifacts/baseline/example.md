---
ux:
  id: baseline
  type: baseline
  links:
    - kind: informed_by
      to: prd
---

# Baseline: River Path

## Screens

| Screen | Pattern | Path |
|---|---|---|
| map | CollectionList | / |
| detail | RecordDetail | /river |

## Journeys

| Journey | Story | Steps |
|---|---|---|
| J-find | US-001 | map → detail |

## Stories

- US-001: Find a river near me

## Open findings

- F-03: flow.no-dead-end, severity 2, J-find

## Draft brief

- A-1: People open the app to find a river near them. (current state, assumed)

## Draft jobs

- A-2: J-1 Find relevant rivers. (current state, assumed)

## Draft tasks

- A-3: T-1 Find a river within an hour's drive. (current state, assumed)
