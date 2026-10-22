# Screen Flow Generation Prompt

Describe how users move through one feature's screens: what each action does,
what they see while it happens, and every way it can go wrong.

## Purpose

Screen Flow is the **feature-level user-flow artifact**. Its unique job is to
record the nodes (screens, modals, panels), the actions that connect them, the
decision points, the entry and exit points and every alternate path, with the
feedback the user sees on each transition.

HELIX retired `ux-design` as a monolithic artifact and put flow rationale in
the solution or technical design. Screen Flow does not revive it: it carries
only the flow, in a shape a tool can generate and check, and the solution
design links `SF-XXX` instead of restating screens and transitions. Rationale
for choosing this flow over another stays in the solution design.

## Reference Anchors

- `docs/resources/nng-wireflows.md` grounds wireflows: show feedback states,
  mark the hotspot that triggers each transition, show only the changed region
  when part of a desktop screen updates, and match fidelity to purpose.

## Focus

- Create `docs/helix/02-design/screen-flows/SF-XXX-[name].md`, numbered after
  the governing feature.
- List every node once. A modal or panel is its own node; a state of a screen
  (loading, empty, error) is not — link the interaction-state-diagram instead.
- For every edge, name the action and its hotspot (the control the user
  activates), any guard, the target, the feedback and the changed region.
- Name a decision node for every branch the user or system takes.
- Give every action that can fail, be cancelled, return nothing or be denied
  its alternate path. If one cannot occur, say why.
- Keep the Mermaid diagram and the transitions table identical in content.
- Trace every journey and alternate to a path of transition IDs and its ACs.
- State the fidelity and why. Do not specify layout (wireframe) or tokens
  (DESIGN.md).
- When generated from ux-builder: nodes are the blueprint's `screens` and
  `modals`; edges are each screen's `actions` (`to` gives the target;
  `state:` targets are feedback, not nodes; `back` and `external` are exits);
  destructive actions carry their safeguard as feedback; journeys and
  alternates come from `journeys[].steps` and `alternates`.

## Boundary Test

| If you are writing... | Put it in... |
|---|---|
| Nodes, actions, hotspots, guards, feedback, alternate paths | Screen Flow |
| Why this flow was chosen over another; component decomposition | Solution Design |
| Exact route, API or event surface behind a transition | Contract |
| Layout and annotations of one screen | Wireframe |
| States inside one screen or component | Interaction State Diagram |
| Which test walks which path | Story Test Plan |

## Completion Criteria

- Entry and exit points named; every node reachable.
- Every transition names action, hotspot, feedback and target.
- Every failure-prone, cancellable or empty-capable action has an alternate path.
- Diagram and table agree.
- Every journey and alternate traced to transitions and ACs.
