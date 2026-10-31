---
ddx:
  id: ADR-043
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-042
    - kind: informs
      to: CONTRACT-005
    - kind: informs
      to: CONTRACT-008
---

# ADR-043: The person where only they can help, and one prototype that grows

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-31 | **Accepted** 2026-10-31 (operator: implement every recommendation from the VIP List session 2 trial and its what-if test, and fix the bugs found) | Operator | FEAT-018 GDL-86, US-165, ADR-042, CONTRACT-005, CONTRACT-008 | Medium: one simulated person, one run per stopping point |

## Context

VIP List session 2 (simulated, 2026-10-31) ran all eight steps on ADR-042's per-step loop; a what-if test then had a fresh agent finish the design alone from each step and built every result by one recipe. The person was irreplaceable in steps 1 to 3 (facts no agent guessed: how often people come back, devices, what each party gives, rules) and in keeping the scope small; in steps 4 to 6 they confirmed the agent's defaults, which agents alone matched; steps 7 and 8 ran on participants and data. Agents alone put promoters' screens in the guest app's tabs, because nothing said who each part was for. The step prototype showed placeholders and stopped changing after step 3; audits took 35.5 of 55 minutes; the prototype's defaults reopened the brief; `finish` wrote HELIX files with unfilled placeholders; the guide's own measures missed check time, step 1 and simulated data.

## Decision

1. **Front-load the person.** The intake asks for the facts only the person knows and the business rules; `scope` lists stories, criteria, screens, destinations and inputs for the person to cut; the skill runs steps 4 to 6 as one batch of defaults.
2. **Say who each part is for.** The blueprint gains `screens[].users`, `entry` (reached from a link, a scan, a message), a per-screen `frame`, and states of a screen's own with `stateNotices`; the rule `nav.audience` warns about a tab for other users.
3. **One prototype that grows.** Step prototypes draw each screen with its own content; once the app is built, the step prototype is the app.
4. **Cheap checks, findings one by one.** A round audits ideal states at every size and other states at one, only pages that changed; each finding is fixed or accepted with a reason.
5. **Keep the guide's own work out of the person's review.** The prototype's defaults take no brief section and no map exception; the brief does not read back the PRD lines that repeat it.
6. **Measure the session honestly.** Checks are timed when they end; step 1 has its minutes; testing starts with the kit; simulated data is marked and confirms nothing.

## Alternatives Considered

| Option | Evaluation |
|---|---|
| Keep the person in every step equally | The what-if test showed no gain in steps 4 to 6 for the turns they cost. Rejected |
| Let the agent finish from step 1 by default | It lost the facts only the person had and grew the scope. Rejected |
| Build the app at step 1 for a growing prototype | Needs a modality, theme and install before the person has said anything; content-drawn step prototypes give most of the benefit. Deferred |

## Consequences

| Type | Impact |
|---|---|
| Positive | The person's time goes to facts, rules and scope; prototypes look like the product from step 1; checks take a fraction of the time; the measures can be trusted |
| Negative | More fields in the blueprint to learn; `nav.audience` needs `users` to judge |
| Neutral | Evidence is from one simulated person; a real trial should confirm it |
