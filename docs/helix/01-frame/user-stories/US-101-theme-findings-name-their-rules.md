---
ddx:
  id: US-101
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-015
    - kind: informed_by
      to: ADR-033
    - kind: informed_by
      to: CONTRACT-005
---

# US-101: Theme findings name their rules

**Feature**: FEAT-015 — Findings by journey, with every rule spelled out
**Feature Requirements**: RPT-02
**PRD Requirements**: FR-64
**Priority**: P1
**Status**: Draft

## Story

**As an** app developer (PRD primary persona) fixing audit findings
**I want** theme and design-system findings to name a rule with its statement and source, like the interaction findings do
**So that** I know which theme rule I broke and why it exists

## Context

Only interaction and AI checks carried rule IDs; theme checks (token colours, contrast, foreign components) named only the check. RPT-02 adds a `theme.*` catalogue rule for each, with sources (CONTRACT-001, CONTRACT-003, WCAG 2.2).

## Walkthrough

1. The developer's app hard-codes a colour.
2. The audit reports `theme.token-colors`: the rule's statement, CONTRACT-001 as its source, and the fix.

## Acceptance Criteria

- [ ] **US-101-AC1** — Given the audit's theme and design-system checks (theme-applied, token-colors, token-fonts, token-radii, token-overrides, widget-overrides, sdk-widgets, foreign-components, outside-theme, brand, fonts, contrast, reflow, target-size, focus-obscured), when the catalogue is read, then each has a `theme.*` rule with a statement, rationale and sources.
- [ ] **US-101-AC2** — Given a theme finding, when it is reported, then it carries the rule ID, the statement and sources from the catalogue, and the fix.
- [ ] **US-101-AC3** — Given `tools/check-rules.mjs`, when it runs, then it fails if an audit check has no rule naming it.

## Edge Cases

- **Contrast findings**: cite WCAG 2.2 1.4.3 and 1.4.11 with the measured ratio.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-101-AC1 | the audit's theme and design-system checks (theme-applied, token-colors, token-fonts, token-radii, token-overrides, widget-overrides, sdk-widgets, foreign-components, outside-theme, brand, fonts, contrast, reflow, target-size, focus-obscured) | the catalogue is read | each has a `theme.*` rule with a statement, rationale and sources |
| AC2 | US-101-AC2 | a theme finding | it is reported | it carries the rule ID, the statement and sources from the catalogue, and the fix |
| AC3 | US-101-AC3 | `tools/check-rules.mjs` | it runs | it fails if an audit check has no rule naming it |

## Dependencies

- **Feature Spec**: FEAT-015
- **Feature Requirements**: RPT-02
- **PRD Requirements**: FR-64
- **External**: ADR-033, CONTRACT-005

## Out of Scope

- Changing the checks' logic.
