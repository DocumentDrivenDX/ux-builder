---
ddx:
  id: US-062
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: ADR-026
---

# US-062: Run checks on the state just reached

**Feature**: FEAT-009 — HELIX-aware UX assessment
**Brief**: UA-S07
**Feature Requirements**: INS-01, INS-02, INS-03, INS-04, INS-05, INS-06
**PRD Requirements**: FR-40
**Priority**: P1
**Status**: Draft

## Story

**As a** assessment agent
**I want** the audit's checks to run on the exact page state I reached
**So that** a finding describes the screen the user would see, not a fresh page load

## Context

ADR-026 decision 4. `inspect(page)` is the audit's page-level core; `audit()` is built on it. The agent's browser is shared over a CDP endpoint; a replay adapter is the fallback.

## Walkthrough

1. `npx ux-builder-audit assess browser` starts Chromium with a CDP endpoint; the agent's Playwright MCP connects to it.
2. At a checkpoint, `npx ux-builder-audit assess inspect --cdp <endpoint> --page <url-match> --checkpoint <id>` inspects the live page without navigating.

## Acceptance Criteria

- [ ] **US-062-AC1** — Given a Playwright page with an open dialog, a filled form or a signed-in session, when `inspect(page)` runs, then it does not navigate, reload, reset a form, switch theme or end the session, and the page's URL, form values and open dialog are unchanged afterwards.
- [ ] **US-062-AC2** — Given the same page, when inspected through `inspect()` and audited by URL through `audit()`, then the same checks give the same findings, because `audit()` calls `inspect()`.
- [ ] **US-062-AC3** — Given a browser started with a CDP endpoint and driven by another client, when `assess inspect --cdp` runs, then it inspects that page in place; and given a replay adapter, then it asserts the expected state before inspecting and reports a mismatch instead of findings when the assertion fails.
- [ ] **US-062-AC4** — Given an inspection, when its findings are written, then each carries the journey, step, role, viewport, theme and checkpoint IDs and a reference to a screenshot of the state inspected.
- [ ] **US-062-AC5** — Given a check that moves focus, resizes, switches theme or presses Escape, when `inspect()` runs without asking for it, then it is skipped and listed; asked for, it runs in a separate pass that restores the URL, scroll, focus, viewport and theme, or reports that it could not.
- [ ] **US-062-AC6** — Given three checkpoints (a signed-in screen, an open dialog, and a form showing a validation error with its input kept), when each is inspected in place, then each produces findings linked to its checkpoint and the task can continue from the same state.

## Edge Cases

- A page closed between the agent's step and the inspection is reported as `checkpoint lost`.
- Two pages match `--page`: the inspection stops and lists them.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| In place | US-062-AC1 | Fixture: dialog, filled form, cookie session | inspect(page) | State unchanged |
| Same logic | US-062-AC2 | Fixture page | inspect vs audit | Same findings |
| CDP and replay | US-062-AC3 | Chromium with CDP, driven by a second client; replay with wrong state | assess inspect | In place; mismatch reported |
| IDs | US-062-AC4 | Inspection | Read findings | IDs and screenshot |
| State-affecting | US-062-AC5 | Page with a dialog | inspect with and without passes | Skipped list; restored |
| Proof | US-062-AC6 | Signed-in, dialog, validation-error fixtures | inspect each, continue task | Linked findings; task completes |

## Dependencies

- **Feature Spec**: FEAT-009
- **Feature Requirements**: INS-01, INS-02, INS-03, INS-04, INS-05, INS-06
- **PRD Requirements**: FR-40
- **External**: CONTRACT-006; CONTRACT-004 revision

## Out of Scope

- See FEAT-009 "Out of Scope".
