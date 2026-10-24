---
ddx:
  id: US-114
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-036
    - kind: informed_by
      to: CONTRACT-008
    - kind: informed_by
      to: SD-006
---

# US-114: Install the design package and start a guided session in a new app

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-70, GDL-72, GDL-01
**PRD Requirements**: FR-75, FR-76
**Priority**: P1
**Status**: Draft

## Story

**As a** app developer or designer starting a new app (PRD primary persona)
**I want** a new app that already has the guided design loop installed and tells me how to start it
**So that** I can begin designing with my agent without learning the toolchain first

## Context

ADR-036 puts the guide in a new dev dependency, `@ux-builder/design`, with the `ux-builder-design` skill, the artifact templates and the CLI. `create-app` adds it to every new app.

## Walkthrough

1. The developer runs `npm create @ux-builder/app river-path`.
2. The starter adds `@ux-builder/design`, installs the skill into `.claude/skills/ux-builder-design/` and writes an empty design state.
3. `CLAUDE.md`, `AGENTS.md` and the empty Home panel say to start with `/ux-builder-design`.
4. The developer opens Claude Code and types `/ux-builder-design`; the guide starts at Define.

## Acceptance Criteria

- [ ] **US-114-AC1** — Given a new app created with `npm create @ux-builder/app`, when its `package.json` and `.claude/skills/` are read, then `@ux-builder/design` is a dev dependency and `.claude/skills/ux-builder-design/SKILL.md` exists.
- [ ] **US-114-AC2** — Given a new app, when `.ux-builder/design-state.json` is read, then it validates against `design-state.schema.json`, its activity is `define`, and it has no checkpoints, assumptions or alternatives.
- [ ] **US-114-AC3** — Given a new app, when its `CLAUDE.md`, `AGENTS.md` and the starter's Home screen are read, then each names `/ux-builder-design` as the way to start designing.
- [ ] **US-114-AC4** — Given a new app created without `--mcp`, when its files are listed, then no `.mcp.json` is written; with `--mcp`, `.mcp.json` names the ux-builder MCP server started with `npx @ux-builder/mcp`.
- [ ] **US-114-AC5** — Given the installed skill, when its text is read, then it names the eight capabilities and the four activities (Define, Explore, Experience, Validate) and tells the agent to open each session with the design state's summary.
- [ ] **US-114-AC6** — Given `@ux-builder/design`'s `package.json`, when its dependencies are read, then they are `@ux-builder/ui`, `@ux-builder/audit`, `@ux-builder/trace` and libraries that make no network call, and `npm run licences` passes.

## Edge Cases

- **`--no-helix`**: the package and skill are still installed; the guide keeps the brief in the design state (FEAT-018 non-functional requirements).
- **Offline create**: the package comes from the local install like the other `@ux-builder/*` packages.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-114-AC1 | a new app created with `npm create @ux-builder/app` | its `package.json` and `.claude/skills/` are read | `@ux-builder/design` is a dev dependency and `.claude/skills/ux-builder-design/SKILL.md` exists |
| AC2 | US-114-AC2 | a new app | `.ux-builder/design-state.json` is read | it validates against `design-state.schema.json`, its activity is `define`, and it has no checkpoints, assumptions or alternatives |
| AC3 | US-114-AC3 | a new app | its `CLAUDE.md`, `AGENTS.md` and the starter's Home screen are read | each names `/ux-builder-design` as the way to start designing |
| AC4 | US-114-AC4 | a new app created without `--mcp` | its files are listed | no `.mcp.json` is written; with `--mcp`, `.mcp.json` names the ux-builder MCP server started with `npx @ux-builder/mcp` |
| AC5 | US-114-AC5 | the installed skill | its text is read | it names the eight capabilities and the four activities (Define, Explore, Experience, Validate) and tells the agent to open each session with the design state's summary |
| AC6 | US-114-AC6 | `@ux-builder/design`'s `package.json` | its dependencies are read | they are `@ux-builder/ui`, `@ux-builder/audit`, `@ux-builder/trace` and libraries that make no network call, and `npm run licences` passes |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-70, GDL-72, GDL-01
- **PRD Requirements**: FR-75, FR-76
- **External**: ADR-036, CONTRACT-008, SD-006

## Out of Scope

- What the guide does once started (US-117, US-118).
- Existing apps (US-115).
