---
ddx:
  id: ADR-025
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: ADR-020
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: ADR-023
    - kind: informed_by
      to: ADR-024
    - kind: informed_by
      to: screen-pattern-inventory
    - kind: informs
      to: FEAT-008
    - kind: informs
      to: CONTRACT-004
    - kind: informs
      to: CONTRACT-005
---

# ADR-025: Interaction and IA rules are cited data, checked in a blueprint before build and by the audit after

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-20 | **Accepted** 2026-10-20 (operator: "update all the relevant helix docs to prepare for implementation then develop it") | Operator; harness team for the Praxis rules; legal counsel for PRV-02 (operator waiver for the first release, 2026-10-21: see *Amendment*) | ADR-020, ADR-021, ADR-023, ADR-024, FEAT-008, CONTRACT-004, CONTRACT-005 | Medium |

## Context

| Aspect | Description |
|--------|-------------|
| Problem | Developers who are not UI specialists, and agents, build screens from SDK patterns but get no rules for how an app's screens fit together and behave: navigation by size, modality, safeguards, states, emphasis. Apple's HIG and Material 3 hold most of that guidance, as prose for designers. |
| Current State | Size classes match Material 3's five breakpoints (ADR-021). Patterns adapt by `@container` query; widgets grow to touch size under `pointer: coarse`. Agent guidance and the MCP server describe widgets, patterns and tokens. The audit checks tokens, contrast, reflow, target size and focus. |
| Requirements | Operator, 2026-10-20: use the HIG and Material 3 to drive and audit full-screen IA and interaction for non-UI developers; deliver it to external agents, including those building Praxis plug-ins; codify how a new and an existing app use it; respect the sources' licences. |
| Decision Drivers | (1) The rules must reach an agent when it plans, not only when the audit fails. (2) One rule ID in every surface. (3) Rules must apply by what can be observed (space, input, context), never by device. (4) Ship nothing the sources' licences forbid. (5) Existing apps must be able to adopt without a red CI. (6) Stay within ADR-024's boundary: nothing Praxis-specific in the SDK. |

### Licences as checked on 2026-10-20

| Source | Terms | Consequence |
|---|---|---|
| Apple Human Interface Guidelines | Apple Website Terms of Use: no copying or republishing without consent; trade dress claimed | Paraphrase and link only; no images, assets or wording |
| m3.material.io | Google Terms of Service; no open content licence shown | Paraphrase and link only |
| developer.android.com | Content License: CC BY 2.5 (code Apache 2.0) | Quotation allowed with attribution |
| W3C (WCAG 2.2, WAI-ARIA APG) | W3C Document License | Short quotation with attribution |

## Decision

1. **Rules are data.** A single source, `guidelines/rules.json` with its
   JSON Schema, holds every interaction and IA rule (FEAT-008 RUL-01). The
   catalogue generator copies it into `@ux-builder/ui/catalogue.json`, writes
   its summary into `AGENTS.md` and the skill, and the MCP server reads it from
   the installed catalogue. Recipes live beside it, in `guidelines/recipes.json`.
2. **Conditions are space, input and context.** A rule's `when` names any of
   `context` (`app`, `view`), `sizeClass` (ADR-021's five) and `input`
   (`coarse`, `fine`). No rule mentions a device, a user agent or an
   operating system.
3. **A blueprint plans the screens.** One file per app or view
   (CONTRACT-005) declares its kind, supported size classes and inputs,
   destinations and screens. The validator applies every rule whose check is
   `blueprint` and whose conditions meet the blueprint's declared support. It
   ships as `@ux-builder/ui/blueprint` and the `ux-builder-blueprint` command.
   The SDK does not generate screen code from it.
4. **The audit checks the same rules by ID.** New audit checks name the rule
   they enforce; the report carries the rule's sources. They are warnings for
   one minor release (as SDK-20's were). A findings **baseline**
   (`--write-baseline`, `--baseline`) lets an existing app fail only on new
   findings.
5. **Agents get rules where they plan.** The MCP server adds `get_rules`,
   `list_recipes`, `get_recipe`, `get_blueprint_schema` and
   `check_blueprint`; the guidance states the plan → check → build → lint →
   audit loop. The SDK does not plan from free text; the agent does.
6. **The view profile is generic.** Rules with `context: view` describe any
   MCP App view (ADR-024): no shell, navigation or brand of its own; compact
   and medium supported; one task; declared states; theme from the host.
   Praxis-specific rules live in the Praxis adapter.
7. **Provenance is checked.** Each rule cites at least one source with its
   licence and whether it is paraphrased or quoted. A quotation is allowed
   only from an openly licensed source, at most 25 words, attributed in the
   third-party notices. `npm run check` enforces this (FEAT-008 PRV-03).
8. **Adoption paths.** A new app gets a blueprint, a `check:blueprint` script
   and a CI step from the starter; an existing app runs
   `ux-builder-blueprint init`, describes its screens, and writes an audit
   baseline once.

## Alternatives Considered

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| Rules as prose in `AGENTS.md` only | Cheapest | Not checkable; drifts; no IDs | Rejected: driver 2 |
| Embed the HIG and Material text | Complete | Forbidden by their terms | Rejected: driver 4 |
| Device-based rule sets (phone, tablet, desktop) | Familiar | Wrong for resizable windows and embedded panels; contradicts ADR-021 and Material 3 | Rejected: driver 3 |
| Generate screen code from the blueprint | Fast start | Placeholder screens with fake data; duplicates the agent's job | Rejected for now; may return as a recipe-level scaffold |
| An audit tool over MCP now | Closes the agent loop | Needs Chromium beside the MCP server; heavier install | Deferred to P2 |
| A separate `@ux-builder/blueprint` package | Clear boundary | A new package needs its own first publish and trusted publisher | Rejected: an entry point of `@ux-builder/ui` suffices |

## Consequences

| Type | Impact |
|------|--------|
| Positive | Structural mistakes caught before code; one rule ID from guidance to audit; existing apps can adopt gradually; Praxis plug-ins share one profile |
| Negative | A new data file and schema to maintain; rules restated in our words can lag the sources |
| Neutral | `@ux-builder/ui` gains a command (`ux-builder-blueprint`) |

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| A paraphrase is too close to the source | Low | Medium | PRV-02; `check-rules` (licence, 25-word quote limit, credit in the notices); counsel review, waived by the operator for the first release (*Amendment*) — a paraphrase counsel flags is rewritten in the next patch |
| Heuristic audit checks misfire on custom navigation | Medium | Low | Warnings first; `data-audit-ignore`; rule IDs in findings |
| Rules lag a guideline update | Medium | Low | Sources carry URLs; a review per minor release |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| FEAT-008's success metrics | A source guideline's major revision; an agent-built example that passes the blueprint check but fails a person's review |

## Amendment *[2026-10-21 — operator waiver]*

The operator waived counsel's review of the paraphrases as a precondition for
the first release that ships rules (`@ux-builder/ui` 0.7.0), choosing to
release now and revise if counsel objects (AR-2026-10-21 A4, decision D-1).
The brief is `docs/legal/counsel-brief-interaction-rules.md`. Counsel's
review stays open: no rule quotes a source today, and a paraphrase counsel
flags is rewritten in the next patch release, with the change in its
changelog.

## Concern Impact

No concern slot changes. `e2e-framework` (Playwright) already covers the
audit checks.

## References

- FEAT-008; screen-pattern inventory; ADR-021; ADR-024.
- [Apple HIG: Modality](https://developer.apple.com/design/human-interface-guidelines/modality), [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback), [Loading](https://developer.apple.com/design/human-interface-guidelines/loading)
- [Material 3: Breakpoints](https://m3.material.io/foundations/layout/breakpoints/overview), [Canonical layout examples](https://m3.material.io/foundations/layout/canonical-examples/overview), [States](https://m3.material.io/foundations/interaction/states/overview)
- [Android Content License](https://developer.android.com/license)
