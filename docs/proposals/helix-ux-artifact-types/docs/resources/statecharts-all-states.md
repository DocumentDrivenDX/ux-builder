---
ddx:
  id: resource.statecharts-all-states
  authoring:
    home: repo
---

# Statecharts: All States Explored

## Source

- URL: https://statecharts.dev/benefit-all-states-explored.html
- Owner: statecharts.dev, a community resource on statecharts
- Background: statecharts were introduced by David Harel (1987) as state
  machines extended with hierarchy (nested states), concurrency (parallel
  regions) and guarded transitions.
- Accessed: 2026-10-21

## Summary

Modelling a component as a statechart forces the author to name every state
and every event that can occur in it. States that ad-hoc code leaves implicit
become visible, so the team decides what happens in each one instead of
discovering it in production.

## Relevant Findings

- Enumerating states up front exposes missing cases (what happens if the user
  clicks again while loading?).
- Hierarchy and parallel regions keep the chart small when parts of a screen
  have independent states.
- Guards make conditional behavior explicit.

## Use in HELIX

Grounds `interaction-state-diagram`: a Mermaid `stateDiagram-v2` with nested
and parallel states, guarded transitions, and a matrix that gives every state
an exit and an action.
