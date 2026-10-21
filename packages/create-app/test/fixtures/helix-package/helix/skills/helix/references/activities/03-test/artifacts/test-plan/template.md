---
ddx:
  id: TP-XXX
  authoring:
    home: repo
---

# Test Plan

## Strategy

**Goal**: [What must be true for the feature to be production-ready?]

**Out of scope**: [Behaviors not covered by this plan]

## Framework Selection & Cost

| Layer | Framework | Justification | CI Time Impact | Maintenance Burden |
|-------|-----------|---------------|---------------|--------------------|
| Contract | [Framework] | [Why this framework for API contract tests] | [~] | [~] |
| Unit | [Framework] | [Why this framework for unit tests] | [2min / ~neutral / +30%] | [Low/Med/High] |
| Integration | [Framework] | [Why this framework for integration] | [~] | [~] |
| E2E | [Framework] | [Why this framework for e2e] | [~] | [~] |

**Cost/benefit summary**: [Total CI time impact, maintenance vs. confidence tradeoff, decision rationale]

**Baseline**: [Only if you cite a measurement: what was measured and the commit it was taken at. Never hand-maintain counts; re-measure.]

## Critical Paths (P0)

These must pass before shipping:

1. [Path description]
2. [Path description]
3. [Path description]

## Acceptance Criteria Layer Allocation

Every P0 acceptance criterion maps to exactly one primary test layer. Per-criterion rows (`US-<n>-AC<m>` to named tests) live in each story test plan; here, allocate criterion classes.

| AC class / source | Story Test Plan | Primary Layer | Why this layer |
|-------------------|-----------------|---------------|----------------|
| [e.g. upload/validation criteria] | [[STP-XXX]] | [Integration] | [what boundary it proves] |

## Secondary Paths (P1-P2)

- **P1**: [Feature coverage]
- **P2**: [Edge cases]

## Test Data Strategy

[How do you seed test data? Static fixtures, factories, production snapshots?]

## Known Gaps

[Accepted risks, deferred coverage, infrastructure constraints]

## Build Commands

```bash
[test command]
[coverage command]
```

**Blocking gate**: [What must pass before the build is considered complete]

<!-- For source projects, name the real boundary-check command, allowed/forbidden
import controls, supported cycle/private-access checks, invariant tests and
remaining semantic review obligations. Apply the modularity-and-encapsulation
baseline; do not equate populated document fields with proven boundaries. -->

## Diagnostic Test Strategy (when applicable)

For selected `o11y-otel` practices, allocate layers and budgets for real OTel
receiver/mapping/correlation proof, duplicate ingestion, pre-sink privacy,
bounded capture/export failures and authorized retrieval. Define service/CLI
agent-pilot ground truth and diagnosis/evidence/time/call/context measurements
against a baseline. Exact tests, commands and story AC rows belong in Story
Test Plans. JSONL parsing alone does not establish an OTel integration.
