---
ddx:
  id: US-078
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-011
    - kind: informed_by
      to: ADR-028
    - kind: informed_by
      to: CONTRACT-005
    - kind: informed_by
      to: CONTRACT-004
---

# US-078: The audit checks marked AI content

**Feature**: FEAT-011 — AI and agent experience rules
**Feature Requirements**: AIM-01, AIA-01, AIA-02
**PRD Requirements**: FR-48
**Priority**: P1
**Status**: Draft

## Story

**As an** app developer (PRD primary persona) whose app shows AI output
**I want** the audit to check the running AI screens by rule ID
**So that** a missing disclosure, Stop control, Deny button or correction path is caught before users see it

## Context

The audit checks the running app's DOM (FEAT-008 AUD-01). To check AI UI it must know which elements are AI, so FEAT-011 adds AI markers (`data-piq-ai`, CONTRACT-005 *AI markup*). The SDK's assistant components (FEAT-007) emit them. Apps that build their own AI UI add them.

## Walkthrough

1. The developer runs `npx ux-builder-audit` against the running app.
2. The audit finds elements marked `data-piq-ai`.
3. For each, it applies the AI checks and reports warnings by rule ID with sources.
4. An AI-marked element on a screen whose blueprint declares no AI role gets `ai.declared`.

## Acceptance Criteria

Exact rule IDs, fields, markers and check names are proposals in SD-005 and
CONTRACT-005 *[Amendment 2026-10-21]*; the criteria name them so tests can
cite them.

- [ ] **US-078-AC1** — Given content marked `data-piq-ai="generated"`, when the audit runs, then a warning (`ai.disclose`) is reported unless a visible label identifies it as AI-generated (the label CONTRACT-005 defines, or `aria-describedby` to one).
- [ ] **US-078-AC2** — Given a region marked `data-piq-ai="status"` with `aria-busy="true"`, when the audit runs, then a warning (`ai.stop`) is reported unless a reachable control named "Stop" is in or beside it.
- [ ] **US-078-AC3** — Given an element marked `data-piq-ai="approval"`, when the audit runs, then a warning (`agent.approve-high-impact`) is reported unless it offers both an approve and a deny control, neither pre-selected or auto-submitting.
- [ ] **US-078-AC4** — Given generated content, when the audit runs, then a warning (`ai.correct`) is reported unless a retry, regenerate, edit or undo control is associated with it.
- [ ] **US-078-AC5** — Given a page with AI-marked content whose blueprint screen declares no AI role, when the audit runs with `--blueprint`, then `ai.declared` is reported naming the screen.
- [ ] **US-078-AC6** — Given an app with no AI markers, when the audit runs, then it reports no AI finding.
- [ ] **US-078-AC7** — Given each AI audit finding, when it is reported, then it carries its rule ID and sources, and it is a warning for the first minor release.

## Edge Cases

- **AI library that emits no markers**: no AI findings; the guidance says to add markers or rely on blueprint and review.
- **Disclosure in a parent region** ("Answers are AI-generated" above the conversation): satisfies `ai.disclose` for the content inside it.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-078-AC1 | content marked `data-piq-ai="generated"` | the audit runs | a warning (`ai.disclose`) is reported unless a visible label identifies it as AI-generated (the label CONTRACT-005 defines, or `aria-describedby` to one) |
| AC2 | US-078-AC2 | a region marked `data-piq-ai="status"` with `aria-busy="true"` | the audit runs | a warning (`ai.stop`) is reported unless a reachable control named "Stop" is in or beside it |
| AC3 | US-078-AC3 | an element marked `data-piq-ai="approval"` | the audit runs | a warning (`agent.approve-high-impact`) is reported unless it offers both an approve and a deny control, neither pre-selected or auto-submitting |
| AC4 | US-078-AC4 | generated content | the audit runs | a warning (`ai.correct`) is reported unless a retry, regenerate, edit or undo control is associated with it |
| AC5 | US-078-AC5 | a page with AI-marked content whose blueprint screen declares no AI role | the audit runs with `--blueprint` | `ai.declared` is reported naming the screen |
| AC6 | US-078-AC6 | an app with no AI markers | the audit runs | it reports no AI finding |
| AC7 | US-078-AC7 | each AI audit finding | it is reported | it carries its rule ID and sources, and it is a warning for the first minor release |

## Dependencies

- **Stories**: US-047, US-048 (FEAT-007 components that emit markers)
- **Feature Spec**: FEAT-011
- **Feature Requirements**: AIM-01, AIA-01, AIA-02
- **PRD Requirements**: FR-48
- **External**: CONTRACT-005 (rules, blueprint, AI markup); SD-005 (rule catalogue)

## Out of Scope

- Judging whether the model's output is correct.
