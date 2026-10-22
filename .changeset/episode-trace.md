---
"@ux-builder/trace": minor
---

New package `@ux-builder/trace` (FEAT-016, CONTRACT-007, US-105, US-108, US-109): the episode trace an app keeps while it is built or changed, committed with the app, and shared only by an export its owner chooses to make.

- `ux-builder-trace start`, `end`, `status` and `validate`. Each build is an episode, `E-<yyyymmdd>-<slug>`, with a goal (stories, screens, journeys), a trigger and the agent and model. `end` records the commits carrying `UX-Episode: <id>`, warns about those without it, and records the outcome: the last audit's verdicts and findings per rule, and how many runs each check took to pass. Events written with no episode open go to a per-branch unscoped episode.
- `ux-builder-trace attach-transcript` copies an agent's transcript into `.ux-builder/transcripts/<episode>/`, masked, from a Claude Code session-end hook's JSON on stdin or `--file`. Masking covers keys, tokens and JWTs, `.env` values, and the app's `redact.text` and `evidence.redact.text` patterns. `"transcripts": false` in `.ux-builder/config.json` or `start --no-transcripts` turns transcripts off.
- `ux-builder-trace export` writes a `.tgz` of chosen episodes. It lists every file and its masked count, asks to confirm, masks again, and refuses to write if a secret is left. The repository's name is hashed, no remote URL is included, and it makes no network request.
- A library for ux-builder's other tools: `openEpisode`, `currentEpisode`, `appendEvent` (never throws), `attemptOf`, `closeEpisode`, `mask`, `attachTranscript`, `exportBundle`, `validateTrace` and `GITIGNORE_LINES`. It ships JSON Schemas for events, the bundle and the config. Dependencies: `ajv` and `yaml`.
