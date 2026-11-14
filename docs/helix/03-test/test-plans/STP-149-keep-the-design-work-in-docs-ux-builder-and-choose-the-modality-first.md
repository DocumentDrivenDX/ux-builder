---
ddx:
  id: STP-149
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-149
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-149-keep-the-design-work-in-docs-ux-builder-and-choose-the-modality-first

## Story Reference

**User Story**: [[US-149-keep-the-design-work-in-docs-ux-builder-and-choose-the-modality-first]] (Keep the design work in docs/ux-builder, and choose the modality first)
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-149's criteria with fixtures only: no network, no model, no browser.
**Blocking Gate**: `npm test --workspace @ux-builder/design`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-149-AC1 | Given a new app, when the guide and the blueprint commands write (init, brief, users, decisions, alternatives, comparisons, prototypes, proposals), then every file lands under `docs/ux-builder/` (the blueprint in `blueprint/`, prototypes in `prototypes/`, proposals in `helix-proposals/`), and nothing at the app's top except `.ux-builder/`. | `us-149-ac1` | Every file lands under `docs/ux-builder/` (the blueprint in `blueprint/`, prototypes in `prototypes/`, proposals in `helix-proposals/`), and nothing at the app's top except `.ux-builder/` | `@covers US-149-AC1` | Integration | `packages/design/test/layout.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-149-AC2 | Given an app on the old layout, when the commands run, then they read and write the old paths, and `status` says to run `ux-builder-design migrate`. | `us-149-ac2` | They read and write the old paths, and `status` says to run `ux-builder-design migrate` | `@covers US-149-AC2` | Integration | `packages/design/test/layout.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-149-AC3 | Given an app on the old layout in a git repository, when `migrate --dry-run` runs, then it lists every move and every file it would update and changes nothing; when `migrate` runs, then each path moves with `git mv`, the app's `package.json`, `ux-assessment.yml`, CI workflows, `CLAUDE.md`, `AGENTS.md` and design state point at the new paths, and the commands then use the new layout. | `us-149-ac3` | It lists every move and every file it would update and changes nothing; when `migrate` runs, then each path moves with `git mv`, the app's `package.json`, `ux-assessment.yml`, CI workflows, `CLAUDE.md`, `AGENTS.md` and design state point at the new paths, and the commands then use the new layout | `@covers US-149-AC3` | Integration | `packages/design/test/layout.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-149-AC4 | Given a guided app whose modality is not recorded, when `ux-builder-blueprint wireframes` or `prototype --explore` runs, then it exits 1 asking for the modality and draws nothing; after `ux-builder-design modality --answer … --modality … --size-classes …`, they draw; and a later change to the blueprint's supports asks again. | `us-149-ac4` | It exits 1 asking for the modality and draws nothing; after `ux-builder-design modality --answer … --modality … --size-classes …`, they draw; and a later change to the blueprint's supports asks again | `@covers US-149-AC4` | Integration | `packages/ui/test/blueprint-modality.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-149-AC5 | Given `modality` with a future or unknown modality or size class, when it runs, then it exits 2 naming the value and the allowed ones, and changes nothing. | `us-149-ac5` | It exits 2 naming the value and the allowed ones, and changes nothing | `@covers US-149-AC5` | Integration | `packages/design/test/layout.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-149-AC6 | Given a new app from create-app, when it is created, then its blueprint is at `docs/ux-builder/blueprint/app.blueprint.json` and its `check:blueprint` and `audit` scripts, the audit's manifest default and the MCP server's defaults all find it there. | `us-149-ac6` | Its blueprint is at `docs/ux-builder/blueprint/app.blueprint.json` and its `check:blueprint` and `audit` scripts, the audit's manifest default and the MCP server's defaults all find it there | `@covers US-149-AC6` | Integration | `packages/create-app/test/create-app.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |
| US-149-AC7 | Given an app with the design documents ux-builder used to keep (jobs, users, decision records, evidence records, principles in the design state, test kits, evaluation reports, insights, experiment records, a baseline), when `ux-builder-design migrate` runs, then jobs and users become the PRD's *User Needs* and *User Segments*, decisions ADRs with their result, evidence one study's research plan and principles principles.md, all as proposals; kits, reports, insights, experiments and the baseline move to `docs/ux-builder/runs/`; the originals are removed; `--dry-run` changes nothing; and without HELIX the documents wait, saying to run HELIX's frame (ADR-042 decision 9). | `us-149-ac7-migrate-documents` | documents proposed into HELIX, run output moved, originals removed; dry run changes nothing; waits without HELIX | `@covers US-149-AC7` | Integration | `packages/design/test/migrate-docs.test.mjs` | Fixture app folder under the test's temp directory; no network, no model | |

## Executable Proof

```bash
npm test --workspace @ux-builder/design
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
