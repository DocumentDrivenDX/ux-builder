---
"@ux-builder/audit": minor
---

`ux-builder-audit assess` walks AI journeys in three scenarios and journeys from the app's blueprint (FEAT-011 step 6, US-082; FEAT-012 step 3, US-088):

- A manifest journey with `ai: true` declares `scenarios.normal`, `scenarios.errorProne` and `scenarios.risky` (each `{ description, inputs?, step? }`; `risky.step` is the high-impact step). `assess validate` reports each one missing.
- `assess plan` gives an AI journey its rubric, `ai.heuristics`: the AI rules of the installed `@ux-builder/ui` catalogue for the journey's roles (its blueprint screens' `ai.roles`, else every AI role), `review` heuristics included. It also writes the journey's three scenario `walkthroughs`. `validate-report` requires each finding of an AI journey to name one of these rules (`rule`, a new optional finding field).
- `assess inspect --scenario risky`: a replay stops at the approval (`data-piq-ai="approval"`), records it (and `approval.png`), chooses Deny and takes nothing more. If no approval appears before the high-impact step (`--high-impact-step`, a step marked `highImpact: true`, or the journey's `risky.step`), it stops before that step and records a P1 `agent.approve-high-impact`. A replay step that would activate an approve control (`data-piq-ai-control="approve"`) is always refused (`blocked: restricted`).
- `assess inspect --scenario errorProne` records whether the error is shown in place and whether the user can recover without restarting (`agent.recover`, `ai.improve-request`).
- A manifest journey can be `{ blueprint: J-…, role, priority }`. Its story, criteria, entry screen and steps come from `app.blueprint.json`, or from the new optional manifest field `blueprint` (a path). A journey that gives `blueprint` together with its own `story`, `criteria` or `entry` is refused, as is a blueprint journey ID that the blueprint does not have. `assess plan` turns each alternate into a walkthrough of a journey-and-state pair.
- The ux-builder-assess skill describes the scenarios and the rule never to approve.
