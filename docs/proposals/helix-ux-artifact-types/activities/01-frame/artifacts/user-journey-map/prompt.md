# User Journey Map Generation Prompt

Map one actor's experience of one scenario, phase by phase, and trace each
phase to the acceptance criteria that deliver it.

## Purpose

User Journey Map is the **frame-level experience artifact**. Its unique job is
to show the whole experience a feature serves, including steps outside the
product, so the team can see where the product intent (stories and ACs) covers
the experience, where it leaves gaps, and which opportunities it owns.

It is not a story, a screen flow or a design. Stories own testable behavior;
the screen flow owns screens and transitions; wireframes and state diagrams own
layout and states. The map links to them by ID.

## Reference Anchors

- `docs/resources/nng-journey-mapping.md` grounds the five elements (actor;
  scenario and expectations; phases; actions, mindsets and emotions;
  opportunities) and the three layout zones (top: actor and scenario; middle:
  phases; bottom: insights, opportunities and ownership).

## Focus

- Create `docs/helix/01-frame/journey-maps/UJM-XXX-[name].md`.
- Pick one actor from the PRD personas and one scenario with a trigger and an
  end state. A second actor or scenario is a second map.
- State goals and expectations before the phases; phases are judged against them.
- Name phases as the actor's stages ("Notice", "Investigate", "Decide"), not
  as screens. Include off-product steps such as an email or a phone call.
- Per phase, write the actions, the actor's thoughts in the actor's words, one
  emotion (positive / neutral / negative plus a word) and the touchpoints.
- Ground thoughts and emotions in evidence: research notes, support tickets,
  analytics or a usability evaluation report (UER). Mark ungrounded entries
  "(assumption)". Do not invent research.
- Trace every in-product phase to `US-<n>-AC<m>` IDs. Mark a phase no AC
  delivers as `uncovered:` with a reason; that gap is a finding, not a defect
  in the map.
- Give every opportunity one owner and one metric with a target. Reference a
  metric-definition when one exists.
- When generated from ux-builder: actor and stories come from the HELIX
  stories the blueprint journeys name; phases group the journey steps; ACs come
  from each journey's `criteria`. Thoughts and emotions still need evidence.

## Boundary Test

| If you are writing... | Put it in... |
|---|---|
| The actor's phases, thoughts, emotions, opportunities | User Journey Map |
| Testable behavior and Given/When/Then criteria | User Stories |
| Screens, modals, transitions and alternate paths | Screen Flow |
| Layout and per-element annotations | Wireframe |
| UI states, events and announcements | Interaction State Diagram |
| Observed usability problems and severities | Usability Evaluation Report |
| Ranked follow-up work | Improvement Backlog |

## Completion Criteria

- One actor and one scenario, with goals and expectations.
- Phases run from trigger to end state.
- Every in-product phase names its ACs or is marked uncovered.
- Every thought and emotion cites evidence or is marked as an assumption.
- Every opportunity has one owner and one measurable target.
