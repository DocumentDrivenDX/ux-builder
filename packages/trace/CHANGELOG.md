# @ux-builder/trace

## 0.2.0

### Minor Changes

- eb4111f: Decisions can carry the five answers an addition needs (FEAT-018): `goal`, `without`, `simplest`, `assumptions` and `validation`. `ux-builder-trace decide --kind addition` and MCP `record_decision` with `kind: "addition"` refuse an addition with one missing. Checkpoint answers are recorded as decisions with `decisionKind: "checkpoint"`.

### Patch Changes

- db0c69e: From trying the guided design loop end to end: `ux-builder-blueprint check` reads app.blueprint.json when no file is given, like the other commands; an exploratory prototype's own buttons and navigation lead where the blueprint says, not only the prototype bar's links; `ux-builder-trace decide` accepts `--assumption` as well as `--assumptions`.
