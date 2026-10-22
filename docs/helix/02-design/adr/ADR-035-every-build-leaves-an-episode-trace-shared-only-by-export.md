---
ddx:
  id: ADR-035
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: ADR-023
    - kind: informed_by
      to: ADR-026
    - kind: informs
      to: FEAT-016
    - kind: informs
      to: CONTRACT-007
---

# ADR-035: Every build leaves an episode trace in the app, shared back only by export

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-22 | **Accepted** 2026-10-22 (operator: "having the full train of thought from the app back to the ux-builder when a new app is created or the ui/ux of an existing app is updating, we can learn from it and optimize"; the trace is committed with the app; full transcripts; every app, clients' included) | Operator | ADR-023, ADR-026, FEAT-016, CONTRACT-007 | Medium |

## Context

ux-builder records the two ends of a build well: the intent (HELIX stories,
the blueprint) and the outcome (the audit's `report.json`, the assessment's
run package and `assess compare`). It records nothing in between:
- what the MCP server told the agent;
- which checks failed on the way, and how often;
- what the agent decided and why;
- the agent's transcript.

That middle is what shows where ux-builder's guidance, rules, components and
starter fall short.

ADR-023 rule 8 forbids telemetry of any kind. The PRD forbids committing
anything client-confidential to this repository. The operator wants every
app to feed the learning, clients' apps included, with full transcripts.

## Decision

1. **An episode per build.** Every app creation and every UI or UX change is
   an episode, `E-<yyyymmdd>-<slug>`.
   - It is opened by `create-app`, by `ux-builder-trace start`, or by the
     MCP tool `start_episode`.
   - It names its goal (story, screen and journey IDs), its trigger, and the
     agent and model.
   - Commits made in it carry a `UX-Episode: <id>` trailer.
   - A tool event with no open episode goes to a per-branch "unscoped"
     episode, and the trace says so.
2. **A trace committed with the app.** Each episode is recorded in
   `.ux-builder/trace/<episode>.jsonl` (CONTRACT-007), committed like the
   blueprint. ux-builder's own tools append its events:
   - `create-app` writes `created`;
   - the MCP server writes `guidance` for every call;
   - lint, `check:blueprint`, `checkCard` and the audit write `check`,
     failures included;
   - the episode's end writes `change` and `outcome`.
   Events hold IDs, counts and short text, never source code.
3. **Decisions, not hidden reasoning.**
   - The agent records its choices through the MCP tool `record_decision`:
     what it chose, the options it considered, why, and the rule or story it
     relied on.
   - The app's `AGENTS.md` and the skill tell it to record one at every
     pattern choice, every departure from guidance and every workaround.
   - The raw reasoning a model may produce internally is not relied on: it
     is not always available, and it is not reviewable. The full transcript
     (rule 4) carries everything the agent showed.
4. **The full transcript, with secrets masked.**
   - Each episode keeps the agent's full transcript in
     `.ux-builder/transcripts/<episode>/`, committed with the trace.
   - For Claude Code, `create-app` installs a session-end hook in the app's
     `.claude/settings.json` that runs `ux-builder-trace attach-transcript`.
   - Other agents import a transcript with `--file`.
   - Before anything is written, secrets are masked: keys, tokens, `.env`
     values, and the app's `evidence.redact` patterns.
5. **Shared only by export.**
   - `ux-builder-trace export` writes a bundle of chosen episodes, with
     their transcripts, redacted again and checked against its schema.
   - It shows its contents before writing the bundle.
   - ux-builder never sends anything. The owner chooses where the bundle
     goes. ADR-023 rule 8 stands unchanged: an export is a person's act,
     not telemetry.
6. **A private learning store.**
   - Bundles from every app, clients' included, go to a private learning
     store: a private repository or folder that Synaptiq controls, never
     this one.
   - `ux-builder-learn` reads the store and writes a learning report, beads
     and HELIX proposals for ux-builder. It also turns episodes into
     evaluation tasks that replay the goal against a new SDK version.
   - Only aggregated results enter this repository: rule IDs, component
     names, counts and paraphrased lessons, with no client content.
7. **One package.**
   - `@ux-builder/trace` holds the episode, event and export code, and the
     `ux-builder-trace` command.
   - create-app, the MCP server, the lint plugin and the audit use it.
   - The learning tool stays in this repository's `tools/`.

## Alternatives Considered

| Option | Evaluation |
|---|---|
| Telemetry: tools report usage to a Synaptiq service | Contradicts ADR-023 rule 8, and would send client content without a person choosing to. Rejected |
| Link to the agent's transcript only | The operator chose full transcripts. A link breaks when the file moves, and can't travel in an export. Rejected |
| Keep the trace local and ignored by git | The operator chose to commit it, so it can be reviewed beside the code and survives a new clone. Rejected |
| OpenTelemetry spans as the format | Heavier than a JSONL event log for a file in a repository. CONTRACT-007's events map onto spans if a team wants to export them that way later. Deferred |

## Consequences

- Positive:
  - Every build can be reviewed: why each screen looks the way it does,
    what ux-builder said, and what it took to pass.
  - Learning works across apps, and ux-builder's shortfalls become
    measurable signals rather than anecdotes.
  - Recorded episodes supply the graded agent runs that US-014-AC4 and
    US-031-AC5 wait on.
- Negative:
  - Transcripts are large, and they can hold sensitive text that masking
    misses. Committing them is the app owner's choice, so
    `ux-builder-trace` can be told not to keep transcripts (`--no-transcripts`
    when the episode opens, or `"transcripts": false` in `.ux-builder/config.json`).
  - The export preview, and the private store, are where a person
    confirms nothing confidential leaves.
  - Agents other than Claude Code need their transcript imported by hand
    until each has a hook.
