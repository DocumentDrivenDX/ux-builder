---
ux:
  id: EXP-1
  type: experiment
  status: running
  links:
    - kind: tests
      to: ADR-008
---

# EXP-1: A simpler filter

## Hypothesis

If filtering takes one choice instead of four, more people complete J-find, because most abandon at filters:apply (tests ADR-009).

## Variant

simple-filter, behind the app's flag `simple_filter`

## Metrics

- **Success**: J-find completion
- **Guardrails**: time to first river; errors shown

## Duration

14 days

## Result

Running.

## Decision

Not yet.
