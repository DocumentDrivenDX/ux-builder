---
ddx:
  id: STP-114
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-114
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-114-install-the-design-package-and-start-a-guided-session-in-a-new-app

## Story Reference

**User Story**: [[US-114-install-the-design-package-and-start-a-guided-session-in-a-new-app]] (Install the design package and start a guided session in a new app)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-114's criteria on fixture apps in temporary folders, with no network and no model.
**Blocking Gate**: `npm test --workspace @ux-builder/create-app` and `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-114-AC1 | Given a new app created with `npm create @ux-builder/app`, when its `package.json` and `.claude/skills/` are read, then `@ux-builder/design` is a dev dependency and `.claude/skills/ux-builder-design/SKILL.md` exists. | `us-114-ac1-create-app-design` | dev dependency present; skill file present | `@covers US-114-AC1` | Integration | `packages/create-app/test/design.test.mjs` | Starter created into a temp folder with the bundled HELIX | Built |
| US-114-AC2 | Given a new app, when `.ux-builder/design-state.json` is read, then it validates against `design-state.schema.json`, its activity is `define`, and it has no checkpoints, assumptions or alternatives. | `us-114-ac2-create-app-design-state` | empty, valid state at Define | `@covers US-114-AC2` | Integration | `packages/create-app/test/design.test.mjs` | Temp app | Built |
| US-114-AC3 | Given a new app, when its `CLAUDE.md`, `AGENTS.md` and the starter's Home screen are read, then each names `/ux-builder-design` as the way to start designing. | `us-114-ac3-create-app-design-pointers` | all three point to the skill | `@covers US-114-AC3` | Integration | `packages/create-app/test/design.test.mjs` | Temp app; Home rendered to HTML | Built |
| US-114-AC4 | Given a new app created without `--mcp`, when its files are listed, then no `.mcp.json` is written; with `--mcp`, `.mcp.json` names the ux-builder MCP server started with `npx @ux-builder/mcp`. | `us-114-ac4-create-app-mcp-flag` | `.mcp.json` only with `--mcp` | `@covers US-114-AC4` | Integration | `packages/create-app/test/design.test.mjs` | Two temp apps | Built |
| US-114-AC5 | Given the installed skill, when its text is read, then it names the eight capabilities and the four activities (Define, Explore, Experience, Validate) and tells the agent to open each session with the design state's summary. | `us-114-ac5-skill-capabilities` | capabilities, activities and session opening present | `@covers US-114-AC5` | Unit | `packages/design/test/skill.test.mjs` | Skill file from the package | Built |
| US-114-AC6 | Given `@ux-builder/design`'s `package.json`, when its dependencies are read, then they are `@ux-builder/ui`, `@ux-builder/audit`, `@ux-builder/trace` and libraries that make no network call, and `npm run licences` passes. | `us-114-ac6-package-dependencies` | allowed dependency list; licence gate passes | `@covers US-114-AC6` | Unit | `packages/design/test/package.test.mjs` | Package manifest | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/create-app
npm test --workspace @ux-builder/design
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
