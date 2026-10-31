---
"@ux-builder/design": minor
"@ux-builder/ui": minor
---

Finish for me (US-164, ADR-042): `ux-builder-design finish --answer "<their words>"` writes everything downstream from the agent's draft when the person stops being guided: the brief, wireframes, a step prototype and its check, a test kit, and the HELIX documents, applied directly and marked `ux-builder.assumed: true` with a note under the title. It refuses a blueprint with errors or a job no task serves, skips the core checkpoints not answered (never passes them), and writes `docs/ux-builder/finish-summary.md`: what the person confirmed, what was assumed, what to check first, what was not done. `status` says the design was finished with assumptions. `@ux-builder/ui` exports `./blueprint/wireframes`.
