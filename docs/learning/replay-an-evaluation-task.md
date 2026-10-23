# Replay an evaluation task by hand

How a maintainer replays an evaluation task on a newer SDK and records the
result (FEAT-016 TRC-11, US-111-AC2). This is the procedure until a replay
runner exists (AR-2026-10-22 D-5, bead `ux-builder-9f2522e0`).
`node tools/learn.mjs replay-result` checks the result file against the
format below and compares it with the original outcome.

A task is one finished episode from an owner's exported bundle:
`<out>/evals/<episode>.json`, written by `npm run learn -- --evals`. It holds
the goal, the starting commit, the modality, the SDK the original used, the
patterns it used and the outcome to beat.

## Before you start

- **You need the app's source at the starting commit.** A bundle holds the
  trace, not the code. Replay only an app whose owner has given you its
  repository, or ask the owner to run these steps. Otherwise skip the task
  and say so in the grade's notes.
- **Work outside this repository.** Tasks, goals and results are client
  content (ADR-035 rule 6). Keep them in the private learning store or a
  scratch folder beside it. `learn.mjs` refuses an output inside this
  checkout.
- **One task, one agent, one session.** Give the agent the goal and nothing
  else: not the original transcript, decisions or diff. A replay that saw
  the original's answer measures nothing.

## Steps

1. **Check out the starting commit** into a new folder:

   ```sh
   git clone <app repository> replay-<episode> && cd replay-<episode>
   git checkout <task.startCommit>
   ```

2. **Install, then move to the SDK under test.** Use the same versions for
   every package you upgrade, and record them:

   ```sh
   npm ci
   npm install @ux-builder/tokens@<v> @ux-builder/ui@<v> @ux-builder/audit@<v> @ux-builder/trace@<v>
   npx playwright install chromium
   ```

   Commit the upgrade on its own (`Replay: SDK <v>`), so the agent's change
   starts from it.

3. **Open the replay's episode,** with the task's goal and the agent's
   identity. Copy the stories, screens and journeys from `task.goal`:

   ```sh
   npx ux-builder-trace start --goal "<task.goal.text>" --story US-<n> --screen <id> \
     --agent <name> --model <model id>
   ```

4. **Run the agent once, on the goal alone.** For example, with Claude
   Code: `claude -p "<task.goal.text>"` in the folder. The app's `AGENTS.md`
   gives the agent the SDK's guidance and asks it to record its decisions
   and end its commits with the `UX-Episode:` trailer. Answer the agent's
   questions only with "use your judgment". Stop after one session, or
   after 60 minutes, whichever comes first.

5. **Run the checks once more,** as the app's CI does, so the trace ends
   with them: `npm run check:blueprint`, `npm run lint`, then
   `npm run audit`. If the original outcome has an assessment, run the UX
   assessment on the same journeys too (`ux-builder-assess`), and
   `assess compare` it with the app's previous run.

6. **Close the episode:**

   ```sh
   npx ux-builder-trace end --status done [--assessment ux-assessment/<run>]
   ```

7. **Write `result.json`** from the replay's own trace,
   `.ux-builder/trace/<replay episode>.jsonl`, as the table below says.
   Leave out a field you cannot fill; never guess one.

8. **Compare and grade,** from the learning store:

   ```sh
   node tools/learn.mjs replay-result --task evals/<episode>.json --result results/<episode>.json
   node tools/learn.mjs grade --tasks evals --results results
   ```

   `replay-result` exits 1, naming each problem, if the result does not
   follow the format.

## The result file

```json
{
  "v": 1,
  "task": "<task.task>",
  "sdk": { "@ux-builder/ui": "0.10.0", "@ux-builder/tokens": "1.7.0" },
  "agent": { "name": "claude-code", "model": "<model id>" },
  "checksToGreen": { "lint": 1, "blueprint": 1, "audit": 2 },
  "audit": { "status": "warn", "findings": { "modal.dismiss": 1 } },
  "assessment": { "open": [{ "id": "F-1", "rule": "modal.dismiss" }] },
  "lint": { "findings": [{ "ruleId": "ux-builder/no-hard-coded-values", "count": 1 }] },
  "components": 18,
  "patterns": ["ListDetail", "FormPage"],
  "layoutCss": 0
}
```

| Field | Required | Where it comes from |
|---|---|---|
| `v` | yes | `1` |
| `task` | yes | The task's `task` (the original episode's ID) |
| `sdk` | yes | The replay's `start` event, `sdk` |
| `agent` | yes | The replay's `start` event, `agent` (`{ name, model }`) |
| `checksToGreen` | yes | The replay's `outcome` event, `checksToGreen`: for each check, the attempt on which it first passed, or `null` if it never did |
| `audit` | yes | `findings`: the `outcome` event's `audit.findings`. `status`: the last `audit` check event's `status` |
| `assessment` | only if the task's outcome has one | `{ open }`: the findings `assess compare` classes `new`, `persistent` or `regressed`, each `{ id, rule }`. Otherwise `null` |
| `lint` | for `grade` | The last `lint` check event's `findings`, each `{ ruleId, count }` |
| `components` | for `grade` | Counted by hand in the agent's diff: each UI element the change renders, an SDK component or one the app built (US-014-AC4) |
| `patterns` | for `grade` | The `@ux-builder/ui/patterns` components the change uses |
| `layoutCss` | for `grade` | Counted by hand: CSS rules the change wrote for layout (position, display, grid or flex placement, gaps, widths) that a pattern or layout primitive should give. No lint rule counts this yet (`ux-builder-48ef3d59`) |

`replay-result` and `grade` read only these fields. A count you leave out is
unknown: `grade` reports it as unknown, not as zero.
