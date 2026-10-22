# @ux-builder/trace

The episode trace (FEAT-016, ADR-035, CONTRACT-007). Every app creation and
every UI or UX change is an **episode**. ux-builder's tools write what
happened in it to the app, committed with the code:
- what ux-builder told the agent;
- every check, failures included, and how many tries it took;
- what the agent decided and why;
- the agent's full transcript, with secrets masked;
- the commits and the outcome.

Nothing is ever sent anywhere. An owner shares episodes by exporting a bundle
and choosing where it goes (ADR-023 rule 8).

```sh
npm install -D @ux-builder/trace
npx ux-builder-trace start --goal "Review screen" --story US-003 --screen review
# … build; end each commit message with  UX-Episode: E-20261022-review-screen
npx ux-builder-trace end
```

## Files in the app

| Path | Committed | What |
|---|---|---|
| `.ux-builder/config.json` | yes | `{ "transcripts": true, "redact": { "text": [regex...] } }`, both optional ([schema](schema/config.schema.json)) |
| `.ux-builder/trace/<episode>.jsonl` | yes | The episode's events, one JSON object per line ([schema](schema/event.schema.json)) |
| `.ux-builder/trace/current` | no | The open episode's ID. `GITIGNORE_LINES` is the line for `.gitignore` |
| `.ux-builder/transcripts/<episode>/<n>.<ext>` | yes, unless `transcripts` is false | Each attached transcript, secrets masked |

An episode ID is `E-<yyyymmdd>-<slug>`, the slug taken from the goal. An event
written with no episode open goes to this branch's unscoped episode,
`E-<yyyymmdd>-unscoped-<branch>`. It ends, with status `unscoped`, when the
next episode starts or `end` runs with none open.

## The command

| Command | What it does |
|---|---|
| `start --goal <text> [--story US-n]... [--screen id]... [--journey J-x]... [--agent name --model id] [--trigger change\|create] [--no-transcripts]` | Opens an episode, and prints its ID. Exits 1, naming the open episode, if one is open |
| `attach-transcript [--file f] [--agent name]` | Copies a transcript, masked, and records a `transcript` event. With no `--file`, it reads a Claude Code hook's JSON on stdin (`transcript_path`, `session_id`, `cwd`) |
| `end [--status done\|abandoned]` | Writes `change` (the commits carrying `UX-Episode: <id>`, with a warning for each commit that lacks it), `outcome` and `end` |
| `status` | The open episode, and every episode in the app |
| `export [--episode <id>]... [--since <date>] --out <file>.tgz [--yes] [--include-open]` | Lists every file and its masked count, asks to confirm, masks again, checks the schemas and writes the bundle. Exits 1, naming the file and line, if a secret pattern is left unmasked in the stored trace |
| `validate` | Checks every event against the schema, plus the `seq` order. Exits 1, naming the line |

Every command takes `--dir <app>`. Without it, the app is the nearest folder
above that has `.ux-builder/` (or else the git root).

A Claude Code session-end hook in the app's `.claude/settings.json`:

```json
{ "hooks": { "SessionEnd": [{ "hooks": [{ "type": "command", "command": "npx ux-builder-trace attach-transcript" }] }] } }
```

## The library

Other ux-builder packages call these. Each takes the app's directory first.

```js
import { openEpisode, currentEpisode, appendEvent, attemptOf, closeEpisode, mask, attachTranscript, exportBundle, validateTrace, GITIGNORE_LINES } from "@ux-builder/trace";
```

| Function | Returns |
|---|---|
| `openEpisode(appDir, { trigger, goal: { stories, screens, journeys, text }, agent: { name, model }, transcripts, slug?, sdk?, helix?, by? })` | The new episode's ID. Writes `start` and `current`. Throws `TraceError` (code `EPISODE_OPEN`, `.episode`) while one is open |
| `currentEpisode(appDir)` | The open episode's ID, or `null` |
| `appendEvent(appDir, kind, fields, { by })` | The event as written (with `v`, `episode`, `seq`, `at` and `by`), or `null`. Writes to the open episode, else to the unscoped one. Every string is masked first. **It never throws**: on a failure it warns once on stderr and returns `null` |
| `attemptOf(appDir, check)` | The `attempt` for a new `check` event: earlier runs of that check in the episode, plus 1 |
| `closeEpisode(appDir, { status, assessment?, by? })` | `{ episode, status, change, outcome, warnings }`, after writing `change`, `outcome` and `end`. With no episode open, it closes the unscoped one as `unscoped`. Throws `TraceError` `NO_EPISODE` when there is neither |
| `mask(text, { appDir })` | `{ text, count, kinds: { kind: n } }` |
| `attachTranscript(appDir, { file \| hookJson, agent? })` | `{ attached: true, episode, file, bytes, sha256, masked, kinds }`, or `{ attached: false, reason }` when transcripts are off |
| `exportBundle(appDir, { episodes, since, out, yes, includeOpen, confirm?, log? })` | A promise of `{ written, out, bundle, files, preview }`. Without `yes`, it calls `confirm(preview)`. Without either, it writes nothing. Rejects with `TraceError` `SECRET` (`.problems: [{ file, line, kind }]`), `INVALID`, `EMPTY` or `USAGE` |
| `validateTrace(appDir, { episodes? })` | `[{ file, line, message }]` |

Also exported:
- `readBundle(file)`, `readEpisode(appDir, id)`, `listEpisodes(appDir)`;
- `validateEvent`, `validateBundle`, `validateConfig`;
- `KINDS`, `CHECKS`, `TRAILER`, `BY`, `VERSION`, `SECRET_PATTERNS`.

What the tools write:
- **`check`**: `{ check: "lint"|"blueprint"|"card"|"audit", attempt: attemptOf(appDir, check), status: "pass"|"warn"|"fail", findings: [{ ruleId, severity, count }], report? }`. The audit may add `verdicts: { theme, modality: [{ modality, status }] }` and `assessment: { run: "R-…", compare: [{ rule, finding: "F-…", status: "new"|"persistent"|"resolved"|"regressed"|"not-rechecked" }] }`. `outcome` copies these.
- **`guidance`**: `{ tool, input, answer: { ruleIds, components, recipes, guidanceHash, bytes } }`.
- **`decision`**: `{ chose, considered, why, relied, departs, workaround, screen }`.

What the trace writes itself:
- **`start.commit`**: the HEAD commit when the episode opened. It is `null` outside a git repository or before the first commit; `change` then carries `parent`, the parent of the episode's first trailer commit (or `null`).
- **`outcome`**: `{ audit: { verdicts | null, findings: { ruleId: count } }, assessment: { run, compare } | null, checksToGreen }`. `audit.findings` comes from the last audit `check`, and is `{}` when there was none. `checksToGreen` counts, for each check, the runs before its first `pass` or `warn`: 0 when it passed first time, `null` when it never passed.

## Masking

Before a transcript or an event is written, and again on export, each of
these is replaced by `[masked:<kind>]`:
- private keys;
- `sk-` API keys;
- GitHub (`ghp_`…, `github_pat_`), npm, Slack and AWS (`AKIA`) tokens;
- JWTs;
- bearer and basic credentials;
- values (8 characters or more) from the app's `.env*` files;
- `config.json` `redact.text` patterns;
- the assessment manifest's `evidence.redact.text` patterns.

`export` refuses to write when a secret is found in the stored trace,
because it is in the repository too.

## Licence

MIT OR Apache-2.0
