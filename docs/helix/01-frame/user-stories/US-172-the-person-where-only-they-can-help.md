---
ddx:
  id: US-172
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-044
---

# US-172: The person where only they can help, and one prototype that grows

**Feature**: FEAT-018
**Feature Requirements**: GDL-86
**PRD Requirements**: FR-89
**Priority**: P0
**Status**: Draft

## Story

**As a** person designing an app with the guide (PRD primary persona)
**I want** to be asked what only I know, see my own product in every prototype, and not wait on checks or approve the guide's own housekeeping
**So that** my time goes into the decisions that change the design

## Acceptance Criteria

- [ ] **US-172-AC1** — Given HELIX 0.20's locations with `{n}`, `{nn}`, `{feature}` and `{view}`, when the blueprint is proposed, then no path holds a placeholder and each wireframe is its own file.
- [ ] **US-172-AC2** — Given a session, then a check is stamped when it ends with its seconds, step 1 has its minutes, a step logged twice is one entry, testing starts with the first kit, simulated sessions and evidence are marked and confirm no job, the share prints as a percent, the next action follows the steps, and a proposal ID without `--accepted` is refused.
- [ ] **US-172-AC3** — Given an approved brief, when a step prototype is drawn, then neither the brief nor the coverage map changes, and a PRD line that repeats the design state does not come back into the brief.
- [ ] **US-172-AC4** — Given a step prototype, when it is checked, then each screen's ideal state is audited at every size and its other states at one, a redraw keeps its rounds and audits only changed pages, and `step decide` waits until each finding is gone or accepted with a reason.
- [ ] **US-172-AC5** — Given a blueprint, then a screen with `entry` is not unreachable, a screen's `frame` draws it in that frame, a state of its own is drawn as its `stateNotices` notice (and refused without one), and `nav.audience` warns about a tab for other users.
- [ ] **US-172-AC6** — Given screens with content, then wireframes and step prototypes draw that content (form fields by what each label asks, lists and details with sample values); once the app is built, the step prototype is the app and its routes are checked.
- [ ] **US-172-AC7** — Given the guide, then the intake asks how often and on what device, what each person must and must not give, and the rules; `scope` lists stories, criteria, screens, destinations and inputs to cut; and the skill makes steps 1 to 3 the person's and steps 4 to 6 one batch of defaults.

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-86
- **External**: ADR-044, CONTRACT-005, CONTRACT-008
