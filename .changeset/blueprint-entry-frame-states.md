---
"@ux-builder/ui": minor
"@ux-builder/create-app": minor
"@ux-builder/design": patch
---

The blueprint can say what VIP List's person meant (session 2). `screens[].entry` (`link`, `scan`, `message`) marks a screen entered from outside the app: `flow.reachable` starts from it. `screens[].frame` gives one screen its own frame (a door page with no tabs). A screen may declare states of its own, with `stateNotices` saying what each shows; wireframes, prototypes and the generated app draw the notice over the screen, and a state with no notice is refused. `screens[].users` names who a screen is for, and the new rule `nav.audience` warns when a destination leads to screens for other users (agents finishing alone put promoters' screens in the guest app's tabs). The design skill asks who each part is for.
