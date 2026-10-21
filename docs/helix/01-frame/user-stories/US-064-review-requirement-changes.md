---
ddx:
  id: US-064
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: ADR-026
---

# US-064: Review exact requirement changes before implementation

**Feature**: FEAT-009 — HELIX-aware UX assessment
**Brief**: UA-S09
**Feature Requirements**: DOC-01, DOC-02, DOC-03, DOC-04, HLX-06
**PRD Requirements**: FR-41
**Priority**: P2
**Status**: Draft

## Story

**As a** product owner
**I want** the exact edits to my HELIX artifacts and tests, proposed and not applied
**So that** I accept or reject each before anyone builds it

## Context

ADR-026 decision 6. Proposals target HELIX artifacts by `ddx.id` and type, or new instances per the catalogue.

## Walkthrough

1. The output package holds a patch per proposal against the target artifact, with its finding IDs.
2. The owner accepts some; they are applied through HELIX (its `evolve` route), after rechecking revisions.

## Acceptance Criteria

- [ ] **US-064-AC1** — Given an accepted-for-review finding, when proposals are written, then each targets a HELIX artifact: an existing instance by `ddx.id`, type and path, or a new instance named by its type's `output.naming`, given the next free ID in its `id_format` and drafted from its template; the backlog is proposed as an `improvement-backlog` entry; a scope change names the PRD or vision decision it needs.
- [ ] **US-064-AC2** — Given a proposal, when read, then it keeps its finding and evidence IDs, says whether it adds a usability requirement or reports an unmet existing criterion, and includes the test change that verifies it.
- [ ] **US-064-AC3** — Given an assessment, when it ends, then no file under the flow's root and no application file has changed; and when an accepted proposal is applied, its target's revision is checked against the one recorded and a mismatch is reported as a conflict.
- [ ] **US-064-AC4** — Given an implementation plan for an accepted change, when written, then it names the files it may write, the behaviour it keeps, its dependencies and its verification, and it changes no behavioural assertion of an existing test unless a proposal changes that behaviour explicitly.

## Edge Cases

- A target artifact's `ddx:` frontmatter is preserved byte for byte in the patch.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Targets | US-064-AC1 | Finding against US-015; one needing a new story | Write proposals | Patch on US-015; new US with next ID from the template; backlog entry |
| Content | US-064-AC2 | Proposal | Read | IDs, kind, test change |
| Untouched | US-064-AC3 | Run on a clean tree; revision changed before apply | git status; apply | Clean; conflict |
| Plan | US-064-AC4 | Plan | Read | Writes, kept behaviour, verification |

## Dependencies

- **Feature Spec**: FEAT-009
- **Feature Requirements**: DOC-01, DOC-02, DOC-03, DOC-04, HLX-06
- **PRD Requirements**: FR-41
- **External**: CONTRACT-006; CONTRACT-004 revision

## Out of Scope

- See FEAT-009 "Out of Scope".
