---
"@ux-builder/audit": minor
---

The assessment gains a heuristic inspection pass (`assess heuristics`, `heuristics.json`: every walked screen against Nielsen's ten heuristics, error prevention and recovery, information hierarchy and navigation complexity; `validate-report` fails a missing entry), an information-hierarchy check (`assess hierarchy`, also on exploratory prototype pages), and agent-measured task metrics (`assess metrics`, `metrics.json`, shown in the report with the statement that agents navigate differently from people). Walkthrough steps gain `screen`, `at`, `failed`, `notFound` and `error`; findings gain `source: agent | human | design-team` (FEAT-018).
