---
ddx:
  id: STP-116
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-116
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-116-use-the-guide-with-or-without-mcp

## Story Reference

**User Story**: [[US-116-use-the-guide-with-or-without-mcp]] (Use the guide with or without MCP)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-116's criteria on fixture apps in temporary folders, with no network and no model.
**Blocking Gate**: `npm test --workspace @ux-builder/design` and `npm test --workspace @ux-builder/mcp`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-116-AC1 | Given the CONTRACT-008 command list, when each command is run with `--json` on a fixture app, then each prints JSON that validates against its schema, and each has an exported function in `@ux-builder/design` that returns the same object. | `us-116-ac1-cli-json-parity` | every command has JSON output and a matching function | `@covers US-116-AC1` | Unit | `packages/design/test/cli.test.mjs` | Fixture app; command list read from the package | Built |
| US-116-AC2 | Given the MCP tools `get_design_state` and `update_design_state`, when they are called on a fixture app, then they return exactly what `ux-builder-design state get --json` and `state set` return for the same input. | `us-116-ac2-mcp-parity` | deep-equal results | `@covers US-116-AC2` | Integration | `packages/mcp/test/design.test.mjs` | Fixture app | Built |
| US-116-AC3 | Given the installed skill, when its text is read, then every step names a `ux-builder-design` or `ux-builder-blueprint` command, and no step requires an MCP tool. | `us-116-ac3-skill-cli-only` | no MCP-only step | `@covers US-116-AC3` | Unit | `packages/design/test/skill.test.mjs` | Skill file | Built |
| US-116-AC4 | Given `@ux-builder/design`'s source, when its imports are scanned, then nothing imports an HTTP client or a model SDK, and a run of every command with networking blocked succeeds. | `us-116-ac4-no-network` | no network modules; commands pass offline | `@covers US-116-AC4` | Unit | `packages/design/test/package.test.mjs` | Commands run with a network stub that fails any request | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
npm test --workspace @ux-builder/mcp
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
