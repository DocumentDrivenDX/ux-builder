---
ddx:
  id: US-098
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-014
    - kind: informed_by
      to: ADR-032
    - kind: informed_by
      to: CONTRACT-005
---

# US-098: The modalities choose the rules and components

**Feature**: FEAT-014 — App modalities
**Feature Requirements**: MOD-06, MOD-07
**PRD Requirements**: FR-62
**Priority**: P1
**Status**: Draft

## Story

**As an** AI coding agent (PRD secondary persona) building screens in an app
**I want** the rules and components for the app's modalities
**So that** I build a chat app with the chat components and rules, and a web app with the web ones

## Context

FEAT-014's matrix maps each modality to size classes, inputs, AI roles, components and rule families. `rulesFor` and `get_rules` take `modalities`; the `card.*` rules apply to `hybrid-chat` only (`when.modality`).

## Walkthrough

1. The agent reads the blueprint: `modalities: ["chat"]`.
2. It calls `get_rules` with the modalities.
3. It gets the assistant AI rules and the feedback, input and text rules, not the navigation rules or the card rules.
4. The guidance points it to `@ux-builder/ui/assistant`.

## Acceptance Criteria

- [ ] **US-098-AC1** — Given modalities `["chat"]`, when `rulesFor` or `get_rules` is asked, then it returns the AI rules for `assistant` and the feedback, input and text rules, and not the `nav.*` or `card.*` rules.
- [ ] **US-098-AC2** — Given `["hybrid-chat"]`, when the rules are read, then the `card.*` and `genui.*` rules are included.
- [ ] **US-098-AC3** — Given `["responsive-web"]`, when the rules are read, then every app rule for compact to large and coarse and fine input is returned, and no AI rule.
- [ ] **US-098-AC4** — Given a blueprint with `supports.modalities`, when it is checked, then its `sizeClasses` and `inputs` must include the modalities' (from the matrix), or `blueprint.valid` warns naming the missing ones.
- [ ] **US-098-AC5** — Given an app's modalities, when the guidance or MCP `get_guidance` is read, then it names the components to build with and the rule families that apply for each modality.

## Edge Cases

- **No modalities in an old blueprint**: read as `responsive-web`.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-098-AC1 | modalities `["chat"]` | `rulesFor` or `get_rules` is asked | it returns the AI rules for `assistant` and the feedback, input and text rules, and not the `nav.*` or `card.*` rules |
| AC2 | US-098-AC2 | `["hybrid-chat"]` | the rules are read | the `card.*` and `genui.*` rules are included |
| AC3 | US-098-AC3 | `["responsive-web"]` | the rules are read | every app rule for compact to large and coarse and fine input is returned, and no AI rule |
| AC4 | US-098-AC4 | a blueprint with `supports.modalities` | it is checked | its `sizeClasses` and `inputs` must include the modalities' (from the matrix), or `blueprint.valid` warns naming the missing ones |
| AC5 | US-098-AC5 | an app's modalities | the guidance or MCP `get_guidance` is read | it names the components to build with and the rule families that apply for each modality |

## Dependencies

- **Feature Spec**: FEAT-014
- **Feature Requirements**: MOD-06, MOD-07
- **PRD Requirements**: FR-62
- **External**: ADR-032, CONTRACT-005

## Out of Scope

- Changing the rules themselves.
