---
ddx:
  id: US-116
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-036
    - kind: informed_by
      to: CONTRACT-008
---

# US-116: Use the guide with or without MCP

**Feature**: FEAT-018 — Guided design loop
**Feature Requirements**: GDL-71
**PRD Requirements**: FR-75
**Priority**: P1
**Status**: Draft

## Story

**As a** developer whose agent may or may not have the ux-builder MCP server
**I want** every part of the guide to work from the command line, and MCP to be optional
**So that** I need no server, hosted or local, to use it

## Context

ADR-036: CLI first, MCP optional. Every capability is a CLI command with `--json`, backed by an exported function. MCP tools wrap the same functions.

## Walkthrough

1. The agent runs `npx ux-builder-design state get --json` and parses the result.
2. In another app with `.mcp.json`, the agent calls `get_design_state` and gets the same object.

## Acceptance Criteria

- [ ] **US-116-AC1** — Given the CONTRACT-008 command list, when each command is run with `--json` on a fixture app, then each prints JSON that validates against its schema, and each has an exported function in `@ux-builder/design` that returns the same object.
- [ ] **US-116-AC2** — Given the MCP tools `get_design_state` and `update_design_state`, when they are called on a fixture app, then they return exactly what `ux-builder-design state get --json` and `state set` return for the same input.
- [ ] **US-116-AC3** — Given the installed skill, when its text is read, then every step names a `ux-builder-design` or `ux-builder-blueprint` command, and no step requires an MCP tool.
- [ ] **US-116-AC4** — Given `@ux-builder/design`'s source, when its imports are scanned, then nothing imports an HTTP client or a model SDK, and a run of every command with networking blocked succeeds.

## Edge Cases

- **MCP server configured but not running**: the skill falls back to the CLI.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| AC1 | US-116-AC1 | the CONTRACT-008 command list | each command is run with `--json` on a fixture app | each prints JSON that validates against its schema, and each has an exported function in `@ux-builder/design` that returns the same object |
| AC2 | US-116-AC2 | the MCP tools `get_design_state` and `update_design_state` | they are called on a fixture app | they return exactly what `ux-builder-design state get --json` and `state set` return for the same input |
| AC3 | US-116-AC3 | the installed skill | its text is read | every step names a `ux-builder-design` or `ux-builder-blueprint` command, and no step requires an MCP tool |
| AC4 | US-116-AC4 | `@ux-builder/design`'s source | its imports are scanned | nothing imports an HTTP client or a model SDK, and a run of every command with networking blocked succeeds |

## Dependencies

- **Feature Spec**: FEAT-018
- **Feature Requirements**: GDL-71
- **PRD Requirements**: FR-75
- **External**: ADR-036, CONTRACT-008

## Out of Scope

- A hosted MCP server (FEAT-018 Developer Experience).
