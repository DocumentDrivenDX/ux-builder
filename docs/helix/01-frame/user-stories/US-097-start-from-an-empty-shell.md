---
ddx:
  id: US-097
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-014
    - kind: informed_by
      to: ADR-032
    - kind: informed_by
      to: FEAT-010
---

# US-097: Start from an empty shell for the modalities

**Feature**: FEAT-014 — App modalities
**Feature Requirements**: MOD-04, MOD-05
**PRD Requirements**: FR-61
**Priority**: P1
**Status**: Draft

## Story

**As an** app developer (PRD primary persona) starting a new app
**I want** the new app to be an empty shell for its modalities, with no sample domain
**So that** I build my own app instead of deleting someone else's sample

## Context

The starter shipped a legal 'Matters' screen with sample data. FEAT-014 replaces it with the shell for each modality: an `AppShell` with an empty Home for `responsive-web`, a `Conversation` for `chat`, a card-rendering `Conversation` for `hybrid-chat`; with several modalities, an `AppShell` whose destinations are Home and Assistant.

## Walkthrough

1. The developer creates an app with `--modality chat`.
2. The app opens to an empty conversation, in the theme, with the theme and appearance switch.
3. Its HELIX FEAT-001 and US-001 describe the shell; its e2e test cites US-001's criteria and passes.

## Acceptance Criteria

- [ ] **US-097-AC1** — Given any modality, when the app is created, then no file in it contains sample domain data (no matters, invoices or other sample records), and `src/` has only the shell, the theme switch and providers.
- [ ] **US-097-AC2** — Given `--modality responsive-web`, when the app runs, then it shows an `AppShell` with one Home screen whose empty state says to frame the first feature in HELIX and plan its screens in the blueprint, adapting from compact to large.
- [ ] **US-097-AC3** — Given `--modality chat`, when the app runs, then it shows a full-screen SDK `Conversation` with its composer, empty, and the AI disclosure; given `--modality hybrid-chat`, the conversation renders Adaptive Card parts.
- [ ] **US-097-AC4** — Given `--modality responsive-web,hybrid-chat`, when the app runs, then its `AppShell` has the destinations Home and Assistant, each the shell of its modality.
- [ ] **US-097-AC5** — Given a created app with HELIX, when its documents are read, then FEAT-001 describes the shell for its modalities and US-001 is 'open the app and see where to start' with one criterion per modality's shell, and `e2e/starter.spec.js` cites them and passes.

## Edge Cases

- **`--no-helix`**: the same shell; the e2e test has no `@covers` lines.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-097-AC1 | any modality | the app is created | no file in it contains sample domain data (no matters, invoices or other sample records), and `src/` has only the shell, the theme switch and providers |
| AC2 | US-097-AC2 | `--modality responsive-web` | the app runs | it shows an `AppShell` with one Home screen whose empty state says to frame the first feature in HELIX and plan its screens in the blueprint, adapting from compact to large |
| AC3 | US-097-AC3 | `--modality chat` | the app runs | it shows a full-screen SDK `Conversation` with its composer, empty, and the AI disclosure; given `--modality hybrid-chat`, the conversation renders Adaptive Card parts |
| AC4 | US-097-AC4 | `--modality responsive-web,hybrid-chat` | the app runs | its `AppShell` has the destinations Home and Assistant, each the shell of its modality |
| AC5 | US-097-AC5 | a created app with HELIX | its documents are read | FEAT-001 describes the shell for its modalities and US-001 is 'open the app and see where to start' with one criterion per modality's shell, and `e2e/starter.spec.js` cites them and passes |

## Dependencies

- **Feature Spec**: FEAT-014
- **Feature Requirements**: MOD-04, MOD-05
- **PRD Requirements**: FR-61
- **External**: ADR-032, FEAT-010

## Out of Scope

- Sample apps or templates for domains.
