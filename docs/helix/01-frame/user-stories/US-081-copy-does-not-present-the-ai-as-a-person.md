---
ddx:
  id: US-081
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-011
    - kind: informed_by
      to: ADR-028
---

# US-081: Copy does not present the AI as a person

**Feature**: FEAT-011 — AI and agent experience rules
**Feature Requirements**: AIV-01
**PRD Requirements**: FR-49
**Priority**: P1
**Status**: Draft

## Story

**As an** app developer (PRD primary persona) writing the copy around an AI feature
**I want** the lint to warn when UI text makes the AI sound like a person, or makes it the actor instead of the user
**So that** users form an accurate picture of what the AI is and stay in charge of what it does

## Context

Microsoft's agent guidance says agents are differentiated from humans: neutral, task-focused language, no "think" or "feel". It also says to keep the user initiating the action ("Summarize with Copilot", not "Copilot, summarize"). Apple's generative AI guidance says never to lead people to think AI content is human-authored. This is a lint warning, and strings can opt out for a brand that chooses a persona.

## Walkthrough

1. The developer writes `<p>I think this answer is right</p>` and a button `Copilot, summarize`.
2. `npm run lint` warns on both, naming `ux-builder/ai-neutral-voice` and the rule IDs.
3. They change the copy to `<p>Generated answer — check before you use it</p>` and `Summarize`.

## Acceptance Criteria

Exact rule IDs, fields, markers and check names are proposals in SD-005 and
CONTRACT-005 *[Amendment 2026-10-21]*; the criteria name them so tests can
cite them.

- [ ] **US-081-AC1** — Given JSX text or a string attribute containing first-person mental-state phrases ("I think", "I feel", "I understand", "I believe"), when `ux-builder/ai-neutral-voice` runs, then it warns citing rule `ai.not-a-person`.
- [ ] **US-081-AC2** — Given a label of the form "<Name>, <verb>" (vocative AI name before a command), when the rule runs, then it warns citing rule `ai.user-initiates`.
- [ ] **US-081-AC3** — Given a string with `// ux-builder-ai-persona` on the line before it, when the rule runs, then no warning is given.
- [ ] **US-081-AC4** — Given ordinary copy ("Think about your audience", "We feel strongly"), when the rule runs, then no warning is given.

## Edge Cases

- **Text from the model at run time**: not linted; the review rule `ai.not-a-person` covers the system prompt's instructions.
- **Other languages**: English only at first; the rule says so.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-081-AC1 | JSX text or a string attribute containing first-person mental-state phrases ("I think", "I feel", "I understand", "I believe") | `ux-builder/ai-neutral-voice` runs | it warns citing rule `ai.not-a-person` |
| AC2 | US-081-AC2 | a label of the form "<Name>, <verb>" (vocative AI name before a command) | the rule runs | it warns citing rule `ai.user-initiates` |
| AC3 | US-081-AC3 | a string with `// ux-builder-ai-persona` on the line before it | the rule runs | no warning is given |
| AC4 | US-081-AC4 | ordinary copy ("Think about your audience", "We feel strongly") | the rule runs | no warning is given |

## Dependencies

- **Stories**: US-076
- **Feature Spec**: FEAT-011
- **Feature Requirements**: AIV-01
- **PRD Requirements**: FR-49
- **External**: CONTRACT-005 (rules, blueprint, AI markup); SD-005 (rule catalogue)

## Out of Scope

- Linting model output.
