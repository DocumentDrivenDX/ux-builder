# Interaction State Diagram Generation Prompt

Enumerate every state one screen or component can be in, how it gets there,
how it leaves, and what each state shows and announces.

## Purpose

Interaction State Diagram is the **screen- or component-level state
artifact**. Its unique job is to make every UI state explicit before build: the
states, the events and guards between them, and per state what the user sees,
what they can do and what assistive technology announces. States left implicit
are the states that ship broken.

It complements DESIGN.md, which sets the app-wide convention for each
interaction state; the ISD says which states this subject has and exactly what
each one does.

## Reference Anchors

- `docs/resources/ui-stack.md` grounds the five baseline states: ideal, empty,
  loading, partial, error.
- `docs/resources/statecharts-all-states.md` grounds Harel statecharts
  (nested and parallel states, guarded transitions) and enumerating every
  state with the events that leave it.

## Focus

- Create `docs/helix/02-design/state-diagrams/ISD-XXX-[name].md`; reuse the
  wireframe's number for the same screen.
- Fill the State Inventory first. Each UI Stack state (ideal, empty, loading,
  partial, error) and each extended state (offline, slow, permission-denied,
  success/confirmation) either applies or is excluded with a concrete reason.
  Add subject-specific states (saving, streaming, editing) as needed.
- Draw a Mermaid `stateDiagram-v2`. Use composite states for regions with
  their own states (a side panel, a form) and parallel regions where two run
  at once, instead of multiplying flat states.
- Label every transition with its event and any guard.
- For every state, fill the matrix: entered when, what the user sees, the
  available action, the announcement (text and politeness, or the focus move
  that carries it) and the exit.
- Give every non-final state an exit. A state with no action needs a reason.
- Say whether error states keep entered data.
- Keep the diagram, the matrix and the transitions table in agreement.
- When generated from ux-builder: the subject is a blueprint screen; states
  come from `screens[].states` plus the feedback targets of its actions
  (`to: "state:…"`) and journey steps that set `state` or `expect`; events are
  the screen's action IDs; announcements come from the pattern's state
  content. Mark inferred states for review.

## Boundary Test

| If you are writing... | Put it in... |
|---|---|
| States, events, guards, per-state content and announcements | Interaction State Diagram |
| App-wide convention for how a loading or error state looks | DESIGN.md |
| Movement between screens | Screen Flow |
| Layout of the ideal state | Wireframe |
| Exact error codes or payloads that trigger a state | Contract |
| Which test drives which state | Story Test Plan |

## Completion Criteria

- Every standard state included or excluded with a reason.
- Every state has an exit, an action (or reason) and an announcement where needed.
- Every guard stated.
- Diagram, matrix and transitions agree.
