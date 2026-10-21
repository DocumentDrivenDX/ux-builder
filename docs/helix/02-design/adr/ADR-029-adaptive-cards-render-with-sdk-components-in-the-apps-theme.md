---
ddx:
  id: ADR-029
  type: adr
  status: proposed
  links:
    - kind: informed_by
      to: ADR-023
    - kind: informed_by
      to: ADR-028
    - kind: informed_by
      to: ADR-021
    - kind: informs
      to: FEAT-007
    - kind: informs
      to: FEAT-011
    - kind: informs
      to: CONTRACT-004
    - kind: informs
      to: CONTRACT-005
---

# ADR-029: Adaptive Cards render with SDK components in the app's theme

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-21 | **Proposed** (operator 2026-10-21: render and check cards now, emit later; open-source schema; both payload formats; a marker for high-impact actions) | Operator | ADR-023, ADR-028, ADR-021, FEAT-007, FEAT-011, CONTRACT-004, CONTRACT-005 | Medium |

## Context

Adaptive Cards is the declarative card format that Microsoft's agent hosts
(Teams, Outlook, Copilot) and Bot Framework agents use to put UI inside a
conversation. Its open-source schema (1.6) and SDKs are MIT. Its
documentation in `MicrosoftDocs/AdaptiveCards` and `msteams-docs` is
CC BY 4.0. The new hub (`adaptivecards.microsoft.com`) carries the current
design guidance under Microsoft's terms.

The format's own principles say:
- card authors own the content, and the host owns the look;
- a card has no code behind it.

That is ux-builder's model: the app's theme decides the look, and nothing
from a tool result is inserted as HTML or script (FEAT-007 GEN-03).

FEAT-007 lets an assistant render catalogue components by name (GEN-01,
GEN-02). Agents written for Microsoft hosts send cards instead.

## Decision

1. **ux-builder renders Adaptive Cards with its own components.** A new
   entry, `@ux-builder/ui/adaptive-cards`, exports:
   - `<AdaptiveCard card onAction />`, which maps each element of the
     open-source schema 1.6 to an SDK widget or pattern (CONTRACT-004
     *Adaptive Cards*), so a card takes the app's theme like any screen;
   - `checkCard(card)`.

   The SDK does not use the `adaptivecards` DOM renderer. It vendors the
   MIT JSON schema to validate payloads.
2. **Open-source schema only.** Version 1.6 and earlier. Host-specific and
   hub-only elements (for example `Chart`, `Badge`, `Carousel`, `CodeBlock`,
   `Rating`) and unsupported features (`Refresh`, `Authentication`,
   templating) fall back as the format defines: the element's `fallback`,
   else dropped with a plain notice (FEAT-007 GEN-03). A card declaring a
   version above 1.6 renders its supported parts and says so.
3. **Two generated-UI formats.** An assistant may send a catalogue
   component (FEAT-007 GEN-02) or an Adaptive Card. Native components stay
   for what cards cannot express (`Wizard`, `FormPage`, `ListDetail`).
   Cards serve agents written for Microsoft hosts. Both are generated UI:
   the renderer emits ADR-028's AI markers, and FEAT-011's `genui.*` and
   AI rules apply.
4. **The theme is the host config.** Spacing, type sizes, container styles
   (`emphasis`, `good`, `attention`, `warning`, `accent`) and action styles
   (`positive`, `destructive`) map to role tokens (CONTRACT-001). Cards
   cannot set colours or fonts, and the renderer adapts to its container's
   size class (ADR-021).
5. **High-impact card actions are marked.** An `Action.Submit` or
   `Action.Execute` whose `data` carries `"ux-builder": { "highImpact":
   true, "consequence": "<what will happen>" }` gets an approval step
   before `onAction` fires (FEAT-011 `agent.approve-high-impact`). An action
   with `style: "destructive"` gets FEAT-008's destructive-action safeguard.
   `Action.OpenUrl` renders as a link marked as leaving the app.
6. **Card rules join the catalogue.** Card design guidance becomes rules
   (`card.*`, SD-005), applying to generated UI in assistant and agent
   screens. `checkCard` checks a payload before it is sent, and the audit
   checks the rendered card like any other UI.
7. **Emitting cards is deferred.** Producing card JSON and Adaptive Cards
   host config from ux-builder themes (for apps that post to Teams, Outlook
   or Copilot) is tracked as a bead. Those hosts mostly apply their own
   styling.

## Alternatives Considered

| Option | Pros | Cons | Evaluation |
|---|---|---|---|
| Use the `adaptivecards` JS renderer with a generated host config | Full fidelity, little code | Its own DOM and CSS, not SDK widgets; theme only approximated; audit and markers would not apply; last JS release 2024 | Rejected |
| Cards only, dropping native components | One format | Cards cannot express wizards, list-detail or forms with sections | Rejected: both |
| Support hub-only elements | Matches Microsoft hosts | Not in the open schema; licence and spec unclear; operator chose open source | Rejected for now |
| No marker; infer high impact from titles ("Pay", "Send") | No author work | Unreliable; approval must never depend on guessing | Rejected |

## Consequences

| Type | Impact |
|------|--------|
| Positive | Agents built for Microsoft hosts render natively in ux-builder apps, themed, accessible and checked; one set of AI rules covers both formats |
| Negative | A mapping to maintain as the schema moves; cards that rely on host-specific elements degrade |
| Neutral | A new entry point and a vendored MIT schema (recorded in `licenses/vendored.json`) |

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Schema drift beyond 1.6 | Medium | Low | Version-gated fallback; the schema is vendored by version |
| Card authors put HTML or script in text | Medium | High | Markdown subset only, sanitised (FEAT-007 CONV-06); never HTML |
| Authors omit the high-impact marker | Medium | High | `checkCard` warns on `Action.Execute` or `Action.Submit` titled with payment, send or delete verbs, as a review prompt; the assessment's risky scenario tests it |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| Every element of the 1.6 sample cards renders with SDK widgets and passes the audit; FEAT-011's success metrics | A new open-source schema version |

## Concern Impact

No slot changes. `third-party-licences`: the vendored schema (MIT) is
recorded like the other vendored code.

## References

- Adaptive Cards principles (CC BY 4.0), the Teams card design page (CC BY
  4.0, legacy), the hub's design best practices (Microsoft terms), and
  Copilot Studio's accessibility tips (Microsoft terms): SD-005 *Sources*.
- `microsoft/AdaptiveCards` (MIT): the schema.
