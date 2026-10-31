---
"@ux-builder/design": minor
---

Every guided step ends with the person's decision (US-163): `ux-builder-design step decide continue|revise|finish --answer "<their words>"`. It is refused until the step's prototype has been checked twice (or the second round recorded as nothing to fix). Continue answers the core checkpoint the step closes and moves to exactly the next step, so step 4 leads to step 5; revise keeps the step and marks its prototype stale; finish names `finish`. The decision is a turn in the metrics, and the first one marks the prototype milestone. The overview says each step ends with a prototype and the three choices.
