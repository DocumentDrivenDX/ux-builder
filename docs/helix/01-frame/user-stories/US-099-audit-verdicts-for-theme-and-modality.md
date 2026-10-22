---
ddx:
  id: US-099
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

# US-099: The audit says whether the app fits its theme and modalities

**Feature**: FEAT-014 — App modalities
**Feature Requirements**: MOD-08, MOD-09, MOD-10
**PRD Requirements**: FR-63
**Priority**: P1
**Status**: Draft

## Story

**As an** app owner (PRD primary persona) reviewing an audit
**I want** a clear verdict on whether the app wears its theme correctly and fits its modalities, with the evidence
**So that** I know at a glance whether the design system, palette, components and guidelines are right for what the app is

## Context

The operator saw no audit output on whether the theme, design system, palette and components were right for the theme and modality. MOD-09 and MOD-10 add two verdicts at the top of the report, each with evidence and fixes.

## Walkthrough

1. The owner runs the audit with `--blueprint`.
2. The report opens with the theme verdict (theme applied, design system, SDK components only, contrast) and the modality-fit verdict per modality (components present, rule families applied).
3. Each failing item links to its findings.

## Acceptance Criteria

- [ ] **US-099-AC1** — Given an app with `--blueprint` naming modalities, when the audit runs, then it inspects each modality's widths (FEAT-014's matrix) and applies its rules.
- [ ] **US-099-AC2** — Given a `chat` or `hybrid-chat` modality whose page renders no SDK `Conversation`, when the audit runs, then the modality-fit verdict for it fails, naming the missing component and the fix.
- [ ] **US-099-AC3** — Given a `hybrid-chat` modality that cannot render an Adaptive Card part, or a `responsive-web` app whose navigation does not adapt by size class, when the audit runs, then its verdict fails or warns naming what is missing.
- [ ] **US-099-AC4** — Given an app, when the audit runs, then the theme verdict states the declared theme, whether it is applied, its design system, whether every component is the SDK's, and the contrast result per appearance, each with a `theme.*` rule for any failure.
- [ ] **US-099-AC5** — Given a clean fixture app of each modality, when the audit runs, then both verdicts pass.

## Edge Cases

- **No blueprint and no `--modality`**: the verdict says it assumed `responsive-web`.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-099-AC1 | an app with `--blueprint` naming modalities | the audit runs | it inspects each modality's widths (FEAT-014's matrix) and applies its rules |
| AC2 | US-099-AC2 | a `chat` or `hybrid-chat` modality whose page renders no SDK `Conversation` | the audit runs | the modality-fit verdict for it fails, naming the missing component and the fix |
| AC3 | US-099-AC3 | a `hybrid-chat` modality that cannot render an Adaptive Card part, or a `responsive-web` app whose navigation does not adapt by size class | the audit runs | its verdict fails or warns naming what is missing |
| AC4 | US-099-AC4 | an app | the audit runs | the theme verdict states the declared theme, whether it is applied, its design system, whether every component is the SDK's, and the contrast result per appearance, each with a `theme.*` rule for any failure |
| AC5 | US-099-AC5 | a clean fixture app of each modality | the audit runs | both verdicts pass |

## Dependencies

- **Feature Spec**: FEAT-014
- **Feature Requirements**: MOD-08, MOD-09, MOD-10
- **PRD Requirements**: FR-63
- **External**: ADR-032, CONTRACT-004

## Out of Scope

- Visual design judgment beyond the rules.
