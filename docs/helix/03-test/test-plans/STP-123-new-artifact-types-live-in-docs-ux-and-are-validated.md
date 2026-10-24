---
ddx:
  id: STP-123
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-123
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-123-new-artifact-types-live-in-docs-ux-and-are-validated

## Story Reference

**User Story**: [[US-123-new-artifact-types-live-in-docs-ux-and-are-validated]] (New artifact types live in docs/ux and are validated)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-123's criteria on fixture apps in temporary folders, with no network and no model.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-123-AC1 | Given the package, when `artifacts/` is listed, then every type CONTRACT-008 names has `meta.yml`, `template.md`, `prompt.md` and `example.md`, and each `meta.yml` names its ID prefix and output path. | `us-123-ac1-artifacts-complete` | four files per type | `@covers US-123-AC1` | Unit | `packages/design/test/artifacts.test.mjs` | Package folder | Planned: not built yet |
| US-123-AC2 | Given each type's `example.md`, when `validate` runs on it, then it passes. | `us-123-ac2-examples-valid` | examples pass | `@covers US-123-AC2` | Unit | `packages/design/test/artifacts.test.mjs` | Examples copied into a temp `docs/ux/` | Planned: not built yet |
| US-123-AC3 | Given a `docs/ux/` document with a missing frontmatter field, a wrong ID format or a link to a HELIX ID that does not exist, when `validate` runs, then it exits 1 naming the file and the problem. | `us-123-ac3-validate-errors` | each problem named | `@covers US-123-AC3` | Unit | `packages/design/test/validate.test.mjs` | Fixture app with broken docs | Planned: not built yet |
| US-123-AC4 | Given the guide's commands that write documents, when each runs on a fixture app, then none writes under `docs/helix/`. | `us-123-ac4-no-helix-writes` | docs/helix byte-identical | `@covers US-123-AC4` | Unit | `packages/design/test/validate.test.mjs` | Fixture app; hash of docs/helix before and after | Planned: not built yet |
| US-123-AC5 | Given an app with documents of several types, when `status --json` runs, then it lists each document with its type, ID and path. | `us-123-ac5-status-documents` | documents listed | `@covers US-123-AC5` | Unit | `packages/design/test/status.test.mjs` | Fixture app | Planned: not built yet |

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
