---
ddx:
  id: STP-064
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-064
    - kind: informed_by
      to: SD-004
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-064-review-requirement-changes

## Story Reference

**User Story**: [[US-064-review-requirement-changes]] (Review exact requirement changes before implementation)
**Technical Design**: N/A (SD-004 and CONTRACT-006 "Increments 2 and 3")
**Related Solution Design**: [[SD-004-helix-aware-ux-assessment]]
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Proposals target HELIX artifacts, keep their evidence, change nothing, and check for conflicts.
**Blocking Gate**: `node --test packages/audit/test/assess-proposals.test.mjs`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-064-AC1 | Given an accepted-for-review finding, when proposals are written, then each targets a HELIX artifact: an existing instance by `ddx.id`, type and path, or a new instance named by its type's `output.naming`, given the next free ID in its `id_format` and drafted from its template; the backlog is proposed as an `improvement-backlog` entry; a scope change names the PRD or vision decision it needs. | `proposals target existing instances or new ones by the catalogue` | `propose --target US-001` patches the story's criteria; `propose --new user-stories` creates `US-<next>-<slug>.md` from the catalogue's template; both are recorded with type, path and revision | `@covers US-064-AC1` | Integration | `packages/audit/test/assess-proposals.test.mjs` | Fixture HELIX repository and run packages | |
| US-064-AC2 | Given a proposal, when read, then it keeps its finding and evidence IDs, says whether it adds a usability requirement or reports an unmet existing criterion, and includes the test change that verifies it. | `a proposal keeps its IDs, kind and test change` | `proposals.json` has finding IDs, the change kind and the test change | `@covers US-064-AC2` | Integration | `packages/audit/test/assess-proposals.test.mjs` | Fixture HELIX repository and run packages | |
| US-064-AC3 | Given an assessment, when it ends, then no file under the flow's root and no application file has changed; and when an accepted proposal is applied, its target's revision is checked against the one recorded and a mismatch is reported as a conflict. | `nothing changes; conflicts are found` | `check-writes` reports no change after an assessment and names a file edited under the root; `apply-check` reports a conflict when the target changed | `@covers US-064-AC3` | Integration | `packages/audit/test/assess-proposals.test.mjs` | Fixture HELIX repository and run packages | |
| US-064-AC4 | Given an implementation plan for an accepted change, when written, then it names the files it may write, the behaviour it keeps, its dependencies and its verification, and it changes no behavioural assertion of an existing test unless a proposal changes that behaviour explicitly. | `plans name writes, kept behaviour, dependencies and verification` | `validate-report` fails a proposal plan missing any of the four | `@covers US-064-AC4` | Integration | `packages/audit/test/assess-proposals.test.mjs` | Fixture HELIX repository and run packages | |

## Executable Proof

```bash
node --test packages/audit/test/assess-proposals.test.mjs
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with the asserted behaviour and its `@covers` citation
- [x] Commands and files are specific
