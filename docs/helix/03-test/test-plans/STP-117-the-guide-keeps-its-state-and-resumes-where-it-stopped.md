---
ddx:
  id: STP-117
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-117
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-117-the-guide-keeps-its-state-and-resumes-where-it-stopped

## Story Reference

**User Story**: [[US-117-the-guide-keeps-its-state-and-resumes-where-it-stopped]] (The guide keeps its state and resumes where it stopped)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-117's criteria on fixture apps in temporary folders, with no network and no model.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-117-AC1 | Given a design state with each field CONTRACT-008 defines, when it is validated, then it passes `design-state.schema.json`; a state with an unknown field or a bad assumption status fails, naming the path. | `us-117-ac1-state-schema` | valid passes; invalid named | `@covers US-117-AC1` | Unit | `packages/design/test/state.test.mjs` | Fixture states | Planned: not built yet |
| US-117-AC2 | Given an app with a design state, when `state set assumptions[+]` adds an assumption and `state get --json` runs, then the assumption is returned with status `assumed`, an ID `A-<n>` and an empty evidence list, and the file is rewritten in a stable key order. | `us-117-ac2-state-set-get` | round trip; stable order | `@covers US-117-AC2` | Unit | `packages/design/test/state.test.mjs` | Temp app | Planned: not built yet |
| US-117-AC3 | Given a state at Explore with two untested assumptions and a chosen alternative, when `ux-builder-design status` runs, then it prints the activity, the chosen alternative, the count of untested assumptions, open questions and the next action, in plain words. | `us-117-ac3-status-summary` | summary text | `@covers US-117-AC3` | Unit | `packages/design/test/status.test.mjs` | Fixture state | Planned: not built yet |
| US-117-AC4 | Given the installed skill, when its text is read, then it describes the four activities with the stages inside each and what the human does in each, and says the human works with the experience while the guide keeps the documents. | `us-117-ac4-skill-activities` | activity table present | `@covers US-117-AC4` | Unit | `packages/design/test/skill.test.mjs` | Skill file | Planned: not built yet |
| US-117-AC5 | Given the installed skill, when its text is read, then it names the guide's knowledge sources (rules, rubric, evidence, task model, decisions) and tools (assessment, prototype, audit, journey events). | `us-117-ac5-skill-knowledge-tooling` | both lists present | `@covers US-117-AC5` | Unit | `packages/design/test/skill.test.mjs` | Skill file | Planned: not built yet |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
