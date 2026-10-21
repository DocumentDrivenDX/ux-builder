---
ddx:
  id: STP-070
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-070
    - kind: informed_by
      to: ADR-027
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-070-documents-pass-and-are-traced

## Story Reference

**User Story**: [[US-070-documents-pass-and-are-traced]] (The new app's documents pass HELIX's reading and are traced)
**Technical Design**: N/A (ADR-027 at this size)
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-070's criteria without touching GitHub: tests serve a release and a plugin package built from a fixture over local HTTP (`UX_BUILDER_HELIX_API`).
**Blocking Gate**: `npm test --workspace @ux-builder/create-app`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-070-AC1 | Given a created app, when `assess collect` runs, then every HELIX document is typed by frontmatter, every ID matches its type's format, every link resolves, and no warning is recorded. | `us-070-ac1` | 0 warnings (given: Created app) | `@covers US-070-AC1` | Integration | `packages/create-app/test/helix-wiring.test.mjs; starter.e2e.mjs` | Local HELIX release server serving a built test package | |
| US-070-AC2 | Given a created app, when `assess validate` runs, then its `ux-assessment.yml` is valid: bound to the marker, a journey for US-001, the preview server, and the lint, audit and e2e commands. | `us-070-ac2` | valid (given: Created app) | `@covers US-070-AC2` | Integration | `packages/create-app/test/helix-wiring.test.mjs; starter.e2e.mjs` | Local HELIX release server serving a built test package | |
| US-070-AC3 | Given a created app, when its e2e test is read and run, then `e2e/starter.spec.js` cites each US-001 criterion with `@covers`, passes, and `assess collect` links each criterion as explicit. | `us-070-ac3` | Passes; explicit links (given: Installed app) | `@covers US-070-AC3` | Integration | `packages/create-app/test/helix-wiring.test.mjs; starter.e2e.mjs` | Local HELIX release server serving a built test package | |

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
