# @ux-builder/design

The guided design loop (FEAT-018, CONTRACT-008): an AI agent leads a
designer or developer through designing an app's UX, and stops for the
person's decision at each checkpoint. The agent does the reasoning; this
package does the deterministic work.

It writes into HELIX's documents rather than keeping its own (ADR-042):
users, needs and tasks go in the PRD and the feature's Task Model,
decisions in ADRs, principles in principles.md, studies in HELIX research
plans, funnels in the metrics dashboard, always as proposals the person
applies. Experiments are DDx beads; test-session material, evaluations and
insight exports are run output in the gitignored `docs/ux-builder/runs/`.
Its own documents are the blueprint and the brief, compiled from HELIX.

New apps from `npm create @ux-builder/app` get it already. Without
`--modality` the starter makes a design folder, the guide with no app code,
and builds the app there when the design is ready, on the theme chosen then
(FEAT-018 GDL-81; see the create-app README).

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
| Follow along | `overview` (the eight steps), `step next`, `explain <term>`, `advance --until-decision` (the safe work, then the one decision the person must make next), `metrics` (`turn`, `mark`: the person's time against the targets) |
| Review | `review` by tier: foundations (brief, users, jobs, stories, rules, decisions) a table per kind (`review table <kind>`, `approve --kind <kind>`); what is built from them as one coverage map (`review map`, `approve map [--accept <exception>]`); records need no approval. `show`, `feedback`, `respond`. An approval holds until the meaning changes, and then shows the diff |
| Set up | `init [--mcp]`, `status`, `state get [<path>]`, `state set <path> <json>`, `state checkpoint <id> --answer …`, `mode full\|change` |
| Define | `intake` (the open questions, asked together; then HELIX's frame and grill), `need add`, `segment add`, `task add` (rows of the PRD's User Needs and User Segments and the feature's Task Model), `principle add`, `brief` (compiled from HELIX), `evidence add\|list --study <study>`, `evidence excerpt add`, `evidence claim add\|verify\|contradict` (each claim with its source, basis and confidence), `validate`. An existing app starts from HELIX's backfill |
| HELIX | `proposals [preview]`, `proposals apply --accepted <ids>`: every change to HELIX this package or `ux-builder-blueprint propose` proposes, applied all or nothing, a clashing ID renumbered |
| Explore and decide | `decision add\|status` (an ADR tagged area:ui, with its Validation), `rubric [--alternative <name>]`; alternatives, scores, comparisons and prototypes come from `ux-builder-blueprint` |
| Build and change | `ready [--for testing\|production]`, `trace <id>`, `impact "<change>" [--apply --set <file>]` |
| Validate with people | `test-kit --study <study>`, `observe import <sheet> --study <study>`, `transcript add <file> --study <study> --session <id> --consent-confirmed`, `report`, `route <F-id>...` |
| Learn from production | `insights <events.jsonl>` (funnels proposed to the metrics dashboard), `diagnose --insight <date>`, `experiment start\|end` (a DDx bead) |

`init` refuses when a design state exists. In an app without
`@ux-builder/ui` it still works, and says the validated prototype and the
audit need the SDK. `<path>` is a field, an index or `[+]` to append:
`state set 'assumptions[+]' '{"text":"Location is available"}'` adds an
assumption, status `assumed` and no evidence.

The guide writes only under `docs/ux-builder/` (its documents; the
blueprint and alternatives in `blueprint/`; `prototypes/`,
`helix-proposals/`, `compare/`, `drawings/`, `wireframes/`), `.ux-builder/`,
its own skill and `.mcp.json`. An app made before that layout (`docs/ux/`,
`app.blueprint.json` at the top) keeps working there; `ux-builder-design
migrate [--dry-run]` moves it with `git mv` and rewrites the app's
references, and proposes the design documents ux-builder used to keep into
HELIX. Before any wireframe or prototype the guide asks the person which
modalities and screen sizes the app is for and, for responsive web, its app
frame: just the screen, a top bar, navigation across the top or a side menu
(`ux-builder-design modality --frame`).
HELIX changes are always proposals (`docs/ux-builder/helix-proposals/`) the
person applies.
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
