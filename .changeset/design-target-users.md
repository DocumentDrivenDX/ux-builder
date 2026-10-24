---
"@ux-builder/design": minor
"@ux-builder/ui": patch
---

Target users are evidence-backed records (FEAT-018 GDL-77): `docs/ux/users.md` holds a row per user (`U-<n>`) with its context, needs, the jobs it holds with an importance for each, and evidence, confidence and status, checked by `validate`. The brief's Target users comes from it; blueprint tasks name the users they serve (`tasks[].users`, in the blueprint schema); the test kit's screener asks about each user and its context, scenarios say who each task is for, and the observation sheet has a `user` column, which the evaluation report breaks its measures down by; `trace U-<n>` follows a user to its jobs, tasks and journeys; `status` counts target users.
