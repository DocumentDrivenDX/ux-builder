---
ddx:
  id: STP-119
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-119
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-119-the-agent-challenges-a-request-and-records-the-five-answers

## Story Reference

**User Story**: [[US-119-the-agent-challenges-a-request-and-records-the-five-answers]] (The agent challenges a request and records the five answers)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-119's criteria on fixture apps in temporary folders, with no network and no model.
**Blocking Gate**: `npm test --workspace @ux-builder/design` and `npm test --workspace @ux-builder/mcp` and `npm test --workspace @ux-builder/trace`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-119-AC1 | Given an open episode, when `ux-builder-trace decide` runs with `--chose`, `--why`, `--goal`, `--without`, `--simplest`, `--assumptions` and `--validation`, then the `decision` event holds all seven, with masking applied to the free-text fields. | `us-119-ac1-trace-decide-five` | event fields | `@covers US-119-AC1` | Unit | `packages/trace/test/decide.test.mjs` | Temp app with an open episode | Built |
| US-119-AC2 | Given MCP `record_decision` called with the same five fields, when the event is read, then it equals the event `decide` writes for the same input. | `us-119-ac2-mcp-decide-five` | parity | `@covers US-119-AC2` | Integration | `packages/mcp/test/trace.test.mjs` | Temp app | Built |
| US-119-AC3 | Given `decide --kind addition` (a new destination, screen, modal, required input or step) without one of the five fields, when it runs, then it exits 2 naming the missing field and writes nothing. | `us-119-ac3-trace-decide-required` | missing field refused | `@covers US-119-AC3` | Unit | `packages/trace/test/decide.test.mjs` | Temp app | Built |
| US-119-AC4 | Given the installed skill and the app's `AGENTS.md`, when they are read, then they state the standing objective, the six challenge questions to ask before designing a feature, and that every addition needs a decision with the five answers. | `us-119-ac4-skill-simplicity` | objective, questions and rule present | `@covers US-119-AC4` | Unit | `packages/design/test/skill.test.mjs` | Skill file; a created app's `AGENTS.md` | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
npm test --workspace @ux-builder/mcp
npm test --workspace @ux-builder/trace
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
