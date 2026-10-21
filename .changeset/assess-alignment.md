---
"@ux-builder/audit": patch
---

`ux-builder-audit assess` now does what CONTRACT-006 says it does (AR-2026-10-21 C1 to C6):

- `propose` also writes `proposals/improvement-backlog.patch`. This patch proposes the backlog as an entry in the app's HELIX `improvement-backlog`: new rows in an existing instance, or a new instance drafted from the catalogue type's template. `apply-check improvement-backlog` checks the patch's target.
- `browser --manifest` and `inspect` refuse `restrictions.excludeIntegrations`. A replay takes none of its steps if any step declares a denied action, declares an action that `restrictions.allow` does not list, or leaves the origins. Each refused step is recorded `blocked: restricted`.
- `limits.runMinutes`, `limits.steps` and `limits.journeyMinutes` are enforced. `inspect` refuses a step past a limit (`blocked: limit`) and records the `walkthrough` stage `partial`. `browser --run` stops when the run's time is spent.
- When no browser answers at `--cdp`, `inspect` records the `walkthrough` stage `blocked`. When a role's `auth.env` is not set, `plan` blocks that journey's pairs as an authentication barrier and exits 1.
- `inspect` writes what `evidence.capture` names (screenshot, tree or both).
- `compare` lists the earlier baseline's failures in `comparison.json`, and the report shows them.
- `schema/evidence.schema.json` is new, and `validate-report` checks `evidence.json` against it.
- The skill tells the agent about the excluded integrations, the denied actions and the limits.
