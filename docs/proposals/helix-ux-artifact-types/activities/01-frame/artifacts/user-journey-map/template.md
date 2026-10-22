---
ddx:
  id: UJM-XXX
  type: user-journey-map
  authoring:
    home: repo
  depends_on:
    - FEAT-XXX
    - US-XXX
---

# UJM-XXX: [Journey Name]

**Feature**: [[FEAT-XXX]] | **Map kind**: [current-state | future-state] | **Evidence**: [research, support data, assessment run, or "assumption-based"]

## Actor and Scenario

<!-- Top zone. One actor, one scenario. -->

- **Actor**: [PRD persona — role, context, relevant constraint (device, expertise, access)]
- **Scenario**: [What happens, from trigger to end state, in one or two sentences]
- **Trigger**: [The event that starts the journey]
- **End state**: [What is true when the actor is done]

### Goals and Expectations

- [What the actor is trying to achieve, in the actor's terms]
- [What the actor expects to happen — time, effort, feedback, control]

## Journey Phases

<!-- Middle zone. Phases are the actor's stages, not screens. Include steps
outside the product. Emotion: one of positive / neutral / negative, plus a
short word. Mark ungrounded thoughts and emotions "(assumption)". -->

| Phase | Actions | Thoughts | Emotion | Touchpoints | Stories / ACs |
|---|---|---|---|---|---|
| [1. Phase name] | [What the actor does] | ["What the actor thinks", in quotes] | [positive / neutral / negative — word] | [Channel or screen-flow node] | [US-XXX-AC1, US-XXX-AC2 or "uncovered: reason"] |
| [2. Phase name] | | | | | |

### Emotion Curve

<!-- Optional. A one-line curve across phases, e.g. 1 neutral → 2 negative → 3 positive. -->

## Insights

<!-- Bottom zone. Pain points and moments that matter, each with evidence. -->

| ID | Insight | Phase | Evidence |
|---|---|---|---|
| I1 | [Pain point or moment that matters] | [Phase] | [Source, or "assumption"] |

## Opportunities

<!-- Bottom zone. Each opportunity has one owner and one metric with a target. -->

| ID | Opportunity | Phase | Owner | Metric | Target |
|---|---|---|---|---|---|
| O1 | [What to change or add] | [Phase] | [Role or team] | [Metric — link metric-definition if one exists] | [Target value and date] |

## Story Coverage

| Phase | Covered by | Gap |
|---|---|---|
| [Phase] | [US-XXX: AC IDs] | [None, or what no story delivers yet] |

## Related Design

- **Screen flow**: [[SF-XXX]]
- **Usability evaluations**: [[UER-XXX]] or none yet

## Assumptions and Open Questions

- [Assumption, and how it will be checked]
