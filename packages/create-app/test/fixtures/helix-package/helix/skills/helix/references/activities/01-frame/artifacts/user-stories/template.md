---
ddx:
  id: US-XXX
  authoring:
    home: repo
---

# US-XXX: [Story Title]

**Feature**: [FEAT-XXX — Feature Name]
**Feature Requirements**: [REQ-01, REQ-02]
**PRD Requirements**: [FR-n — the PRD functional requirement(s) this story covers]
**Priority**: [P0 | P1 | P2]

## Story

**As a** [specific user type from PRD personas]
**I want** [specific functionality — what the user does, not what the system does]
**So that** [measurable business value or user outcome]

## Context

[Why this story matters. What's the user's situation before this works? What
problem are they hitting? Which parent feature requirements does this story
exercise? This should be 2-4 sentences that give an implementer enough
background to make judgment calls without asking.]

## Walkthrough

[Step-by-step description of the user's journey through this slice. Write in
present tense. Name concrete actions and system responses. This is the
vertical slice — it should cover one complete path from trigger to outcome.]

1. User [action]
2. System [response]
3. User [action]
4. System [response — the outcome]

## Acceptance Criteria

[See the prompt's Acceptance Criteria guidance for the canonical AC-ID rule.]
Acceptance criteria describe observable outcomes. If exact API, CLI, event,
schema, config, telemetry, or adapter behavior matters, reference the Contract
ID instead of defining endpoints, commands, flags, payloads, fields, status
codes, or signatures inline.

- [ ] **US-XXX-AC1** — Given [specific precondition], when [specific action], then [observable outcome]
- [ ] **US-XXX-AC2** — Given [specific precondition], when [specific action], then [observable outcome]

## Edge Cases

[What happens when things go wrong or inputs are unexpected? Each edge case
should name the condition and the expected system behavior.]

- **[Condition]**: [Expected behavior]
- **[Condition]**: [Expected behavior]

## Test Scenarios

[Concrete input/output pairs for the acceptance criteria. An implementer
should be able to copy these into a test file.]

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Happy path | US-XXX-AC1 | [specific state] | [specific action] | [specific result] |
| [Edge case] | US-XXX-AC2 | [specific state] | [specific action] | [specific result] |

## Dependencies

- **Stories**: [US-XXX if this story depends on another being done first]
- **Feature Spec**: [FEAT-XXX]
- **Feature Requirements**: [REQ-01, REQ-02]
- **PRD Requirements**: [FR-n — PRD functional requirement(s) this story covers]
- **External**: [APIs, services, data, or Contract IDs this story requires; exact surface lives in Contract artifacts]

## Out of Scope

[What this story explicitly does not cover, to prevent scope creep during
implementation.]
