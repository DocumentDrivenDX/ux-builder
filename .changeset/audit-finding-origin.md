---
"@ux-builder/audit": minor
---

Each finding in the assessment report says where it came from: an agent recommendation, a human observation (verified), or a design-team note (not user evidence). `assess validate-report` refuses a finding labelled `source: human` that is not a real-user finding, and a design-team note typed real-user (FEAT-018 GDL-58).
