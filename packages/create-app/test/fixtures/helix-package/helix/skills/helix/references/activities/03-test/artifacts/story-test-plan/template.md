---
ddx:
  id: STP-XXX
  authoring:
    home: repo
---

# Story Test Plan: STP-XXX-[story-name]

## Story Reference

**User Story**: [[US-XXX-[story-name]]]
**Technical Design**: [[TD-XXX-[story-name]]]
**Related Solution Design**: [[SD-XXX-[feature-name]]] or N/A
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: [What this story must prove before build starts]
**Blocking Gate**: [Command or suite that must pass for this story]

**In Scope**
- [Bounded behavior this TP governs]

**Out of Scope**
- [Adjacent behavior intentionally left to another TP, feature, or future slice]

## Acceptance Criteria Test Mapping

This matrix is the **story-level** AC↔test traceability surface. Key each row on
the story's **stable AC ID** (`US-<n>-AC<m>`) so a specific criterion maps to a
specific new or existing test. This story test plan owns this matrix; the project-level
test plan aggregates strategy and allocates layers — it does **not** duplicate
these rows (FEAT-008 FR-6).

Each row must name the **behavior the test asserts** — the specific observable
outcome it checks — not merely a test name. A row that lists a test name with no
named assertion does not prove the criterion is *exercised*; reconcile-alignment
classifies such a criterion `UNTESTED` (or `ASSERTED_UNBACKED` if the named test
does not exist), not covered.

Each row must also name the **covering test AND record that the test cites the
AC ID** in the canonical, parseable syntax `@covers US-<n>-AC<m>` (the structured
tag in the test body, name, or doc comment). The citation makes AC→test
traceability machine-checkable. A test that exercises and passes but does **not**
cite the AC ID is classified `UNCITED_COVERAGE` (not covered for traceability;
the fix is to add the citation, not a new test) — distinct from `UNTESTED`. The
citation is an *additional* gate on top of exercise+pass+satisfy, never a
replacement. The canonical, parseable citation syntax is `@covers US-<n>-AC<m>`
with numeric stable IDs (e.g. `@covers US-001-AC1`); `US-XXX` below is a
placeholder for the numeric story id — replace `XXX` with the real number.

Use behavior-and-condition names per [testing practices](../../../../concerns/testing/practices.md);
existing body/name/doc-comment citations remain valid.

| AC ID | Acceptance Criterion (Given/When/Then) | New or Existing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-001-AC1 | [Given/When/Then criterion] | `[test_name]` | [the concrete outcome the test asserts — e.g. "response is 200 with body {id}"] | `@covers US-001-AC1` | Unit / Integration / Contract / E2E | `tests/...` or `bash ...` | [Fixture, seed, mock] | [Edge case or sequencing note] |

## Executable Proof

Link completion results from existing Notes/Executable Proof under the
[verification contract](../../../../concerns/verification/practices.md).
No new table, column or evidence file is mandatory; passing results are required
only for completion claims. At planning time, name commands and report locations.

### Primary Commands

```bash
[command that proves this TP]
```

### Planned Test Files

- `tests/...`
- `tests/...`

### Coverage Focus

- P0: [Must-pass behavior]
- P1: [Important secondary behavior]

## Data and Setup

| Need | Required For | Source / Strategy |
|------|--------------|-------------------|
| [Fixture / seed / mock / env var] | [Tests] | [Where it comes from] |

## Edge Cases and Failure Modes

- [Boundary value or empty-state handling]
- [Validation failure or invalid input]
- [Dependency failure, timeout, or permission edge]

## Build Handoff

**Implementation Order**
1. [First coherent implementation slice and the existing or new proof it uses]
2. [What follows once the core path passes]

**Constraints**
- [Constraint inherited from requirements, design, concern, or contract]

**Done When**
- [ ] Every in-scope acceptance criterion has passing evidence
- [ ] Named commands or test files exist and run
- [ ] Out-of-scope coverage remains explicitly deferred rather than silently skipped
- [ ] Tests detect meaningful failures and supply observed proof of required behavior

## Diagnostic Proof (when applicable)

For selected `o11y-otel` practices, map relevant story criteria to tests of the
real logger/capture path through an OTel receiver, correlation with a matching
span and outside spans, duplicate ingestion, pre-sink privacy, bounded outage
and shutdown behavior, and retrieval during concurrency/rotation. Allocate
project-level strategy in the project Test Plan; put exact tests/commands here.
For a diagnostic pilot, name fixture ground truth, agent evidence/accuracy and
time/call/context measurements plus project-owned overhead budgets. Never claim
an OTel integration works from JSONL parsing alone.

## UX Coverage

For affected interactive UI work, apply ux-interaction-patterns and
workflows/references/ux-evidence.md. This section is optional for legacy
structural validity; current affected UI handoff requires adoption. Each
covered category references the existing AC mapping, which owns test names,
assertions, @covers citations and commands. Mark absent patterns not-applicable
with concrete reasons; runtime exceptions are reviewed in verification evidence.

| Pattern | Disposition | AC IDs or Reason |
|---|---|---|
| navigation | covered / not-applicable | [stable AC IDs or exclusion reason] |
| keyboard-overlays | covered / not-applicable | [stable AC IDs or exclusion reason] |
| async-actions | covered / not-applicable | [stable AC IDs or exclusion reason] |
| forms | covered / not-applicable | [stable AC IDs or exclusion reason] |
| data-states | covered / not-applicable | [stable AC IDs or exclusion reason] |
| destructive-actions | covered / not-applicable | [stable AC IDs or exclusion reason] |

Structure checks only declared coverage integrity. Verify real test source and
observed outcomes before completion; SDK lint/audit is separate evidence.
