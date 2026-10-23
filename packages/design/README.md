# @ux-builder/design

The guided design loop (FEAT-018, CONTRACT-008): an AI agent leads a
designer or developer through designing an app's UX, and stops for the
person's decision at each checkpoint. The agent does the reasoning; this
package does the deterministic work.

**Status:** being built (FEAT-018 phase 1). The package is private until
phase 1 is complete; nothing here is published yet.

- **CLI first, MCP optional.** Every capability is a `ux-builder-design`
  command with `--json` output and an exported function. The skill drives
  the CLI through the agent's shell; the ux-builder MCP server, when
  configured, wraps the same functions (ADR-036).
- **Local only.** It makes no network request and calls no model. The
  tests run with every network API made to throw.

## Commands built so far

```sh
npx ux-builder-design status                 # where the loop stands, in plain words
npx ux-builder-design state get [<path>]     # the design state, or one field
npx ux-builder-design state set <path> <json>
```

`<path>` is a field, an index or `[+]` to append:
`state set 'assumptions[+]' '{"text":"Location is available"}'` adds an
assumption with the next `A-<n>` ID, status `assumed` and no evidence.
Every command takes `--app <dir>` and `--json`. Exit codes: 0 done, 1 a
check failed, 2 bad input or a refusal.

## The design state

`.ux-builder/design-state.json`, committed with the app, checked against
[`schema/design-state.schema.json`](schema/design-state.schema.json) on
every read and write, and written in a stable key order so git can merge
it.

## The skill

[`skill/ux-builder-design/SKILL.md`](skill/ux-builder-design/SKILL.md): the
standing objective, how to open a session, the four activities, what the
guide draws on and its eight capabilities.
