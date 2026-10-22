---
ddx:
  id: ADR-032
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: ADR-025
    - kind: informed_by
      to: ADR-028
    - kind: informs
      to: FEAT-014
    - kind: informs
      to: CONTRACT-004
    - kind: informs
      to: CONTRACT-005
---

# ADR-032: An app declares its modalities, and they choose its shell, components, rules and audit

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-21 | **Accepted** 2026-10-21 (operator: "the user is prompted to specify one or more modalities when the app is created and this should drive the UI/AI components used, usability rules/guidelines checked"; the near-term modalities are the web ones; native mobile and desktop are future; "go with your recommendation") | Operator | ADR-021, ADR-025, ADR-028, FEAT-014 | High |

## Context

The starter assumed a responsive web app with a sample domain, and nothing
recorded the kind of app. ADR-021 adapts screens by size class, and ADR-028
selects AI rules by a screen's role. Neither says what the whole app is.

## Decision

1. **A modality is declared per app, in the blueprint** (`supports.modalities`):
   `responsive-web`, `chat` and `hybrid-chat` now. Native `ios`, `android`,
   `macos` and `windows` are reserved for later and refused today.
2. **The starter asks for it.** It shows an interactive multi-select in a
   terminal, and takes `--modality` otherwise. It is required when it cannot
   ask, and never assumed.
3. **Modalities expand to the existing axes.** Size classes, inputs and AI
   roles come from FEAT-014's matrix, so the existing rules apply unchanged.
   One new rule axis, `when.modality`, holds what the axes cannot express
   (the `card.*` rules apply to `hybrid-chat` only).
4. **The starter is an empty shell per modality.** There is no sample domain,
   and the HELIX documents describe the shell (FEAT-010 evolved).
5. **The audit verifies the fit.** It gives a modality verdict (the right UI
   and AI components, the right rule families) and a theme verdict, each
   with evidence (FEAT-014 MOD-09, MOD-10).

## Alternatives Considered

| Option | Evaluation |
|---|---|
| Infer the modality from the code | Nothing to check before code; a new app has no code. Rejected |
| A device list ("phone", "tablet") | Contradicts ADR-021: size classes, never devices. Rejected |
| A default modality when not asked | The operator was never asked, which is the problem. Rejected |

## Consequences

- Positive: the starter, the guidance, the rules and the audit all agree on
  what the app is.
- Negative: the blueprint gains a field. Existing blueprints are read as
  `responsive-web`.
