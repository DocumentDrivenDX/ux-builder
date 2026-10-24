---
"@ux-builder/trace": minor
"@ux-builder/mcp": minor
---

Decisions can carry the five answers an addition needs (FEAT-018): `goal`, `without`, `simplest`, `assumptions` and `validation`. `ux-builder-trace decide --kind addition` and MCP `record_decision` with `kind: "addition"` refuse an addition with one missing. Checkpoint answers are recorded as decisions with `decisionKind: "checkpoint"`.
