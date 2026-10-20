---
ddx:
  id: US-048
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-007
    - kind: informed_by
      to: ADR-023
    - kind: informed_by
      to: FEAT-004
---

# US-048: The assistant shows its answer as SDK components

**Feature**: FEAT-007 — Generative UI
**Feature Requirements**: GEN-01–03
**PRD Requirements**: FR-30
**Priority**: P2
**Status**: Draft

## Story

**As an** end user, and as the developer of the agent behind the assistant
**I want** the assistant to answer with the app's own tables, cards and forms
**So that** answers are readable, accessible and in the app's theme, and the agent cannot put arbitrary markup on the page

## Context

Requested by the operator on 2026-10-19. Both supported libraries (AI Elements and assistant-ui), and the AI SDK beneath them, let a tool call
render a React component. ADR-023 rule 5 limits those components to the
SDK's catalogue: components marked `renderable`, with props validated against
a schema generated from the catalogue. Anything else is a plain fallback.

## Walkthrough

1. The agent's tool returns `{ component: "DataTable", props: { columns, rows } }`
   with October's fees.
2. The conversation shows the SDK's DataTable in the app's theme, sortable by
   keyboard.
3. A later result names `"<iframe>"`; the conversation shows "This content
   could not be shown." and nothing else.
4. The agent developer asks `@ux-builder/mcp` which components are renderable
   and with which props.

## Acceptance Criteria

- [ ] **US-048-AC1** — Given `catalogue.json`, when it is generated, then each component an agent may render is marked `renderable` with a props schema, and `@ux-builder/mcp` serves the list with the schemas.
- [ ] **US-048-AC2** — Given a tool result naming a renderable component with valid props, when it renders, then that SDK component appears in the conversation in the app's theme and works as it does elsewhere.
- [ ] **US-048-AC3** — Given a tool result naming a component that is not renderable, or with props that fail the schema, when it renders, then a plain fallback says the content could not be shown, and nothing from the result is inserted as HTML or script.

## Edge Cases

- **A renderable component with a missing required prop**: the fallback, never a partial render.
- **A very large table**: it pages, as DataTable does.
- **A component removed from the catalogue in a newer SDK**: the fallback; the agent's guidance from `@ux-builder/mcp` no longer lists it.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| List | US-048-AC1 | The catalogue | Generate; ask MCP | Renderable components with schemas |
| Render | US-048-AC2 | DataTable result | Render | The SDK DataTable in the theme |
| Refuse | US-048-AC3 | `"<iframe>"`; DataTable with `rows: "x"` | Render | Fallback; no HTML from the result |

## Dependencies

- **Stories**: US-046, US-014 (catalogue for agents)
- **Feature Spec**: FEAT-007
- **PRD Requirements**: FR-30
- **External**: CONTRACT-004 revision (`renderable` and props schemas in the catalogue)

## Out of Scope

- The agent's choice of what to render (the agent's).
- Rendering components from outside the SDK.
