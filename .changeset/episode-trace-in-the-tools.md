---
"@ux-builder/create-app": minor
"@ux-builder/mcp": minor
"@ux-builder/audit": minor
"@ux-builder/ui": minor
---

The episode trace (FEAT-016, CONTRACT-007), written by the tools themselves
with `@ux-builder/trace`:

- **create-app**: a new app's trace starts with its create episode (`start`
  with trigger `create`, the agent and model from `--agent` and `--model` or
  `UX_BUILDER_AGENT` and `UX_BUILDER_MODEL`, the SDK and HELIX versions;
  `created`; the guidance written to `AGENTS.md`; the starter blueprint's
  check; then its close). The app gets `@ux-builder/trace` as a
  devDependency, a `.gitignore` that ignores only `.ux-builder/trace/current`,
  a Claude Code session-end hook in `.claude/settings.json` that attaches the
  transcript, `npm run lint` through `ux-builder-trace lint` (one lint check
  per run), and `AGENTS.md` instructions to open an episode, record each
  decision, add the `UX-Episode:` trailer and end the episode.
- **mcp**: every tool writes a `guidance` event to the open episode of the
  app it serves (its working directory, or `UX_BUILDER_APP`); `check_blueprint`
  and `check_card` also write a `check` event. New tools: `start_episode`,
  `record_decision` (`chose` and `why` required, `why` masked) and
  `end_episode`.
- **audit**: each `ux-builder-audit` run in an app that keeps a trace writes
  an `audit` check with its status, attempt, findings per rule, verdicts and
  report path.
- **ui**: `ux-builder-blueprint check` writes a `blueprint` check; the SDK's
  guidance (`AGENTS.md` and the `ux-builder-ui` skill) says how to record the
  build.
