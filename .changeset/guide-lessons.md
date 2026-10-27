---
"@ux-builder/design": minor
"@ux-builder/audit": minor
"@ux-builder/ui": minor
"@ux-builder/create-app": minor
"@ux-builder/mcp": patch
---

Lessons from the first guided session (FEAT-018 GDL-82). `ux-builder-design explain <ID>` says what an ID such as U-1, J-1, J-find, T-2 or BR-1 names and where it lives, and `explain ids` lists every kind; the overview mentions them and the guide never shows a bare ID. HELIX stories are read without a type tag, and a near-miss tag such as `user-story` is read as `user-stories` and reported; the guides never hand the person a command to edit HELIX or guess a HELIX field. Asked for an audit, the guides ask whether the person wants the UI audit, the usability assessment, or both. The assessment's manifest and runs and the UI audit's report now live under `docs/ux-builder/` (`ux-assessment.yml`, `assessments/`, `audit-report/`), the manifest's paths still relative to the app; an app that keeps them at its top keeps working, `status` lists them and `ux-builder-design migrate` moves them.
