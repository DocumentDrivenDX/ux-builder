---
ddx:
  id: US-166
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: US-165
---

# US-166: One answer for steps 4 to 6, checks that walk the journeys, and evidence that reads right

**Feature**: FEAT-018
**Feature Requirements**: GDL-87
**PRD Requirements**: FR-89
**Priority**: P1
**Status**: Draft

## Story

**As a** person designing an app with the guide (PRD primary persona)
**I want** my one "go with those" for steps 4 to 6 recorded once, every prototype I see already walked end to end, and test findings and screens that say what is true
**So that** the batch costs me one answer and nothing I am shown has a broken path or a contradiction in it

## Acceptance Criteria

- [ ] **US-166-AC1** — Given a design at step 4, when `step batch` records the person's answer with the alternative, modality, frame and theme, then the alternative is chosen, a decision for it and for the theme is written and approved with that answer with the items the alternative changed, the modality and core-2 are recorded, steps 4 and 5 are decided, the design moves to step 6, and the person is counted once.
- [ ] **US-166-AC2** — Given a design not at step 4, or a batch without the theme, the frame for responsive web, or a choice between two alternatives, when `step batch` runs, then it is refused and nothing is recorded.
- [ ] **US-166-AC3** — Given a step prototype from step 5, when it is checked, then each journey is walked in a browser by clicking its actions on the page (never the prototype's bar), a journey that stops is a finding saying where and why, and the drawn pages show each screen's other actions so they can be walked.
- [ ] **US-166-AC4** — Given test sessions where several participants hit the same problem, when the report is written, then it is one finding citing each session, and routing any of its IDs routes it once.
- [ ] **US-166-AC5** — Given a QR code or barcode marked `data-graphic`, when the lint runs, then its own `<svg>` and black and white colours pass, and an unmarked `<svg>` or another colour is still reported.
- [ ] **US-166-AC6** — Given a state of a screen's own with `values`, then its wireframe and the built app show those values instead of the samples; the generated app's every screen opens with no page error; a list on a phone shows its first three items or those marked `compact`; and the prototype bar's links are readable in dark.

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-87
- **External**: US-165, CONTRACT-005, CONTRACT-008
