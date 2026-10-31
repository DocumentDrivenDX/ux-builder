---
ddx:
  id: ADR-042
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-037
    - kind: informed_by
      to: ADR-040
    - kind: informed_by
      to: ADR-041
    - kind: informs
      to: CONTRACT-008
---

# ADR-042: Every step ends with a prototype; the person continues, revises or has the agent finish

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-31 | **Accepted** 2026-10-31 (operator: generate a prototype at the end of each step, run an audit and usability round on it before showing it, assume a default theme, and let the person stop and have the rest generated) | Operator | FEAT-018 GDL-84, GDL-85, US-163, US-164, CONTRACT-008 | High |

## Context

In VIP List session 1 (28–29 October 2026) the person first clicked a
prototype after about 148 active minutes, against the 24 the guide
promised and its own 30-minute target. Before that they gave 12 approvals,
5 corrections and saw 8 approvals reopened. One story was reopened only
because the person's real decision was visual and came out once they saw
the screen. The session ended on a theme release the person had to chase.

The person's own review and the guide's instrumentation agree: too much
effort before any visual reward, and an ending that handed the person a
dependency. The cause is the loop's shape. The first thing the person can
click arrives at step 6; wireframes and prototypes wait for the modality
(step 5, GDL-80); and the app waits for a theme (GDL-81).

## Decision

1. **A prototype ends every step.** At the end of each of the eight steps
   the agent generates a step prototype (`ux-builder-design prototype
   --step`) into `docs/ux-builder/prototypes/step-<n>/`. It is built from
   what the person has confirmed, plus the agent's assumptions for every
   later step, each recorded as an assumption.
2. **Defaults instead of gates.** Until the person chooses, the step
   prototype assumes responsive web, the compact, medium, expanded and large
   size classes, and the frame ADR-041 recommends from the destinations. It uses
   the `plain` theme, light or dark as the agent infers from the product
   (dark for a nightlife app). Each default is an assumption. Step 5 still
   asks the modality, and the build still asks the theme, as confirmations.
   A brand theme not yet released never blocks: the agent owns the swap.
3. **One audit and usability round before it is shown.** The agent runs
   the check (`prototype --step --check`): the UI audit over every page of
   the prototype and the deterministic heuristics (information hierarchy,
   navigation complexity, error handling); from step 5, the full journey
   walk too. It fixes what it can, regenerates and checks once more, then
   shows the prototype with what was found, fixed and left.
4. **The person decides, three ways.** `ux-builder-design step decide`
   records *continue* (the next step), *revise* (rework this step and
   prototype again) or *finish* (stop being guided). A core checkpoint
   that closes the step is answered by the same decision.
5. **Finish for me.** On *finish*, the agent drafts everything the later
   steps would produce, and `ux-builder-design finish` writes every
   downstream ux-builder and HELIX artifact. HELIX documents are applied
   directly, marked assumed, overriding ADR-040's rule that HELIX changes
   only through proposals the person accepts, on this path alone. A summary
   says what was confirmed, what was assumed, what to check first and what
   was not done. Checkpoints the finish passes are recorded as skipped,
   never as passed.

## Alternatives Considered

| Option | Evaluation |
|---|---|
| A prototype only after step 2 or 3 | Fewer prototypes, but the first reward still comes after the longest steps. Rejected |
| Keep the modality and theme as gates, prototype after them | Keeps the 148-minute wait. Rejected |
| Full journey walk on every step's prototype | Most thorough, but adds minutes to step 1. Rejected for steps 1 to 4 |
| Finish leaves HELIX changes as proposals for one batch approval | Keeps governance, but the person chose to stop being asked. Rejected for this path |

## Consequences

| Type | Impact |
|---|---|
| Positive | The person reacts to a screen from step 1; questions can be asked against it; stopping early still yields a full, consistent set of documents |
| Negative | Each step costs agent time to generate and check a prototype; HELIX documents can hold assumed content the person has not seen |
| Neutral | Exploratory prototypes of alternatives (ADR-037) and the validated prototype stay as before |
