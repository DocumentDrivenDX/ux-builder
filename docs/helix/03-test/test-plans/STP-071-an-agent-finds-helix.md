---
ddx:
  id: STP-071
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-071
    - kind: informed_by
      to: ADR-027
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-071-an-agent-finds-helix

## Story Reference

**User Story**: [[US-071-an-agent-finds-helix]] (An agent in the new app finds HELIX)
**Technical Design**: N/A (ADR-027 at this size)
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-071's criteria without touching GitHub: tests serve a release and a plugin package built from a fixture over local HTTP (`UX_BUILDER_HELIX_API`).
**Blocking Gate**: `npm test --workspace @ux-builder/create-app`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-071-AC1 | Given a created app, when `AGENTS.md` and `CLAUDE.md` are read, then they say the `helix` skill is installed in `.claude/skills/helix/`, name the marker and `docs/helix/`, and give the order of work: HELIX first (frame or evolve), then the blueprint, the patterns, lint, the audit and the assessment; and they point other agent hosts to HELIX's install guide. | `us-071-ac1` | HELIX named; order of work (given: Created app) | `@covers US-071-AC1` | Integration | `packages/create-app/test/helix-wiring.test.mjs` | Local HELIX release server serving a built test package | |

## Executable Proof

```bash
npm test --workspace @ux-builder/create-app
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network
