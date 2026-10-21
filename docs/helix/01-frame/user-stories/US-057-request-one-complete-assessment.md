---
ddx:
  id: US-057
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: ADR-026
---

# US-057: Request one complete assessment from a coding agent

**Feature**: FEAT-009 — HELIX-aware UX assessment
**Brief**: UA-S02
**Feature Requirements**: AGW-01, AGW-02, AGW-03, AGW-04
**PRD Requirements**: FR-38
**Priority**: P1
**Status**: Draft

## Story

**As a** coding-agent user
**I want** to ask my agent for one complete assessment and get the agreed output package
**So that** I do not have to run each stage by hand or guess what was skipped

## Context

ADR-026 decision 5: the skill `ux-builder-assess`, shipped with `@ux-builder/audit`, does the reasoning; the commands do the deterministic work. In increment 1 the skill runs the context, traceability and baseline stages and records later stages as not yet available.

## Walkthrough

1. The user says: "Assess this app's UX using its HELIX documents and tests. Do not change application code."
2. The agent follows the skill: validate, collect, alignment review, baseline, then the stages available, and writes the output package.

## Acceptance Criteria

- [ ] **US-057-AC1** — Given the skill and a valid manifest, when an agent follows it, then it validates the manifest, collects the documents, records the alignment review, runs the baseline and every later stage the installed version supports, and writes the output package CONTRACT-006 defines.
- [ ] **US-057-AC2** — Given no browser tool, an app that does not start, an authentication barrier, or a time or step limit reached, when the stage it stops is recorded, then the stage is `blocked` or `partial` with its reason and none of its pairs count as assessed.
- [ ] **US-057-AC3** — Given no UX Builder MCP server but an installed `@ux-builder/ui`, when the assessment runs, then it completes from the installed guidance and catalogue; deterministic results and agent judgments are labelled by their source in every output.
- [ ] **US-057-AC4** — Given an app with `@ux-builder/ui` installed, when the assessment reports the SDK version or looks up a pattern, then both come from the app's installed copy; and the MCP server, when used from the app's directory, serves that copy's catalogue and reports its version.

## Edge Cases

- A later stage the installed version does not support is recorded as `not assessed: not available in this version`, never skipped silently.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Skill | US-057-AC1 | Skill text; fixture app | Read; run its commands | Stages in order; output package |
| Blocked | US-057-AC2 | App whose start command fails | baseline | Stage blocked with reason; no assessed pairs |
| No MCP | US-057-AC3 | No MCP configured | Run the commands | Completes; labels present |
| Version | US-057-AC4 | App with an older @ux-builder/ui than the MCP package | MCP from the app's directory | App's version served and reported |

## Dependencies

- **Feature Spec**: FEAT-009
- **Feature Requirements**: AGW-01, AGW-02, AGW-03, AGW-04
- **PRD Requirements**: FR-38
- **External**: CONTRACT-006; CONTRACT-004 revision

## Out of Scope

- See FEAT-009 "Out of Scope".
