---
"@ux-builder/design": minor
---

The whole guided session is measured (VIP List session 1). Commands that take the person's words (`review approve`, `state checkpoint`, `modality`) record the person's turn themselves, so a declined `metrics turn` no longer empties the log; `--same-turn` joins answers from one message; approvals are counted per turn; and every command marks the session active, so active time counts from the first command, not the first approval.
