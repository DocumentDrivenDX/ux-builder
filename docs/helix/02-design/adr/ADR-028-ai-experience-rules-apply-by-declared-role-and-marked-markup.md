---
ddx:
  id: ADR-028
  type: adr
  status: proposed
  links:
    - kind: informed_by
      to: ADR-025
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: ADR-023
    - kind: informed_by
      to: ADR-026
    - kind: informs
      to: FEAT-011
    - kind: informs
      to: CONTRACT-005
    - kind: informs
      to: CONTRACT-004
    - kind: informs
      to: SD-005
---

# ADR-028: AI experience rules apply by a screen's declared AI role, and are checked in marked markup

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-21 | **Proposed** (operator's direction 2026-10-21: FEAT-011; markers yes; warnings; blueprint `ai` yes; waiver extended and counsel briefed) | Operator; legal counsel for the sources (waived for now, tracked as a bead) | ADR-025, ADR-021, ADR-023, ADR-026, FEAT-011, CONTRACT-005, SD-005 | Medium |

## Context

ADR-025 made interaction rules cited data, selected by context, size class
and input, and checked in a blueprint and by the audit. The operator asked
for AI and agent experience rules from:
- Microsoft's agent UX principles and its human-centered design guidance;
- the HAX Toolkit;
- Google PAIR;
- Apple's generative AI guidance;
- Cheng et al. (IUI '26), on agents that act on a UI.

None is openly licensed for quotation, but all can be paraphrased with
citation (SD-005 *Sources*). Three questions arise:
- how a rule knows a screen uses AI;
- how the audit knows which elements are AI;
- how to treat a chat that renders UI.

## Decision

1. **AI is a role a screen declares, not a device or a product type.** A
   rule's `when` gains `aiRole`: `generative`, `assistant`, `agent`. It
   combines with ADR-025's axes, so an embedded agent view gets both the
   view rules and the agent rules. No rule names a product ("chatbot") or
   a vendor.
2. **The blueprint declares it.** `screens[].ai` holds:
   - `roles` and `acts`;
   - `renders` (inline patterns) and `region` (the conversation region's
     size classes);
   - `highImpactActions`, each with an approval: `each` or `plan`;
   - `dataLeavesDevice` and `consent`;
   - `essential` and `fallback`.

   High-impact actions mirror destructive actions and their safeguards
   (CONTRACT-005).
3. **Markup marks AI.** The audit reads `data-piq-ai` markers (`generated`,
   `status`, `plan`, `step`, `approval`) and their companions (CONTRACT-005
   *AI markup*). The SDK's assistant and generative components (FEAT-007)
   emit them; apps with their own AI UI add them. An AI-marked element on a
   screen whose blueprint declares no AI role is itself a finding
   (`ai.declared`). The blueprint says what was meant; the markup shows what
   was built.
4. **Inline UI keeps its rules.** A pattern rendered inside a message is
   checked with its own rules at the conversation region's size class
   (ADR-021's container adaptation), plus the generated-UI rules
   (`genui.*`).
5. **Warnings first.** Every AI check is a warning, in the blueprint as
   well as the audit, for at least one minor release (as ADR-025 decision 4).
6. **Voice is linted.** `ux-builder/ai-neutral-voice` in the SDK's ESLint
   plugin warns on copy that presents the AI as a person or as the actor.
   Strings can opt out for a deliberate persona.
7. **Unjudgeable rules are `review`.** Bias, memory, change over time,
   uncertainty and sources need judgment. They reach agents through the
   guidance and the assessment's heuristics, never as audit findings.
8. **The assessment adds AI scenarios.** An AI journey in the manifest
   (CONTRACT-006) declares normal, error-prone and risky scenarios. The
   risky one ends at the approval, which is denied, never approved
   (ADR-026 decision 7).
9. **Sources are paraphrased; licences are recorded.**
   - The licence enum gains `microsoft-terms`, `CC-BY-NC-SA-4.0` and
     `CC-BY-NC-ND-4.0`. None allows quotation into the SDK's MIT/Apache
     packages; `check-rules` enforces that.
   - Microsoft Learn's preview, AI-generated agent pages may support a rule
     but never be its only source.
   - ADR-025's counsel waiver extends to these sources. The counsel brief
     lists them, and counsel's answer is a tracked bead.

## Alternatives Considered

| Option | Pros | Cons | Evaluation |
|---|---|---|---|
| App-level experience type ("chatbot", "copilot", "agent app") | Simple to declare | Hybrid apps have AI on some screens only; product names age; wrong rules for mixed screens | Rejected: per-screen role |
| Detect AI from markup only, no blueprint field | No declaration | Nothing to check before code; libraries without markers are invisible | Rejected: both, cross-checked (`ai.declared`) |
| Separate AI rule file and engine | Independent evolution | Two catalogues, two MCP tools, duplicated provenance checks | Rejected: one catalogue, a new axis |
| Errors for missing approvals from day one | Stronger safety | Breaks apps adopting the rules; inconsistent with ADR-025 | Rejected for now; revisit after one minor |
| Quote the guidance | Exact wording | Licences do not allow it in MIT/Apache packages | Rejected |

## Consequences

| Type | Impact |
|------|--------|
| Positive | AI screens are planned, built and checked like other screens; agents get cited AI rules; hybrid chats are handled by existing pattern rules; the assessment tests failure and risk |
| Negative | Apps on other AI libraries must add markers to get audit coverage; 32 more rules to maintain against fast-moving sources |
| Neutral | `rules.json`, the blueprint schema and the manifest schema gain optional fields; existing files stay valid |

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Paraphrase too close to a restrictive source (NC-SA, NC-ND, vendor terms) | Low | Medium | Own words, no quotes, `check-rules`; counsel bead; rewrite in a patch if flagged |
| Sources change quickly (the Apple page changed in June 2026) | High | Low | Review per minor release; sources carry URLs and dates |
| Markers misapplied, giving false passes | Medium | Medium | `ai.declared` cross-check; FEAT-007 component tests emit markers |
| Lint false positives on ordinary copy | Medium | Low | Narrow phrases; opt-out comment; warnings only |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| FEAT-011's success metrics | A source's major revision; an approval missed by every check in a real app |

## Concern Impact

No slot changes. `ux-interaction-patterns` and `a11y-wcag-aa` gain the AI
rules' practices. `security-owasp` already covers model output (FEAT-007).

## References

- SD-005 *Sources* (URLs, licences, checked 2026-10-21).
- ADR-025 decisions 2, 4 and 7; its *Amendment* (the waiver).
