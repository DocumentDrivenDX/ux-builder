---
"@ux-builder/design": minor
---

Check rounds are cheap, and findings are taken one by one. A round audits each screen's ideal state at every size and its other states at one size, and only pages changed since their last audit (the others keep their findings); a step prototype drawn again within its step keeps its rounds. Each finding has a stable ID; `step decide` waits until every finding of the latest check is fixed (gone) or accepted with a reason (`prototype --step --check --accept <id> --reason "<why>"`), in place of a second round. In VIP List session 2 audits took two thirds of the session.
