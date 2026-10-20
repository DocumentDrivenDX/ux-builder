---
ddx:
  id: US-019
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-003
    - kind: informed_by
      to: ADR-018
    - kind: informed_by
      to: ADR-017
---

# US-019: Save the chosen theme for review, and see how an app adopts it

**Feature**: FEAT-003 — Guided brand builder
**Feature Requirements**: BB-11, BB-12, BB-13, BB-14, BB-15, BB-16
**PRD Requirements**: FR-16
**Priority**: P0
**Status**: Draft

## Story

**As a** developer creating a client's theme
**I want** to name the chosen option and design system as a theme, save it for review, and copy what an app needs to use it
**So that** the theme goes through normal code review and an app can adopt it the day it ships

## Acceptance Criteria

- [ ] **US-019-AC1** — Given a name already used by a theme or brand, when saving, then saving is blocked with a message.
- [ ] **US-019-AC2** — Given the chosen combination, when saving, then the summary shows the palette and its brand name, the design system, its icons and fonts, the appearances and the contrast result.
- [ ] **US-019-AC3** — Given a valid theme name `<brand>-<design system>` (prefilled), when saved, then `tokens/brands/<brand>.brand.json` (with generation settings) and `tokens/themes/<brand>-<design system>.theme.json` are written, both schema-valid, on a new branch with a pull request; nothing is published.
- [ ] **US-019-AC5** — Given an uploaded logo (and dark-background logo) drawn with margins around it, when saved, then the brand draws a copy framed to the drawing (an SVG's artwork unchanged under a new `viewBox`; a PNG cropped), with its `logo-aspect`, and the upload is kept as the generation source.
- [ ] **US-019-AC6** — Given a saved theme, when the pull request is opened, then it includes a changeset (`@ux-builder/tokens` minor), so merging it queues a release with the theme.
- [ ] **US-019-AC7** — Given a mark, when saved, then it is stored framed to a square around its drawing as `brand/<brand>/mark.<ext>`, and the brand's `mark-image` and `favicon` point at it in every appearance; without one, neither is set.
- [ ] **US-019-AC4** — Given a saved theme, when "Use in your app" shows, then eight tasks for React + Vite, Next.js or plain HTML (nine with a chat library) give the install, theme CSS, `data-theme`, appearance, fonts, widgets, lint and a check, each with copyable code for that theme, plus progress, the files touched and a prompt for a coding agent.

## Dependencies

- **External**: `npm run brand` (writes the same files); CONTRACT-002, CONTRACT-003
