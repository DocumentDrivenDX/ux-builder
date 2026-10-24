# Writing a production insights

What production data says about each journey: completion, abandonment by step, failed searches, time per step, and support and feedback matched to journeys. Read from files the owner exported; ux-builder fetches nothing (ADR-038).

Report the numbers ux-builder-design insights computed; do not add ones it
did not. In Diagnosis, give more than one explanation for each problem and
say what would tell them apart. Propose a change only as a hypothesis.

Use `template.md`; `example.md` shows a finished one. `ux-builder-design validate` checks it.
