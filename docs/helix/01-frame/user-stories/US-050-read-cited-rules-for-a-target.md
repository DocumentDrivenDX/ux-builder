---
ddx:
  id: US-050
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-008
    - kind: informed_by
      to: ADR-025
---

# US-050: Read cited rules that apply to my target

**Feature**: FEAT-008 — Interaction and information architecture: rules, blueprint and audit
**Feature Requirements**: RUL-01, RUL-03, RUL-04, PRV-01, PRV-02, PRV-03, PRV-04
**PRD Requirements**: FR-32, FR-36
**Priority**: P1
**Status**: Draft

## Story

**As a** design-system maintainer, or a developer who is not a UI specialist
**I want** the SDK's interaction and IA rules as data, each citing where it comes from, filtered to the app I am building
**So that** I follow the HIG's and Material 3's guidance without reading them end to end, and we ship nothing their licences forbid

## Context

Operator, 2026-10-20: drive and audit full-screen IA and interactions from Apple's HIG and Material 3 for non-UI developers, within the sources' licences. ADR-025 makes the rules data in `guidelines/rules.json`, conditioned on context, size class and input, and checked for provenance.

## Walkthrough

1. The maintainer adds a rule to `guidelines/rules.json` with its conditions, check and a paraphrased source.
2. `npm run check` validates it and regenerates `catalogue.json`, `AGENTS.md` and the skill.
3. A developer calls `rulesFor({ context: "app", sizeClasses: ["compact"], inputs: ["coarse"] })` and gets only the rules that apply.
4. A rule quoting the HIG fails the check; the maintainer rewrites it in their own words.

## Acceptance Criteria

- [ ] **US-050-AC1** — Given the built `@ux-builder/ui`, when `catalogue.json` is read, then `interaction.rules` holds every rule in `guidelines/rules.json`, each with an ID, title, statement, conditions, check, severity and at least one source, and `interaction.recipes` holds every recipe.
- [ ] **US-050-AC2** — Given a target of context, size classes and inputs, when `rulesFor(target)` runs, then it returns exactly the rules whose `when` matches on every axis the rule names, and a rule with no condition on an axis matches every value of it.
- [ ] **US-050-AC3** — Given the generated `AGENTS.md` and skill, when read, then each lists every rule ID with its statement and states the plan, check, build, lint and audit loop.
- [ ] **US-050-AC4** — Given a rule with no source, a quotation from a source whose licence is not open, a quotation over 25 words, or a check ID that names no existing check, when the rules check runs, then it fails naming the rule and the problem.
- [ ] **US-050-AC5** — Given the README and the generated guidance, when read, then each states that ux-builder is not affiliated with or endorsed by Apple or Google and that Human Interface Guidelines and Material Design are their trademarks.

## Edge Cases

- A rule that applies everywhere names no conditions.
- A rule citing both the HIG and the Android docs may quote only the Android docs.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Catalogue | US-050-AC1 | Built package | Read catalogue.json | Every rule and recipe present with required fields |
| Filter | US-050-AC2 | Rules with and without conditions | rulesFor compact + coarse + app | Only matching rules |
| Guidance | US-050-AC3 | Generated AGENTS.md | Read | Every rule ID and the loop |
| Provenance | US-050-AC4 | Four bad rules | Run the check | Four named failures |
| Disclaimer | US-050-AC5 | README, AGENTS.md | Read | Disclaimer present |

## Dependencies

- **Feature Spec**: FEAT-008
- **Feature Requirements**: RUL-01, RUL-03, RUL-04, PRV-01, PRV-02, PRV-03, PRV-04
- **PRD Requirements**: FR-32, FR-36
- **External**: CONTRACT-004 and CONTRACT-005 revisions

## Out of Scope

- See FEAT-008 "Out of Scope".
