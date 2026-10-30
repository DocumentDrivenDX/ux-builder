---
ddx:
  id: US-165
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-019
    - kind: informed_by
      to: CONTRACT-009
---

# US-165: Read a visual as Mermaid

**Feature**: FEAT-019 — Visuals renderer
**Feature Requirements**: PRT-01
**PRD Requirements**: FR-93
**Priority**: P1
**Status**: Draft

## Story

**As** a reader of Markdown on GitHub
**I want** the same visual as a Mermaid diagram in the theme's colours
**So that** the Markdown record of a page still shows the picture where SVG is not embedded

## Acceptance Criteria

- **US-165-AC1** — Given each graph-kind fixture, when it is rendered as Mermaid, then the text opens with the theme's `%%{init}%%` and the visual's id, and names every node, edge, participant, message, state, transition and entity of the document.
- **US-165-AC2** — Given labels with quotes, brackets or line breaks, when they are emitted, then the Mermaid text escapes them.

## Dependencies

FEAT-017's tokens; umf's `umf.visual` 1.0.0; CONTRACT-009.
