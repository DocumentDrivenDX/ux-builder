---
ddx:
  id: SD-005
  type: solution-design
  status: draft
  links:
    - kind: informed_by
      to: FEAT-011
    - kind: informed_by
      to: ADR-028
    - kind: informed_by
      to: ADR-029
    - kind: informed_by
      to: CONTRACT-005
    - kind: informed_by
      to: SD-003
---

# SD-005: AI and agent experience rules

## Scope

FEAT-011, as a draft for the operator's review before any build:
- the AI rule catalogue: IDs, statements in our own words, conditions,
  checks and sources;
- how the blueprint, audit, lint and assessment check them;
- the order of work.

The data format is CONTRACT-005 *[Amendment 2026-10-21]*; the decisions are
ADR-028.

## Sources

Licences were checked 2026-10-21. Every rule paraphrases; none quotes.

| Key | Source | URL | Licence value | Use |
|---|---|---|---|---|
| APL | Apple HIG: Generative AI (updated 2026-06-08) | https://developer.apple.com/design/human-interface-guidelines/generative-ai | `apple-terms` | Primary: disclosure, control, privacy, inputs, outputs, feedback |
| MSD | Microsoft Design: UX design for agents | https://microsoft.design/articles/ux-design-for-agents/ | `microsoft-terms` | Primary: agent space, time and core principles |
| HAX | Microsoft HAX Toolkit: Guidelines for Human-AI Interaction (Amershi et al., CHI 2019) | https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/ | `microsoft-terms` | Primary, peer-reviewed: G1–G18 |
| MSL | Microsoft Learn: Human-centered design for agents | https://learn.microsoft.com/en-us/agents/design-guidelines/human-centered-design | `microsoft-terms` | Supporting only (preview, AI-generated; FEAT-011 AIP-03) |
| PAIR | Google PAIR: People + AI Guidebook | https://pair.withgoogle.com/guidebook | `CC-BY-NC-SA-4.0` | Primary for product thinking: mental models, explainability and trust, feedback and control, errors |
| ACP | Adaptive Cards: Motivations and Principles | https://learn.microsoft.com/en-us/adaptive-cards/resources/principles | `CC-BY-4.0` (MicrosoftDocs/AdaptiveCards) | Card format principles: declarative, host owns the look, interoperability |
| TMS | Microsoft Teams: Designing Adaptive Cards (legacy) | https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/design-effective-cards | `CC-BY-4.0` (MicrosoftDocs/msteams-docs) | Card anatomy, actions, columns, text, images, frequency |
| ACH | Adaptive Cards documentation hub: design best practices | https://adaptivecards.microsoft.com/?topic=design-best-practices | `microsoft-terms` | The current home of card design guidance |
| CSA | Copilot Studio: Accessibility tips for Adaptive Cards | https://learn.microsoft.com/en-us/microsoft-copilot-studio/adaptive-card-accessibility-tips | `microsoft-terms` (source repository private) | Labels, error messages, tab order, headings, hidden inputs, action titles |
| W3C | WCAG 2.2: 1.1.1 Non-text Content | https://www.w3.org/TR/WCAG22/#non-text-content | `W3C` | Alternative text |
| CUA | Cheng, Liang, Schoop, Nichols: Mapping the Design Space of User Experience for Computer Use Agents (IUI '26) | https://arxiv.org/abs/2602.07283 | `CC-BY-NC-ND-4.0` | Primary for agents acting on a UI: taxonomy and study findings |

## Rule catalogue (draft)

Roles: G = `generative`, A = `assistant`, Ag = `agent` (CONTRACT-005
`when.aiRole`). All are warnings. Check kinds: **B** blueprint, **Au**
audit, **L** lint, **C** card (`checkCard`, ADR-029), **R** review.

### Disclosure and expectations

| ID | Statement (our words) | Roles | Checks | Sources |
|---|---|---|---|---|
| `ai.disclose` | Content made by AI is labelled as AI-made where it appears, or within a region whose label says so | G, A, Ag | Au, R | APL (Transparency), HAX G1, MSD (core), PAIR (Explainability + Trust) |
| `ai.not-a-person` | The UI never presents the AI as a person: no first-person thinking or feeling, no human name or face implying a human author | G, A, Ag | L, R | APL (Transparency), MSL (differentiated from humans) |
| `ai.capabilities` | At first use, the screen says what the AI can and cannot do, and that results may need checking | G, A, Ag | R | HAX G1, G2; APL (set clear expectations); PAIR (Mental Models); MSL (first run) |
| `ai.starters` | An open-ended prompt offers suggested starting points, and they are not the only way to start | A, Ag | Au, R | APL (curated suggestions); MSL (example prompts); FEAT-007 CONV-05 |
| `ai.fallback` | Where AI adds to a task rather than being the task, the task can still be done without it | G | B | APL (non-AI fallback) |

### Control and correction

| ID | Statement | Roles | Checks | Sources |
|---|---|---|---|---|
| `ai.stop` | While AI is generating or working, a Stop control is reachable and named; stopping keeps what has arrived and says it stopped | G, A, Ag | Au | CUA (intervention during execution), HAX G9, FEAT-007 CONV-03 |
| `ai.correct` | AI output can be edited, retried, regenerated or reverted, and the screen says when a correction has taken effect | G, A, Ag | Au | APL (refine or revert; acknowledge corrections), HAX G9, MSL (correction pathways), PAIR (Feedback + Control) |
| `ai.dismiss` | An AI suggestion the user did not ask for can be dismissed in one action and stays dismissed | G | R | HAX G8, APL (dismiss content they don't want) |
| `agent.on-off` | The user can turn the agent off, and its state (off, idle, working, waiting for you) is shown | Ag | R | MSD (core: on/off and status), HAX G17 |

### Agent actions

| ID | Statement | Roles | Checks | Sources |
|---|---|---|---|---|
| `agent.declare-high-impact` | A screen whose agent acts lists the actions it can take that are irreversible, costly or seen by others | Ag | B | CUA (high-impact scenarios), APL (confirm significant actions) |
| `agent.approve-high-impact` | Each high-impact action waits for the user's approval, shows what will happen and to what, offers Deny, and is never approved for the user | Ag | B, Au | APL, CUA (permission to proceed), HAX G16, FEAT-007 AGT-T-04 |
| `agent.plan-visible` | When an agent works in steps, its plan and next step are shown, each step with its status; replanning is shown | Ag | Au | CUA (presentation of plan; preview of next steps) |
| `agent.interrupt` | A working agent can be paused or stopped at any step, and the user can then give a new instruction | Ag | Au | CUA (intervention; study: interrupt then follow-up), MSD (control) |
| `agent.who-acts` | When the user can take over and hand back, the screen states who is acting now, and the agent's actions are distinguishable from the user's | Ag | Au | CUA (UI context; takeover cues; distinct agent visuals) |
| `agent.recover` | A failed step is described at that step and in text, and the user can retry it or return to an earlier step without starting over | Ag | Au | CUA (agent errors; revert to prior step), MSL (avoid forcing restarts), HAX G9 |
| `agent.summary` | A finished run ends with a summary of what was done, with detail available on request | Ag | Au | CUA (concise summary; progressive disclosure) |
| `agent.status-unwatched` | Progress, duration and step status reach a user who is not watching (a persistent status region or notification), above all for risky steps | Ag | R | CUA (users unlikely to monitor), MSD (nudging more than notifying) |

### Explanation and trust

| ID | Statement | Roles | Checks | Sources |
|---|---|---|---|---|
| `ai.sources` | Output that relies on documents, data or the web shows which, linked where possible | A, Ag | R | HAX G11, MSL (surface contextual signals), PAIR (Explainability + Trust), FEAT-007 AGT-T-03 |
| `ai.uncertainty` | The UI says when the AI is unsure or has assumed something the user did not say, instead of presenting a guess as fact | G, A, Ag | R | MSD (embrace uncertainty, appropriate trust), CUA (seamfulness; ambiguity), HAX G2, PAIR |
| `ai.ask-when-unclear` | In a high-stakes step, an ambiguous request is clarified with the user; in a low-stakes one, a stated default may be used | Ag | R | CUA (ambiguity), HAX G10 |

### Failure and recovery

| ID | Statement | Roles | Checks | Sources |
|---|---|---|---|---|
| `ai.improve-request` | A blocked or unhelpful result says why, where it can, and how to ask differently | G, A, Ag | R | APL (help people improve requests), PAIR (Errors + Graceful Failure) |

FEAT-008's `feedback.explain-failure` (errors in text, in place) applies to
AI screens unchanged.

### Privacy and consent

| ID | Statement | Roles | Checks | Sources |
|---|---|---|---|---|
| `ai.consent` | Before personal data or usage leaves the device for an AI feature, the user is told what is sent and why, gives permission, and can opt out later | G, A, Ag | B, R | APL (Privacy) |

### Feedback and change over time

| ID | Statement | Roles | Checks | Sources |
|---|---|---|---|---|
| `ai.feedback` | Users can give feedback on a specific output; giving it is optional and never blocks the task | G, A, Ag | R | APL (continuous improvement), HAX G15, PAIR (Feedback + Control) |
| `ai.memory-visible` | What the AI remembers or has learned about the user can be seen and changed | A, Ag | R | MSD (past; transparency of knowledge), HAX G12, G13 |
| `ai.notify-changes` | When the AI's behaviour or model changes in a way users would notice, they are told | G, A, Ag | R | HAX G14, G18, APL (test model updates) |
| `ai.inclusive` | The AI does not infer personal or cultural attributes it can ask for, and is tested with diverse people for stereotyped output | G, A, Ag | R | APL (inclusive), HAX G6, PAIR |

### Generated UI (hybrid screens)

| ID | Statement | Roles | Checks | Sources |
|---|---|---|---|---|
| `genui.renderable` | An assistant renders inline only components the catalogue marks renderable | A | B | FEAT-007 GEN-01, ADR-023 (own) |
| `genui.review-prefill` | Values the AI pre-fills in an inline form or wizard are editable and are submitted only by the user's own action | A, Ag | Au | APL (keep people in control), CUA (permission to proceed) |
| `genui.keep-input` | Regenerating an answer never silently discards what the user typed into its inline UI | A | R | APL (refine without losing work); own |
| `genui.history` | A submitted inline component stays readable in the conversation, showing what was submitted, and can no longer be changed | A | R | own (FEAT-007 AGT-T-04 records choices) |

Inline patterns are also checked with their own FEAT-008 rules at the size
class of the conversation region (FEAT-011 AIB-03).

### Declaration and voice

| ID | Statement | Roles | Checks | Sources |
|---|---|---|---|---|
| `ai.declared` | A screen that shows AI content declares its AI role in the blueprint | (any) | Au | own (ADR-028) |
| `ai.user-initiates` | Labels keep the user as the one who starts an action ("Summarize", "Summarize with Assistant"), not the AI ("Assistant, summarize") | G, A, Ag | L | MSL (built for intent) |

### Adaptive Cards

These apply to Adaptive Cards rendered on `assistant` and `agent` screens
(ADR-029). `checkCard` runs them on a payload, and the audit checks the
rendered card with the rest of the page.

| ID | Statement | Roles | Checks | Sources |
|---|---|---|---|---|
| `card.actions-few` | A card offers few primary actions, usually one to three and never more than six | A, Ag | C, R | TMS (anatomy; actions), ACH |
| `card.wrap` | Text blocks and choice labels wrap, so text is not cut off on a narrow screen | A, Ag | C | TMS (text), ACH |
| `card.input-label` | Every input has a label of its own; a placeholder is never the only label | A, Ag | C, Au | CSA (label property) |
| `card.input-error` | An input that validates (required, pattern, range) says what is wrong in an error message | A, Ag | C | CSA (errorMessage) |
| `card.heading` | A card with more than its title marks the title as a heading | A, Ag | C | CSA (heading style), TMS (anatomy: header) |
| `card.columns-few` | A column layout uses few columns (at most three) and no fixed widths wider than a compact screen allows | A, Ag | C | TMS (column layouts) |
| `card.narrow-first` | A card is laid out for the narrowest width it will show at, and still works wider; it never scrolls sideways | A, Ag | Au, R | TMS (best practices) |
| `card.reading-order` | The order the card is read and tabbed in matches the order it is seen in | A, Ag | R | CSA (logical tab order) |
| `card.image-alt` | Every informative image has alternative text | A, Ag | C | W3C (1.1.1), CSA |
| `card.image-transparent` | Images use transparent backgrounds so they suit light and dark themes, and text never sits on a colour that hurts reading | A, Ag | R | TMS (images) |
| `card.action-titles` | Action titles say what they do; never "Click here" or "Submit" alone where the outcome is unclear | A, Ag | C | CSA (descriptive titles) |
| `card.no-hidden-inputs` | Inputs, above all validated ones, are not hidden behind a toggle; if one must be, the toggle says what it shows | A, Ag | C | CSA (isVisible caution) |
| `card.version` | A card declares a schema version the host supports (1.6 or lower) and gives a fallback for anything outside it | A, Ag | C | ACP (interoperability), own (ADR-029) |
| `card.sparingly` | An agent sends a card only when it helps; cards that scroll out of view lose their use | A, Ag | R | TMS (frequency) |
| `card.high-impact-marked` | An action that pays, sends, deletes or publishes is marked high-impact so the host asks for approval | A, Ag | C | own (ADR-029), APL (confirm significant actions) |

Total: 47 rules: 30 with an automated check (blueprint, audit, lint or
card) and 17 review only.

*[Build note 2026-10-21 — FEAT-011 step 1]* In `guidelines/rules.json`:
- `ai.user-initiates` also cites ADR-028 (own). Its only source above was
  MSL, which FEAT-011 AIP-03 does not allow to stand alone;
  `check-rules` now fails a rule whose only sources are Microsoft Learn's
  agent pages.
- `genui.keep-input` and `genui.history` cite FEAT-007 (GEN-04, AGT-T-04)
  for "own".
- Until the audit checks, the lint rule and `checkCard` are built, a rule
  whose only automated checks are of those kinds carries a `review` check
  with its own ID, so `check-rules` (which requires every named check to
  exist) passes. Each later step replaces it with the real check.

## Checks

| Kind | Where | What it reads |
|---|---|---|
| Blueprint | `packages/ui/blueprint` (beside FEAT-008's checks) | `screens[].ai`; inline patterns' own rules at the conversation region's size classes |
| Audit | `packages/audit/inspect.mjs` (new checks `ai-*`, `agent-*`, `genui-*`) | Elements with `data-piq-ai` (CONTRACT-005 *AI markup*); their labels, controls and ARIA state |
| Lint | `packages/ui/lint/eslint.mjs`: `ux-builder/ai-neutral-voice` | JSX text and string attributes |
| Card | `packages/ui/adaptive-cards`: `checkCard` (also MCP `check_card`) | A card payload, against the vendored 1.6 schema and the `card.*` rules |
| Assessment | `packages/audit/assess` (FEAT-009) | The manifest's AI journeys and scenarios; the AI rules and review rules as heuristics |
| Component | FEAT-007's components and their tests | They emit the markers and satisfy `ai.stop`, `ai.correct`, `agent.approve-high-impact`, `genui.keep-input`, `genui.history` |

## Sequence

1. CONTRACT-005 and CONTRACT-004 amendments; the rule schema's `aiRole` and
   licence values.
2. Rule data for the 47 rules; generated guidance; `get_rules` roles
   (US-076).
3. Blueprint `ai` and its checks (US-077, US-080 blueprint part).
4. Markers in FEAT-007's components as they are built, and the audit checks
   (US-078, US-079, US-080 audit part).
5. The lint rule (US-081).
6. The Adaptive Cards renderer, actions and approvals, and `checkCard` (US-083 to US-085).
7. The assessment's AI journeys and scenarios (US-082).

## Testing

- The Adaptive Cards samples for schema 1.6 (MIT): each renders with SDK
  widgets, passes the audit, and passes `checkCard`, or fails it with the
  expected rule.
- Fixture apps: an agent screen and an assistant with inline UI, each with
  a clean twin and a twin with one seeded defect per automated rule.
- Rule data: `check-rules` (sources, licences, no quotes).
- The FEAT-008 performance and determinism tests, with AI fields.
