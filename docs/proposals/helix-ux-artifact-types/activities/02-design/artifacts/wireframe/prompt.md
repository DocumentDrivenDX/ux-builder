# Wireframe Generation Prompt

Draw one screen at each size class it supports and annotate every element a
user can act on, with numbered callouts at the depth the fidelity calls for.

## Purpose

Wireframe is the **screen-level layout artifact**. Its unique job is to record
what is on one screen, where, and what each element does, so builders and
reviewers share one picture. It replaces the wireframe section the retired
`ux-design` artifact held; the solution or technical design links `WF-XXX`.

## Reference Anchors

- `docs/resources/annotated-wireframes.md` grounds numbered callouts kept
  outside the drawing, annotating every interactive element, plain language,
  and annotation depth scaled to fidelity.

## Focus

- Create `docs/helix/02-design/wireframes/WF-XXX-[screen].md`; put images in
  `wireframes/assets/`.
- Take the screen's node ID, actions and transitions from the screen flow.
- State the fidelity first and annotate to that depth:
  - **sketch** — the idea each region serves;
  - **low** — layout decisions: regions, order, what is primary;
  - **mid** — functionality: what each control does, validation, destination;
  - **high** — interaction, exact content, every state, accessibility.
- Draw one layout per supported size class. Callouts say what changes between
  them.
- Number callouts on the drawing; keep the words in the table. Never write
  explanations inside the layout.
- Give every interactive element a callout that links its screen-flow
  transition or action.
- List the screen's states; show a layout for those that change the layout
  and link the interaction-state diagram for the rest.
- Note focus order, accessible names, headings and landmarks and target size.
- Write in plain language. Reference DESIGN.md tokens; do not define colors,
  type or spacing.
- When generated from ux-builder: the screen comes from the blueprint
  `screens[]` entry (title, pattern, actions, modals, states); size classes
  from `supports.sizeClasses`; layouts from the rendered pattern at each size
  class; callout links from action IDs.

## Boundary Test

| If you are writing... | Put it in... |
|---|---|
| Layout, element purpose, per-element behavior, accessibility notes | Wireframe |
| Where an action leads and what happens across screens | Screen Flow |
| Every state, event and announcement of the screen | Interaction State Diagram |
| Colors, type scale, spacing values | DESIGN.md |
| Component props, files, state management | Technical Design |

## Completion Criteria

- Fidelity stated; annotation depth matches it.
- One layout per supported size class.
- Every interactive element has a numbered callout linked to the flow.
- States listed; each shown or linked.
- Accessibility notes present.
