---
ddx:
  id: US-096
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-014
    - kind: informed_by
      to: ADR-032
    - kind: informed_by
      to: CONTRACT-004
---

# US-096: Choose the app's modalities when creating it

**Feature**: FEAT-014 — App modalities
**Feature Requirements**: MOD-01, MOD-02, MOD-03
**PRD Requirements**: FR-60
**Priority**: P1
**Status**: Draft

## Story

**As an** app developer (PRD primary persona) creating a new app
**I want** to say whether it is a responsive web app, a chat app or a hybrid chat app, or more than one, when I create it
**So that** the app is built and checked as the kind of app it is, not as an assumed one

## Context

The operator created an app and was never asked what it was; the starter assumed mobile and desktop web. ADR-032 makes the modality a declared choice, stored in the blueprint, required when the starter cannot ask.

## Walkthrough

1. The developer runs `npm create @ux-builder/app acme` in a terminal.
2. The starter asks which modalities the app has, as a multi-select: responsive web, chat, hybrid chat.
3. They pick responsive web and hybrid chat.
4. The app's blueprint records `supports.modalities: ["responsive-web", "hybrid-chat"]` with the derived size classes and inputs.

## Acceptance Criteria

- [ ] **US-096-AC1** — Given a terminal, when `npm create @ux-builder/app acme` runs with no `--modality`, then it asks which modalities the app has as a multi-select of `responsive-web`, `chat` and `hybrid-chat`, and creates the app for the ones chosen. *[Amended 2026-10-24 — FEAT-018 GDL-81, US-150]* Without `--modality` the starter no longer asks: it makes a design folder, the modality is asked during the design (US-149) and the app is built for the person's answer (US-150).
- [ ] **US-096-AC2** — Given `--modality responsive-web,hybrid-chat`, when the starter runs, then it does not ask, and the blueprint's `supports.modalities` is exactly those two, with size classes and inputs derived by FEAT-014's matrix.
- [ ] **US-096-AC3** — Given no terminal and no `--modality` (as for an agent or CI), when the starter runs, then it exits 1 listing the modalities, writes nothing and assumes none. *[Amended 2026-10-24 — FEAT-018 GDL-81, US-150]* It now makes a design folder: no app code, and still no modality assumed.
- [ ] **US-096-AC4** — Given `--modality ios` or an unknown name, when the starter runs, then it exits 1 saying which modalities are available now and that native apps are future.
- [ ] **US-096-AC5** — Given `--blueprint plan.json` whose `supports.modalities` differs from `--modality`, when the starter runs, then it exits 1 naming both.

## Edge Cases

- **An agent creating the app**: it passes `--modality`; the guidance says so.
- **`--help`**: lists the modalities and the flag.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-096-AC1 | a terminal | `npm create @ux-builder/app acme` runs with no `--modality` | it asks which modalities the app has as a multi-select of `responsive-web`, `chat` and `hybrid-chat`, and creates the app for the ones chosen |
| AC2 | US-096-AC2 | `--modality responsive-web,hybrid-chat` | the starter runs | it does not ask, and the blueprint's `supports.modalities` is exactly those two, with size classes and inputs derived by FEAT-014's matrix |
| AC3 | US-096-AC3 | no terminal and no `--modality` (as for an agent or CI) | the starter runs | it exits 1 listing the modalities, writes nothing and assumes none |
| AC4 | US-096-AC4 | `--modality ios` or an unknown name | the starter runs | it exits 1 saying which modalities are available now and that native apps are future |
| AC5 | US-096-AC5 | `--blueprint plan.json` whose `supports.modalities` differs from `--modality` | the starter runs | it exits 1 naming both |

## Dependencies

- **Feature Spec**: FEAT-014
- **Feature Requirements**: MOD-01, MOD-02, MOD-03
- **PRD Requirements**: FR-60
- **External**: ADR-032, CONTRACT-004

## Out of Scope

- Native iOS, Android, macOS and Windows apps.
