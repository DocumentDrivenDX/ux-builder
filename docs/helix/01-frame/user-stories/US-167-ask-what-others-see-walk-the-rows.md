---
ddx:
  id: US-167
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: US-166
---

# US-167: Ask what the others see, walk the rows, and measure honestly

**Feature**: FEAT-018
**Feature Requirements**: GDL-88
**PRD Requirements**: FR-89
**Priority**: P1
**Status**: Draft

## Story

**As a** person designing an app with the guide (PRD primary persona)
**I want** to be asked what each person needs to see about the others, every list in the prototype checked, my app's header to show its own name, and the guide's times to be true
**So that** a missing question is caught on day one, not in testing, and what I am told about the session is right

## Acceptance Criteria

- [ ] **US-167-AC1** — Given the intake, then it asks what each person needs to see about the others and where each comes from; and given a blueprint with a form, a name, phone number, email, birth date or address shown on another screen that no form or journey step asks for is a `content.asked` warning.
- [ ] **US-167-AC2** — Given a journey step on a list whose action leads to a screen, when the journey is walked, then the list's first row is tapped too, and a row that opens a different screen than the journey's next is a finding.
- [ ] **US-167-AC3** — Given a design folder without an app, then status says to record the step 4 batch with `step batch` and build on the accepted theme, and that the theme never blocks.
- [ ] **US-167-AC4** — Given an app built from a design on a theme without logo artwork, then its header shows the app's name alone (`Logo` with its fallback set to none).
- [ ] **US-167-AC5** — Given the guide's events, then each is logged with its time of day, and an event with a bare date never starts or stretches a measured span.

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-88
- **External**: US-166, CONTRACT-005, CONTRACT-008
