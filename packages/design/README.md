# @ux-builder/design

The guided design loop (FEAT-018, CONTRACT-008): an AI agent leads a
designer or developer through designing an app's UX, and stops for the
person's decision at each checkpoint. The agent does the reasoning; this
package does the deterministic work.

New apps from `npm create @ux-builder/app` get it already.

```sh
npm install -D @ux-builder/design
npx ux-builder-design init          # an existing app; --mcp also writes .mcp.json
```

Then, in Claude Code, type `/ux-builder-design`.

- **CLI first, MCP optional.** Every capability is a `ux-builder-design`
  command with `--json` output and an exported function. The skill drives
  the CLI through the agent's shell; the ux-builder MCP server, when
  configured, wraps the same functions (ADR-036).
- **Local only.** It makes no network request and calls no model. The
  tests run with every network API made to throw.

## Commands

Every command takes `--app <dir>` and `--json`. Exit codes: 0 done, 1 a
check failed, 2 bad input or a refusal. `npx ux-builder-design --help`
lists each one's options.

| Stage | Commands |
|---|---|
| Set up | `init [--mcp]`, `status`, `state get [<path>]`, `state set <path> <json>`, `state checkpoint <id> --answer …`, `mode full\|change` |
| Define | `baseline` (an existing app's first session), `brief`, `evidence add\|list`, `evidence excerpt add`, `validate` |
| Explore and decide | `decision add\|status`, `rubric [--alternative <name>]`; alternatives, scores, comparisons and prototypes come from `ux-builder-blueprint` |
| Build and change | `ready [--for testing\|production]`, `trace <id>`, `impact "<change>" [--apply --set <file>]` |
| Validate with people | `test-kit`, `observe import <sheet> --kit TK-<n>`, `transcript add <file> --session <id> --consent-confirmed`, `report`, `route <F-id>...` |
| Learn from production | `insights <events.jsonl>`, `diagnose --insight …`, `experiment start\|end` |

`init` refuses when a design state exists. In an app without
`@ux-builder/ui` it still works, and says the validated prototype and the
audit need the SDK. `<path>` is a field, an index or `[+]` to append:
`state set 'assumptions[+]' '{"text":"Location is available"}'` adds an
assumption with the next `A-<n>` ID, status `assumed` and no evidence.

The guide writes only under `docs/ux/`, `.ux-builder/`, `prototype/`,
`helix-proposals/`, its own skill, `.mcp.json` and the blueprint files.
HELIX changes are always proposals (`helix-proposals/`) the person applies.
People in tests appear only by pseudonym; a real name a sheet gives is kept
in `.ux-builder/participants.local.json`, out of git, and transcripts are
analysed only after consent is confirmed for the session (ADR-039).

## The design state

`.ux-builder/design-state.json`, committed with the app, checked against
[`schema/design-state.schema.json`](schema/design-state.schema.json) on
every read and write, and written in a stable key order so git can merge
it.

## The skill

[`skill/ux-builder-design/SKILL.md`](skill/ux-builder-design/SKILL.md): the
standing objective, how to open a session, the four activities, what the
guide draws on, its eight capabilities, and how to validate with people
and learn from production.
