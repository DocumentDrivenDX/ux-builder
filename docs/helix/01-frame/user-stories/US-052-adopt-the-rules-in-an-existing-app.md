---
ddx:
  id: US-052
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-008
    - kind: informed_by
      to: ADR-025
---

# US-052: Adopt the rules in an existing app

**Feature**: FEAT-008 — Interaction and information architecture: rules, blueprint and audit
**Feature Requirements**: ADP-02, ADP-03, BLU-03, AUD-03
**PRD Requirements**: FR-33, FR-35
**Priority**: P1
**Status**: Draft

## Story

**As a** tech lead of an app already built on the SDK
**I want** to describe my existing screens in a blueprint and turn on the new audit checks without CI failing on everything at once
**So that** we fix structural and interaction problems gradually and never add new ones

## Context

ADR-025 decisions 4 and 8: `ux-builder-blueprint init` and an audit baseline.

## Walkthrough

1. `npx ux-builder-blueprint init` writes a skeleton `app.blueprint.json`.
2. The lead lists the app's real destinations and screens and runs `npx ux-builder-blueprint check app.blueprint.json`.
3. `npx ux-builder-audit --write-baseline audit-baseline.json <url>` records today's findings.
4. CI runs the audit with `--baseline audit-baseline.json`: it fails only on new findings and lists the baselined ones that are now resolved.

## Acceptance Criteria

- [ ] **US-052-AC1** — Given an app directory without `app.blueprint.json`, when `ux-builder-blueprint init` runs, then it writes a skeleton with kind `app`, supported size classes and inputs, and one screen, changes no other file, and refuses to overwrite an existing blueprint.
- [ ] **US-052-AC2** — Given a blueprint, when `ux-builder-blueprint check <file>` runs, then it prints each finding with its rule ID, severity, path and fix, exits 1 if any finding is an error, and exits 0 when the only findings are warnings.
- [ ] **US-052-AC3** — Given `--write-baseline <file>`, when the audit runs, then it writes every finding to the file in a stable order.
- [ ] **US-052-AC4** — Given `--baseline <file>`, when the audit runs, then findings in the baseline neither appear as new nor affect the exit code, findings not in it are reported and judged as usual, and baselined findings that no longer occur are listed as resolved.

## Edge Cases

- A baseline from an older audit naming an unknown check: ignored with a note.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Init | US-052-AC1 | Directory with package.json | init twice | Skeleton once; second refused; nothing else changed |
| Check | US-052-AC2 | Blueprints with an error and with a warning | check | Exit 1 and 0; findings printed |
| Write | US-052-AC3 | Page with findings | --write-baseline | File with findings |
| Baseline | US-052-AC4 | Baseline, one new and one fixed finding | --baseline | New reported; fixed listed resolved |

## Dependencies

- **Feature Spec**: FEAT-008
- **Feature Requirements**: ADP-02, ADP-03, BLU-03, AUD-03
- **PRD Requirements**: FR-33, FR-35
- **External**: CONTRACT-004 and CONTRACT-005 revisions

## Out of Scope

- See FEAT-008 "Out of Scope".
