---
ddx:
  id: example.usability-evaluation-report.invoice-review
  type: usability-evaluation-report
  authoring:
    home: repo
  depends_on:
    - example.user-journey-map.invoice-review
    - example.screen-flow.invoice-review
    - example.interaction-state-diagram.invoice
---

# UER-002: Invoice Review Usability Evaluation

**Approach**: mixed (automated assessment + expert review) | **Run**: R-2026-10-02 | **Date**: 2026-10-02 | **Previous**: [[UER-001]]

## Executive Summary

- **Evaluated**: Invoice review (FEAT-004), staging build, journeys J-review, J-explain, J-reject.
- **Top findings**: F-07 save failure is silent (severity 4); F-09 reject has no undo on compact (3); F-11 assistant answer not announced (3).
- **Decision needed**: Fix F-07 before the next release; it can cause double payment.

## Product and Goals

- **Product**: Invoice review web app, build 1.8.0, staging.
- **Scope**: The three journeys in [[SF-004]]. Supplier management out of scope.
- **Users represented**: Accounts-payable reviewer.
- **Goals**: Check every journey and its alternates against the stories' ACs, the design system and the interaction-state diagrams.

## Method

- **Approach**: Automated walk of each journey and alternate in a browser, with inspection at each step; one UX expert reviewed the recordings against the rule sets below.
- **Participants or evaluators**: 1 expert evaluator; no end users.
- **Environment**: Chromium, expanded (1440 px) and compact (390 px), fine and coarse input, screen reader on for J-explain.
- **Procedure**: Rule sets: SDK audit rules, WCAG 2.2 AA, NN/g usability heuristics, DESIGN.md.
- **Limits**: No end users, so no task success, time or satisfaction data; severity frequency is estimated.

## Tasks and Journeys

| Task | Journey | Stories / ACs | Success criterion |
|---|---|---|---|
| Approve a flagged invoice | J-review | US-021-AC1, US-021-AC2, US-021-AC3 | Invoice approved once; queue updated |
| Find out why an invoice is flagged | J-explain | US-022-AC1, US-022-AC3 | Matched invoice named |
| Reject with a reason, then undo | J-reject | US-023-AC1, US-023-AC2 | Rejection undone |

## Measures

| Measure | Definition | Result |
|---|---|---|
| Journeys walked | Journeys and alternates reached end state | 7 of 8 |
| Findings by severity | Count per 0-4 | 4: 1, 3: 2, 2: 1, 1: 1 |

## Findings by Journey

### Journey: J-review — Approve a flagged invoice

#### Step 2: Invoice — Approve

##### F-07: A failed approval looks like it worked

- **Rule**: H1 Visibility of system status — the system keeps users informed of what is going on through timely feedback (paraphrased) — NN/g 10 usability heuristics
- **Evidence**: `assets/UER-002/F-07-expanded.png`; video J-review-alt-2 at 00:41
- **Severity**: 4 — frequency medium, impact high (risk of double payment on retry elsewhere), persistence repeated, market impact high
- **Recommended fix**: Implement `saveError` from [[ISD-011]]: inline error, decision kept, "Try again".
- **Owner**: Review squad
- **Stories / ACs**: US-021-AC3
- **Proposed change**: none — ISD-011 already specifies it; build gap
- **Status**: persistent

### Journey: J-reject — Reject with a reason

#### Step 3: Queue — Undo toast

##### F-09: Undo toast is off screen on compact

- **Rule**: action.destructive-safeguard — a destructive action has a confirmation or an undo the user can reach (paraphrased) — ux-builder SDK rules
- **Evidence**: `assets/UER-002/F-09-compact.png`
- **Severity**: 3 — frequency high on compact, impact high, persistence repeated, market impact not judged
- **Recommended fix**: Anchor the toast above the compact action bar.
- **Owner**: Review squad
- **Stories / ACs**: US-023-AC2
- **Proposed change**: [[WF-012]] add compact toast callout
- **Status**: new

### Journey: J-explain — Find out why

#### Step 2: Assistant panel

##### F-11: Assistant answer is not announced

- **Rule**: WCAG 2.2 SC 4.1.3 Status Messages — status messages can be presented to assistive technology without receiving focus (paraphrased) — W3C WCAG 2.2
- **Evidence**: screen-reader log `assets/UER-002/F-11-sr.txt`
- **Severity**: 3 — frequency high for screen-reader users, impact high, persistence repeated
- **Recommended fix**: Announce "Answer ready" (polite) when streaming ends, per [[ISD-020]].
- **Owner**: Assistant squad
- **Stories / ACs**: US-022-AC1
- **Status**: new

### Cross-journey

##### F-13: Hard-coded grey on flag chip

- **Rule**: DESIGN.md Tokens — colors come from role tokens, not raw values (paraphrased) — [[design-system]]
- **Evidence**: `assets/UER-002/F-13.png`
- **Severity**: 1 — cosmetic; contrast still passes
- **Recommended fix**: Use the warning role token.
- **Owner**: Design system
- **Stories / ACs**: no AC covers this
- **Status**: new

## State Coverage

| Journey | ideal | empty | loading | partial | error | offline | slow | permission-denied | success |
|---|---|---|---|---|---|---|---|---|---|
| J-review | assessed | assessed | assessed | not-assessed | assessed | not-assessed | not-assessed | assessed | assessed |
| J-explain | assessed | n/a | assessed | assessed | assessed | not-assessed | not-assessed | n/a | assessed |
| J-reject | assessed | n/a | assessed | n/a | not-assessed | not-assessed | n/a | n/a | assessed |

## Design System Conformance

| Check | Source | Result | Findings |
|---|---|---|---|
| Colors from role tokens | DESIGN.md Tokens | fail | F-13 |
| Active nav cue + `aria-current` | DESIGN.md Navigation | pass | — |
| Async loading + double-submit guard | DESIGN.md Interaction States | pass | — |

## Modality Fit

- **Modality**: Desktop-first web app with an embedded AI assistant; secondary tablet use.
- **Components**: Side-panel assistant fits expanded; full-screen panel on compact loses the invoice context the answer refers to.
- **Guidelines applied**: Human-AI interaction guidance on making clear what the assistant can do and citing its sources — met (answer names the matched invoice); touch target size — met.
- **Gaps**: F-11; compact assistant context (logged as observation, severity 2, F-12).

## Recommendations

| Rank | Finding | Fix | Owner | Route |
|---|---|---|---|---|
| 1 | F-07 | Build saveError state | Review squad | improvement-backlog item 1 |
| 2 | F-09 | Anchor compact toast | Review squad | WF-012 |
| 3 | F-11 | Announce answer | Assistant squad | ISD-020 |

## Appendix: Evidence Index

- F-07 → `assets/UER-002/F-07-expanded.png`, video 00:41
- F-09 → `assets/UER-002/F-09-compact.png`
- F-11 → `assets/UER-002/F-11-sr.txt`
- F-13 → `assets/UER-002/F-13.png`
