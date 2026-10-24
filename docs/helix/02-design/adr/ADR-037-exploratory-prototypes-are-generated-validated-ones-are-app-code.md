---
ddx:
  id: ADR-037
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-025
    - kind: informs
      to: CONTRACT-008
    - kind: informs
      to: SD-006
---

# ADR-037: Exploratory prototypes are generated from the blueprint; validated prototypes are app code built from the SDK

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-23 | **Accepted** 2026-10-23 (operator: accepted FEAT-018's proposed decisions D-2, D-6 and D-7). Amends ADR-025 decision 3 | Operator | FEAT-018, ADR-025, ADR-020, CONTRACT-005, CONTRACT-008 | Medium |

## Context

ADR-025 decision 3: "The SDK does not generate screen code from it" (the
blueprint). Its alternatives table rejected generating screen code "for
now", because placeholder screens with fake data duplicate the agent's job,
and said it "may return as a recipe-level scaffold".

FEAT-018 needs people to try designs, not read them: quick disposable
prototypes to compare alternatives, then a fuller prototype to test with
users. It also asks whether the guide should only design, or build too.

The product vision says ux-builder is "not a page builder or app
framework": apps own their screens' content, data, routing and logic.

## Decision

1. **Exploratory prototypes are generated.** `ux-builder-blueprint
   prototype --explore` writes a disposable, clickable prototype per
   alternative to `prototype/<alternative>/`: each screen's pattern with
   placeholder content, actions wired to their targets, a state and
   size-class switcher, each page marked as a prototype and naming the
   question it answers. It may render the same flow in more than one design
   system.
2. **They never become app code.** They live outside the app's source. The
   lint rule `ux-builder/no-prototype-import` fails any import of
   `prototype/` from the app. They are deleted or archived when their
   question is answered.
3. **The validated prototype is app code.** The agent builds the chosen
   design in the app's source, on a branch, from the SDK's patterns, in the
   app's theme, with realistic sample data. The SDK generates nothing for
   it. ADR-025 decision 3 stands for app code.
4. **Prototype is not production.** Before the validated prototype's
   branch becomes production code, `ux-builder-design ready` checks that
   every acceptance criterion it covers is cited by a test, that the audit
   reports no errors, and lists the data and error handling the prototype
   faked; then the guide asks the third core checkpoint.
5. **Design and build** (D-7). The guide designs, then builds the
   validated prototype and, in production, experiment variants (ADR-038),
   always behind checkpoints.
6. **Within the vision** (D-6). The agent builds screens with the SDK in
   the app's own code, as it does today. ux-builder still supplies
   patterns, not screens; the only screens it generates are disposable
   exploratory ones.

## Alternatives Considered

| Option | Evaluation |
|---|---|
| Static wireframes only (ADR-025 as it is) | People judge flows better by using them; FEAT-018's Experience step needs interaction. Rejected |
| Generate the validated prototype too | Duplicates the agent's job and produces fake-data screens that drift from the app, the reason ADR-025 rejected it. Rejected |
| Prototypes in a separate design tool | Leaves the SDK's patterns and themes, so what is tested is not what ships. Rejected |
| Design only; a person builds | The operator chose both (D-7). Rejected |

## Consequences

| Type | Impact |
|---|---|
| Positive | Alternatives can be tried within minutes; what users test is built from the patterns that ship |
| Negative | A second renderer path (prototype pages) to keep in step with the patterns; a new lint rule |
| Neutral | ADR-025's alternatives row "Generate screen code from the blueprint" is now partly taken up, for disposable prototypes only |
