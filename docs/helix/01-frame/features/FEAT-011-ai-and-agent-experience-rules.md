---
ddx:
  id: FEAT-011
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-007
    - kind: informed_by
      to: FEAT-008
    - kind: informed_by
      to: FEAT-009
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: ADR-025
    - kind: informed_by
      to: ADR-028
---

# Feature Specification: FEAT-011 — AI and agent experience rules

**Feature ID**: FEAT-011
**Status**: Draft (2026-10-21, with ADR-028; awaiting review)
**Priority**: P1
**Owner**: Operator
**Covered PRD Subsystem(s)**: AI and agent experience
**Covered PRD Requirements**: FR-46, FR-47, FR-48, FR-49, FR-50 (drafted with this feature)
**Cross-Subsystem Rationale**: Extends FEAT-008's rule catalogue, blueprint, MCP tools and audit (FR-32 to FR-36), and FEAT-009's assessment (FR-37 to FR-42), with AI-specific rules. It governs FEAT-007's unbuilt assistant patterns (US-046 to US-048).

## Overview

FEAT-008 gave apps cited rules for navigation, modality, feedback, states
and embedded views. They say nothing about AI. This feature adds rules for
four AI surfaces:
- generative features inside an ordinary screen;
- assistants (chat);
- agents that act for the user, including on a UI;
- agent views embedded in a host such as the Praxis harness.

The rules work as FEAT-008's do. Each rule applies by a condition the app
declares (here, a screen's AI role), is checked in the blueprint before
code, in the markup by the audit, and in the lint, and reaches coding agents
through MCP and the guidance. The UX assessment gains AI heuristics and
three scenarios for every AI journey.

## Ideal Future State

A developer, or their agent, declares in the blueprint that a screen is an
`agent` that submits payments and renders a wizard in its answers. Before
writing code, they get:
- the rules that apply;
- a finding that the payment needs an approval step;
- a finding that the inline wizard must work at the compact size of the chat
  column.

The SDK's assistant components mark what they render, so the audit sees the
AI answer, the Stop control and the approval card without any app markup.
The assessment walks the journey three times (normal, error-prone and
risky), stops at the approval, and reports what a person would find hard.

## Problem Statement

- **Current situation**: The 29 rules (FEAT-008) cover screens, not AI.
  FEAT-007 specifies the SDK's assistant components (CONV-, AGT-T-, GEN-),
  but an app that builds its own AI screen, or uses another library, gets no
  guidance or check. The assessment (FEAT-009) has no AI heuristics.
- **Pain points**:
  1. AI features ship with no disclosure, no way to stop or undo, and
     approvals that are automatic or missing.
  2. Agents act with no visible plan or status, and users cannot interrupt
     or take over.
  3. Coding agents build chat screens from training data, not from rules.
  4. Generated UI inside a chat (a wizard, a form) loses what the user typed
     when the answer is regenerated.
- **Desired outcome**: AI screens are planned, built, checked and assessed
  against cited rules, like every other screen.

## Functional Areas

| Area | User question or job | Feature responsibility |
|------|----------------------|------------------------|
| Rules | "What must an AI screen do?" | The AI rule families, cited and paraphrased |
| Roles | "Which rules apply to my screen?" | A screen's declared AI role selects them |
| Blueprint | "Is my AI screen planned safely?" | Blueprint fields and checks for roles, actions, inline UI and data |
| Markup and audit | "Does the built screen do it?" | Markers the components emit; audit checks by rule ID |
| Hybrid | "My chat renders a wizard. Which rules apply?" | Inline patterns keep their rules at the container's size class, plus generated-UI rules |
| Voice | "Does our copy make the AI sound like a person?" | A lint warning |
| Assessment | "Is this AI journey usable when things go wrong?" | AI heuristics; normal, error-prone and risky scenarios |
| Provenance | "Can we use these sources?" | Paraphrased, cited, licence recorded; counsel's review open |

### Terms

- **AI role**: what AI does on a screen.
  - `generative`: AI output inside an ordinary screen, such as a summary,
    a draft or a suggestion.
  - `assistant`: a conversation.
  - `agent`: the AI acts for the user (changes data, sends, buys, operates
    a UI).
  - A screen may declare more than one role.
- **High-impact action**: an action an agent can take whose effect is
  irreversible, costly, or seen by other people (pay, send, delete, publish,
  call). Each one must declare its approval.
- **Inline UI**: an SDK pattern or widget that an assistant renders inside a
  message (FEAT-007 GEN-01, GEN-02), such as a `Wizard` or `FormPage`.
- **AI marker**: an attribute in the markup that tells the audit what an
  element is (generated content, status, plan, approval). Defined in
  CONTRACT-005 *AI markup*.

## Requirements

### Functional Requirements by Area

#### Rules

AIR-01. The rule catalogue (FEAT-008 RUL-01) gains AI rule families. The
draft list, with each rule's statement, conditions, check and sources, is
SD-005 *Rule catalogue*:
- **Disclosure and expectations:**
  - AI use is identified where it happens;
  - AI is never presented as a person;
  - capabilities and limits are stated at first use;
  - suggested starting points are offered;
  - a non-AI path remains where AI is an add-on.
- **Control and correction:**
  - generation can be stopped;
  - output can be edited, retried, regenerated or reverted, and a correction
    says when it took effect;
  - a suggestion can be dismissed;
  - an agent can be turned off and its state is shown.
- **Agent actions:**
  - the plan and next step are visible;
  - each high-impact action has an approval that can be denied;
  - approval is never inferred;
  - the user can interrupt, take over and hand back, with a visible cue;
  - the user can return to an earlier step;
  - agent actions are told apart from the user's.
- **Explanation and status:**
  - sources and the data relied on are shown;
  - uncertainty and assumptions are stated;
  - progress and step status stay visible to someone not watching;
  - a summary is given at the end.
- **Failure and recovery:**
  - an error is shown where it happened and in text;
  - a blocked request says how to improve it;
  - recovery never forces a restart.
- **Privacy and consent:**
  - the UI says what data leaves the device;
  - personal data is used only with permission, with an opt-out.
- **Feedback:** feedback on output is offered, voluntary and specific.
- **Generated UI:**
  - inline UI is marked as generated;
  - pre-filled values are reviewable before submission;
  - regeneration never discards user input;
  - an inline widget's state stays readable in the conversation history.

AIR-02. Rules that cannot be checked in a UI (bias, datasets, model choice,
testing policy) are `review` checks. They appear in the guidance and the
assessment's heuristics, not in the audit.

#### Roles

AIO-01. A rule may apply by AI role (CONTRACT-005 `when.aiRole`). Roles
combine with FEAT-008's axes: an agent view embedded in a host gets the
`view` rules and the `agent` rules.

AIO-02. `rulesFor` and the MCP tool `get_rules` accept AI roles. A target
with no AI role gets no AI rule.

#### Blueprint

AIB-01. A screen may declare `ai` (CONTRACT-005):
- `roles`;
- `acts` (whether it changes anything outside the conversation);
- `renders` (the patterns it may render inline);
- `highImpactActions`, each with its approval: `each` (every time) or
  `plan` (approved as part of a plan the user reviews);
- `dataLeavesDevice`;
- `fallback` (the screen or destination that does the job without AI).

AIB-02. The blueprint check reports, as warnings:
- an `agent` screen that acts but declares no high-impact action review;
- a high-impact action with no approval;
- a `generative` add-on with no fallback;
- `dataLeavesDevice` with no consent screen or modal;
- an inline pattern that is not renderable (FEAT-007 GEN-01);
- an inline pattern whose rules fail at the size class of the conversation
  region.

AIB-03. An inline pattern is checked with its own rules (FEAT-008) at the
size class of the region it renders in: the conversation's column, not the
window (ADR-021).

#### Markup and audit

AIM-01. The SDK's assistant and generative components (FEAT-007) emit AI
markers on generated content, live status, plans, steps and approvals.
Apps that build their own AI UI add the same markers (CONTRACT-005 *AI
markup*).

AIA-01. The audit checks marked content, by rule ID, as warnings for their
first minor release:
- generated content carries a visible AI disclosure;
- while generation is in progress, a Stop control is reachable and named;
- an approval offers Deny as well as Approve, and nothing is pre-chosen;
- a plan lists its steps with a status for each;
- generated content offers a correction control (retry, regenerate, edit
  or undo);
- an inline widget marked generated keeps its own pattern checks.

AIA-02. The audit reports AI-marked content on a page whose blueprint
screen declares no AI role (a warning, `ai.declared`).

#### Voice

AIV-01. An ESLint rule in `@ux-builder/ui/eslint` warns on UI text (JSX
text and string attributes) that presents an AI as thinking or feeling ("I
think", "I feel", "I understand", "I believe"). It also warns on labels that
make the AI the actor ("Copilot, summarize"), where the user's verb should
lead ("Summarize"). Strings can opt out with a comment, for a brand that
deliberately gives its assistant a persona.

#### Assessment

AIX-01. The UX assessment (FEAT-009) treats a journey through an AI screen
as an AI journey. It applies the AI rules and the `review` heuristics
(AIR-02) as its rubric's AI heuristics.

AIX-02. An AI journey is walked in three scenarios, declared in the
manifest:
- **normal**: the task as intended;
- **error-prone**: an ambiguous or failing request, where the agent errs
  or is blocked;
- **risky**: a step with a high-impact action.

The risky scenario ends at the approval. The assessment denies it, records
what the screen showed, and never approves it (FEAT-009 ENV-01).

AIX-03. Findings from AI journeys name the AI rule or heuristic. They are
ranked by the same rubric as FEAT-009's (impact, confidence, effort).

#### Provenance

AIP-01. Every AI rule cites at least one source and paraphrases it.
- Licence values: `microsoft-terms` (the Microsoft Design article, Microsoft
  Learn's agent design guidance, the HAX Toolkit), `CC-BY-NC-SA-4.0` (Google
  PAIR) and `CC-BY-NC-ND-4.0` (Cheng et al., IUI '26), with `apple-terms`
  as now.
- None of these allows quotation in the SDK's MIT/Apache packages, so none
  is quoted (FEAT-008 PRV-02).

AIP-02. The operator's waiver of counsel's review (ADR-025 *Amendment*)
extends to these sources. The counsel brief lists them, and counsel's answer
is tracked as bead `ux-builder-78483e2c` until resolved.

AIP-03. Microsoft Learn's agent pages are marked *preview* and
*AI-generated*. They support a rule, but do not stand as its only source.

### Non-Functional Requirements

- **Precision**: an audit AI check reports only on marked content, so an app
  with no AI gets no AI finding.
- **Performance**: as FEAT-008: the blueprint check stays under 1 s for 50
  screens, AI fields included.
- **Compatibility**: a blueprint without `ai` is unchanged; existing rules
  keep their IDs.

## User Stories

- [US-076 — Read the AI rules for a screen's role](../user-stories/US-076-read-the-ai-rules-for-a-screens-role.md)
- [US-077 — Plan an AI screen in the blueprint](../user-stories/US-077-plan-an-ai-screen-in-the-blueprint.md)
- [US-078 — The audit checks marked AI content](../user-stories/US-078-the-audit-checks-marked-ai-content.md)
- [US-079 — Users can follow and steer an agent](../user-stories/US-079-users-can-follow-and-steer-an-agent.md)
- [US-080 — A chat that renders UI inline](../user-stories/US-080-a-chat-that-renders-ui-inline.md)
- [US-081 — Copy does not present the AI as a person](../user-stories/US-081-copy-does-not-present-the-ai-as-a-person.md)
- [US-082 — Assess an AI journey in three scenarios](../user-stories/US-082-assess-an-ai-journey-in-three-scenarios.md)

## Edge Cases and Error Handling

- **A screen with AI content but no declared role**: audit warning
  `ai.declared`, with the fix: declare the role.
- **An AI library other than the SDK's**: it emits no markers. The app adds
  them (CONTRACT-005), or the AI checks stay on the blueprint and review.
- **An approval the model claims was given**: never counts (FEAT-007
  AGT-T-04, US-047-AC6). The audit sees only the user's choice.
- **A brand with a deliberate assistant persona**: it opts its strings out
  of AIV-01 with a comment; the rest of the rules still apply.
- **A risky scenario whose app has no approval**: the assessment stops
  before the action, records a blocking finding, and does not take the step.

## Success Metrics

- Every AI rule cites a source and is paraphrased: 0 quoted.
- On the fixture agent app, the blueprint check and the audit report every
  seeded AI defect (missing approval, unmarked answer, no Stop control), and
  report nothing on its clean twin.
- The SDK's assistant components (FEAT-007), once built, pass every AI audit
  check with no app markup.

## Constraints and Assumptions

- The rules restate sources in our own words. Sources' licences checked
  2026-10-21: Microsoft terms (Design article, Learn, HAX), PAIR CC BY-NC-SA
  4.0, the paper CC BY-NC-ND 4.0, Apple terms. Counsel has not reviewed
  them; the operator waived that for now (AIP-02).
- The audit cannot judge what a model says. It checks the UI around the
  output, never the output's truth.

## Dependencies

- **Features**: FEAT-008 (catalogue, blueprint, audit, MCP), FEAT-007
  (components that emit markers; US-046 to US-048), FEAT-009 (assessment).
- **ADRs**: ADR-028; ADR-025 (rules are cited data; its waiver), ADR-021
  (container size class).
- **Contracts**: CONTRACT-005 (rule `when.aiRole`, blueprint `ai`, AI
  markup, licence values), CONTRACT-004 (audit checks, MCP inputs, lint
  rule), CONTRACT-006 (manifest scenarios).

## Out of Scope

- Judging the quality or truth of model output.
- Model choice, datasets and evaluation, beyond `review` guidance.
- Building FEAT-007's assistant components. That work has its own stories;
  this feature specifies the markers they must emit.

## Review Checklist

- [ ] Every rule in SD-005 is paraphrased and cites a source with its licence.
- [ ] The operator has reviewed the rule list in SD-005.
- [ ] Counsel's answer on the new sources is tracked as a bead.
