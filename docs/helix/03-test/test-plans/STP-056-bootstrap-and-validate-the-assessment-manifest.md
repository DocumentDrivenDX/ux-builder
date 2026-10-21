---
ddx:
  id: STP-056
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-056
    - kind: informed_by
      to: SD-004
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-056-bootstrap-and-validate-the-assessment-manifest

## Story Reference

**User Story**: [[US-056-bootstrap-and-validate-the-assessment-manifest]] (Bootstrap and validate the assessment manifest)
**Technical Design**: N/A (SD-004 covers the story at this size)
**Related Solution Design**: [[SD-004-helix-aware-ux-assessment]]
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: The manifest is proposed from the repository, binds HELIX as HELIX does, holds no secrets, and fails validation with a path for each problem.
**Blocking Gate**: `node --test packages/audit/test/assess-manifest.test.mjs`

**In Scope**
- `assess init` and `assess validate`
- HELIX marker discovery, refusal and flow resolution (shared with `collect`)

**Out of Scope**
- Document classification and criteria (STP-058)

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-056-AC1 | Given a repository with a `.helix.yml`, a `package.json` and HELIX stories, when `assess init` runs, then it writes a manifest naming the marker, the flow and the catalogue source, the test commands, and each story by ID as a candidate journey; it contains no requirement text, and every value it could not determine is an explicit placeholder. | `init proposes a manifest from the repository` | The written manifest names the marker, flow and catalogue source, the `package.json` test commands and each fixture story by ID; a search of it for any criterion text finds none; undetermined fields are `<fill-in: …>` placeholders | `@covers US-056-AC1` | Contract | `packages/audit/test/assess-manifest.test.mjs` | Fixture repo: `.helix.yml`, `package.json` with `test` and `e2e`, two stories | |
| US-056-AC2 | Given a manifest, when `assess validate` runs, then it checks the schema, that paths exist, that the flow resolves to exactly one HELIX flow, that the commands exist, and that each journey names stories and criteria that exist in the flow; each problem is printed with its path, and it exits 1 if there is any. | `validate reports each problem with its path` | A manifest naming a missing story, a missing command and a bad path exits 1 and prints three problems with JSON paths; a valid one exits 0 | `@covers US-056-AC2` | Contract | `packages/audit/test/assess-manifest.test.mjs` | Fixture repo and manifests | |
| US-056-AC3 | Given a manifest whose credentials are an environment-variable name or a storage-state file path, when it is validated, then it passes; given one holding a value that looks like a secret, then validation fails naming the field, without printing the value. | `credentials by reference; secrets refused` | `{ env: NAME }` and `{ storageState: path }` pass; a manifest containing `sk-…` fails naming the field, and stdout and stderr do not contain the value | `@covers US-056-AC3` | Contract | `packages/audit/test/assess-manifest.test.mjs` | Manifests with references and with a fake token | |
| US-056-AC4 | Given a marker HELIX would refuse (unparseable, a root outside the repository, a duplicate flow, an unknown `defaults.flow`, a missing root) or two flows and no choice, when the manifest is validated, then it stops with HELIX's reason, or lists the candidate flows; given a valid marker, the result records the flow, its root and the catalogue source and version that bound. | `marker refusals and flow resolution follow HELIX` | Each malformed marker (parse error, root outside the repo, duplicate flow, unknown `defaults.flow`, missing root) stops with its reason; two flows without a choice list both; a valid marker records flow, root and catalogue `{ source, version }` | `@covers US-056-AC4` | Contract | `packages/audit/test/assess-helix.test.mjs` | Fixture markers; a fixture catalogue with `graph.yml` and two `meta.yml` | |
| US-056-AC5 | Production environment, off-origin entries, consequential allows and other write scopes are refused; deny defaults always present | `restrictions are enforced at validation` | `environment: production`, an entry on another origin, and `allow: [payment]` each give an error with its path; a valid manifest's resolved `deny` contains the four defaults | `@covers US-056-AC5` | Contract | `packages/audit/test/assess-manifest.test.mjs` | Fixture manifests | |

## Executable Proof

### Primary Commands

```bash
node --test packages/audit/test/assess-manifest.test.mjs
```

### Coverage Focus

- P0: every row above.
- P1: the edge cases below.

## Data and Setup

| Need | Required For | Source / Strategy |
|------|--------------|-------------------|
| Temp directories and git repositories | All rows | Created per test, removed after |
| Built `@ux-builder/ui` and `@ux-builder/tokens` CSS | Browser rows | `npm run build` before the suite, as the audit suites need |

## Edge Cases and Failure Modes

- `include` reaching outside the root is rejected.
- `init` refuses to overwrite an existing manifest.

## Build Handoff

**Implementation Order**
1. The first row's test, red, then the code that turns it green.
2. The remaining rows in order.

**Constraints**
- CONTRACT-006 formats; ADR-026 decisions; the existing audit suites pass unchanged.

**Done When**
- [ ] Every in-scope acceptance criterion has passing evidence
- [ ] Named commands or test files exist and run
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`
- [ ] The story can fail red before implementation and pass green after implementation

## Review Checklist

- [x] References the governing story and design
- [x] Every active acceptance criterion maps to concrete failing tests, keyed by its stable ID
- [x] Every row names the asserted behavior
- [x] Every row records its `@covers` citation
- [x] File paths and commands are specific
- [x] Setup and fixtures are explicit
- [x] Edge cases cover real story risks
- [x] Scope is one story slice
- [x] Build handoff gives a usable sequence
