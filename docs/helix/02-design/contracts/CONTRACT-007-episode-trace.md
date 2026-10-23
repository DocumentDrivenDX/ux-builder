---
ddx:
  id: CONTRACT-007
  type: contract
  status: draft
  links:
    - kind: informed_by
      to: FEAT-016
    - kind: informed_by
      to: ADR-035
    - kind: informed_by
      to: CONTRACT-006
---

# Contract

**Contract ID**: CONTRACT-007 — Episode trace
**Type**: data formats and command (the trace in an app, the export bundle, `ux-builder-trace`, the MCP tools that write to it)
**Version**: v1 (planned, `@ux-builder/trace` 0.1.0)
**Status**: draft — 2026-10-22, with ADR-035; amended 2026-10-22 with the build (`start.commit`, `change.parent`, the `outcome` shapes) Amended 2026-10-23 by FEAT-018: see CONTRACT-008, *Amendment to CONTRACT-007*.
**Related**: FEAT-016, ADR-035, ADR-023 rule 8, CONTRACT-004 (the MCP server and the audit), CONTRACT-006 (the assessment's run package and redaction)

## Purpose

Defines what ux-builder's tools write to an app while it is being built or
changed, and what an owner exports so that ux-builder can learn from it.

## Scope and Boundaries

- In scope:
  - the files under `.ux-builder/`;
  - the episode and its events;
  - the commit trailer;
  - the export bundle;
  - the `ux-builder-trace` commands;
  - the MCP tools `start_episode`, `record_decision` and `end_episode`.
- Out of scope:
  - the learning store's layout, which is private;
  - the agents' own transcript formats, which are stored as they are;
  - the assessment's run package (CONTRACT-006), which an `outcome` event
    references and never copies.

## Normative Surface

### Files in the app

| Path | Committed | What |
|---|---|---|
| `.ux-builder/config.json` | yes | `{ "transcripts": true, "redact": { "text": [regex...] } }` (both optional) |
| `.ux-builder/trace/<episode>.jsonl` | yes | The episode's events, one JSON object per line, in order |
| `.ux-builder/trace/current` | no (gitignored) | The open episode's ID |
| `.ux-builder/transcripts/<episode>/<n>.<ext>` | yes, unless `transcripts` is false | Each attached transcript, as the agent wrote it, secrets masked |

### Episode ID

`E-<yyyymmdd>-<slug>`. The slug is lower-case letters, digits and hyphens,
taken from the goal, and unique within the app. A tool event with no open
episode goes to `E-<yyyymmdd>-unscoped-<branch>`.

### Event

Every line has these fields:
- `v`: 1;
- `episode`;
- `seq`, counting from 1;
- `at`, an ISO 8601 time;
- `kind`;
- `by`: the tool and its version, or `agent`.

Each kind adds its own fields:

| `kind` | Written by | Fields |
|---|---|---|
| `start` | create-app, `trace start`, MCP `start_episode` | `trigger` (`create` or `change`), `goal` (`{ stories[], screens[], journeys[], text }`), `agent` (`{ name, model }`), `sdk` (package versions), `helix` (version or null), `commit` (HEAD's SHA when the episode opened, or null before the first commit) |
| `created` | create-app | `modalities`, `theme`, `options`, `files` (count), `blueprint` (hash) |
| `guidance` | MCP server | `tool`, `input` (its arguments), `answer` (`{ ruleIds[], components[], recipes[], guidanceHash, bytes }`) |
| `check` | lint, `check:blueprint`, `checkCard`, audit | `check` (`lint`, `blueprint`, `card` or `audit`), `attempt` (counts this check's runs in the episode), `status` (`pass`, `warn` or `fail`), `findings` (`[{ ruleId, severity, count }]`), `report` (path, for the audit) |
| `decision` | agent, through MCP `record_decision` | `chose`, `considered[]`, `why`, `relied` (rule IDs and story IDs), `departs` (bool: departs from guidance), `workaround` (bool: a missing component worked around), `screen` |
| `transcript` | `trace attach-transcript` | `file` (path under `transcripts/`), `agent`, `bytes`, `sha256`, `masked` (count) |
| `change` | `trace end`, or MCP `end_episode` | `commits[]` (SHAs with the trailer), `parent` (the first of them's parent, when `start.commit` is null), `files` (count changed), `screens[]` |
| `outcome` | `trace end`, or MCP `end_episode` | `audit`: `{ verdicts: { theme, modality: [{ modality, status }] } \| null, findings: { <ruleId>: count } }`; `assessment`: null or `{ run, compare: [{ rule, finding, status }] }`, status being `new`, `persistent`, `resolved`, `regressed` or `not-rechecked`; `checksToGreen`: `{ <check>: attempt }`, the attempt on which the check first passed (1 when it passed first time), null for a check that never passed. A check is green at its first `pass` or `warn` |
| `end` | `trace end`, or MCP `end_episode` | `status` (`done`, `abandoned` or `unscoped`) |

An event never contains source code, or a file's contents. `input` and
`why` are masked like transcripts.

### Commit trailer

Every commit made in an episode ends with `UX-Episode: <episode>`. The
app's `AGENTS.md` asks for it, and `trace end` lists commits that lack it.

### Masking

Before a transcript or an event is written, and again on export, these are
replaced by `[masked:<kind>]`:
- strings that look like keys or tokens (the assessment's patterns, plus
  `sk-`, `ghp_`, `npm_`, `AKIA` and JWT shapes);
- values from the app's `.env*` files;
- the app's `config.json` `redact.text` patterns;
- its manifest's `evidence.redact.text` patterns (CONTRACT-006).

### Export bundle

`ux-builder-trace export [--episode <id>]... [--since <date>] --out <file>.tgz`
writes:
- `bundle.json`: `{ v, app: { name, repoHash }, sdk, episodes: [ids], exportedAt, masked: count }`;
- each episode's `.jsonl`;
- its transcripts.

The repository's name is hashed, and no remote URL is included. Before the
file is written, the command lists every file and its masked count and asks
for confirmation (`--yes` to skip). It makes no network request.

### Commands

`ux-builder-trace` has these subcommands:
- `start --goal <text> [--story US-n]... [--screen id]... [--journey J-x]... [--agent name --model id] [--no-transcripts]`
- `attach-transcript [--file f]`: reads a Claude Code hook's JSON on stdin when no `--file` is given.
- `end [--status done|abandoned] [--assessment <run-dir>]`
- `decide --chose <what> --why <why> [...]`: a `decision`, for agents without MCP. *[Amended 2026-10-22 — integration]*
- `lint [--stylelint <glob>]... [--eslint <path>]...`: runs both linters and writes one `lint` check; a created app's `npm run lint`. *[Amended 2026-10-22 — integration]*
- `status`
- `export …`
- `validate`

### MCP tools

`@ux-builder/mcp` gains three tools:
- `start_episode`, taking the arguments of `trace start`;
- `record_decision`, taking the fields of a `decision` event;
- `end_episode`.

Every other tool writes a `guidance` event to the open episode.
*[Amended 2026-10-22 — integration]* The server's app is its working
directory, or `UX_BUILDER_APP`; the trace is the nearest `.ux-builder/` at or
above it, and with none, nothing is written until `start_episode`. An object
argument (a blueprint, a card) is recorded by its `sha256` and size only.
`check_blueprint` and `check_card` also write a `check` event.

## Error Semantics

| Situation | Result |
|---|---|
| Writing an event fails (read-only checkout) | The tool still answers, and warns once on stderr. A trace never breaks a build |
| `start` while an episode is open | Exit 1, naming the open episode (`end` it first) |
| `export` finds an unmasked secret pattern | Exit 1, naming the file and line; nothing written |
| `validate` finds a malformed line, a `seq` gap or an unknown `kind` | Exit 1, naming the line |

## Validation Checklist

- [ ] Every event validates against `packages/trace/schema/event.schema.json`.
- [ ] A fixture episode (created, guidance, failing then passing checks, a decision, a transcript, change, outcome) round-trips through `export`.
- [ ] No event or bundle in the fixtures contains source code or an unmasked secret pattern.
