---
ddx:
  id: US-159
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: CONTRACT-004
    - kind: informed_by
      to: ADR-037
---

# US-159: A working prototype generated from the design

**Feature**: FEAT-018
**Feature Requirements**: GDL-83
**PRD Requirements**: FR-89
**Priority**: P1
**Status**: Draft

## Story

**As a** person designing an app with the guide
**I want** the app built from my design to be a working journey skeleton, not an empty screen
**So that** I react to the experience itself, sooner, instead of waiting for it to be hand-built or reading screen specs

## Context

The build in place produced the starter's empty Home screen, so the agent hand-built the validated prototype before the person could click through anything; in the session, feedback on a working app came faster and was more useful than feedback on documents.

## Walkthrough

1. The app is built in place from the chosen blueprint.
2. Each screen has a route, its title, purpose and content in order, with sample data; the journeys' actions lead from step to step.
3. `?state=error` shows a screen's failure and recovery; the prototype toolbar resets the sample data.
4. After a hand edit to one screen, `npm run prototype` regenerates the rest and lists the edited one.

## Acceptance Criteria

- [ ] **US-159-AC1** — Given a design folder whose blueprint has screens and journeys, when the app is built in place, then it has a route per screen showing its title, purpose and content in the blueprint's order with sample data, the journeys' actions leading step to step, and the blueprint's dialogs.
- [ ] **US-159-AC2** — Given the generated app, when a screen is shown, then it can show its loading, empty, error and recovery states and the business-rule warnings its journeys cite; `?state=<name>` forces a state; and the prototype toolbar resets the sample data.
- [ ] **US-159-AC3** — Given generated files, when they are read and `create-app --prototype` runs again, then each names the blueprint and its hash, files not edited by hand are replaced, and edited ones are left and listed.

## Edge Cases

- **A view, a blueprint with no journeys, or no responsive-web**: keeps the starter's shell
- **A journey step with no action**: gets a Continue action to the next step

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-159-AC1 | a designed blueprint | build in place | routes, content, sample data, actions, dialogs |
| AC2 | US-159-AC2 | the generated app | each state; `?state=`; reset | states shown; reset works |
| AC3 | US-159-AC3 | a hand-edited screen | `--prototype` | others replaced; edited listed |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-83
- **PRD Requirements**: FR-89
- **External**: CONTRACT-004, CONTRACT-008, ADR-037

## Out of Scope

- Production implementation: the skeleton is a prototype until core-3 (ADR-037).
