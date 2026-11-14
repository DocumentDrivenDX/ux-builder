---
ddx:
  id: ADR-041
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: FEAT-014
    - kind: informed_by
      to: ADR-032
    - kind: informs
      to: CONTRACT-005
    - kind: informs
      to: CONTRACT-008
---

# ADR-041: The app frame is the person's choice

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-27 | **Accepted** 2026-10-27 (operator: the frame should be an option the person chooses, including one with no top or side menus for a very simple app) | Operator | FEAT-018 GDL-80, FEAT-014 MOD-09, US-157, US-162, CONTRACT-005, CONTRACT-008 | High |

## Context

Every responsive-web wireframe, prototype and built app was drawn in
AppShell, whose side column shows from 600 px whatever the destinations.
In trial tasks-1 a one-screen to-do list had an empty 256 px column on
desktop. US-157 already judged a one-destination app by what it does, but
the frame itself was a template, never asked.

## Decision

1. **Four frames.** `screen` (the content alone, no top bar or menus),
   `top-bar` (the app's name and actions, no navigation), `top-nav` (the
   destinations across the top bar from medium up, a bottom bar on phones)
   and `side-nav` (a side menu from expanded, a rail at medium, a bottom bar
   on phones). AppShell draws each with its `frame` prop; `side-nav` stays
   the default.
2. **The person chooses, with the modality.** At step 5 the agent asks for
   the modality, the screen sizes and the frame in one message, recommends
   one from the destinations (none or one: `screen`; up to five: `top-nav`;
   more: `side-nav`) and records the answer in the blueprint's
   `supports.frame` and the design state. Responsive web needs a frame;
   chat alone has none.
3. **Everything follows the choice.** Wireframes, exploratory prototypes and
   the built app are drawn in it; `ux-builder-blueprint check` warns when it
   no longer fits the destinations; the audit judges it by outcome and names
   an app drawn in another frame.

## Alternatives Considered

| Option | Evaluation |
|---|---|
| Hide AppShell's navigation automatically at one destination or none | Fixes the empty column, but the frame stays a template the person never chose. Rejected |
| A frame per screen | More freedom than an app needs, and an inconsistent app. Rejected |
| Ask at the build, with the theme | Wireframes and prototypes before the build would show a frame not chosen. Rejected |

## Consequences

| Type | Impact |
|---|---|
| Positive | A simple app has no empty chrome; the frame fits the app by the person's decision; one more thing every artifact agrees on |
| Negative | `modality` needs one more answer for responsive web; one more decision in the budget |
| Neutral | Blueprints without a frame keep side navigation |
