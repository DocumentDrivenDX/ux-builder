---
ddx:
  id: SD-003
  type: solution-design
  status: draft
  links:
    - kind: informed_by
      to: FEAT-008
    - kind: informed_by
      to: ADR-025
    - kind: informed_by
      to: CONTRACT-005
    - kind: informed_by
      to: CONTRACT-004
---

# SD-003: Interaction rules, blueprint and audit

## Scope

FEAT-008's P1: the rule and recipe sources, their checks, their copies in the
catalogue and guidance, `@ux-builder/ui/blueprint` and its command, the MCP
tools, five audit checks and the baseline, and the starter's blueprint. P2
(interaction checks that drive the app, an audit tool over MCP, the view
audit) is out of scope.

## Components

| Component | Files | Role |
|---|---|---|
| Rule and recipe sources | `guidelines/rules.json`, `guidelines/recipes.json`, `guidelines/schema/{rules,recipes,blueprint}.schema.json` | The single source (ADR-025 decision 1) |
| Source check | `tools/check-rules.mjs`, run by `npm run check` | Schemas; PRV-01 to PRV-03, including that `packages/ui/THIRD-PARTY-NOTICES.md` credits each quoted source by its title or URL; recipe patterns and rule IDs exist; check IDs exist |
| Catalogue and guidance | `tools/gen-catalogue.mjs` | Copies the sources and the blueprint schema into `catalogue.json` (`interaction`); writes the "Interaction and screen rules" section of `AGENTS.md` and the skill, with the loop and the disclaimer |
| Library | `packages/ui/blueprint/index.mjs` | `rulesFor`, `checkBlueprint`, `blueprintSchema`, `findRecipes`, `getRecipe`, `skeleton`, `rules`, `recipes`, `limits`; internal `CHECKS` (for check-rules) and `nearestPattern`; reads only `catalogue.json` |
| Command | `packages/ui/blueprint/cli.mjs` (bin `ux-builder-blueprint`) | `check`, `init` |
| MCP tools | `packages/mcp/server.mjs` | `get_rules`, `list_recipes`, `get_recipe`, `get_blueprint_schema`, `check_blueprint`; the loop in `get_guidance` |
| Audit checks | `packages/audit/inspect.mjs`, `audit.mjs`, `report.mjs` | `one-modal`, `modal-contract`, `one-primary-action`, `nav-per-breakpoint`, `line-length`; `ruleId` and `sources` on findings |
| Baseline | `packages/audit/audit.mjs`, `cli.mjs` | `--write-baseline`, `--baseline`; `resolved[]` |
| Starter | `packages/create-app/index.mjs`, `template/` | `app.blueprint.json`, `check:blueprint`, CI step, `--blueprint`, guidance |

## Blueprint checks (rule → logic)

| Rule | Logic |
|---|---|
| `blueprint.valid` | Schema: required fields, types, enums, no unknown fields; destinations name existing screens; screen IDs unique |
| `pattern.exists` | `screens[].pattern` is a catalogue pattern; else the nearest by edit distance |
| `nav.compact-destinations` | App supporting `compact` with more destinations than `limits.compactDestinations` (the rule's `when.sizeClass` is `compact` only, as the audit's below-600 px check is) |
| `screen.states` | A screen whose pattern is in the rule's `appliesTo.patterns` declares `empty`, `loading` and `error`; in a view, `view.states` reports instead |
| `action.destructive-safeguard` | Every destructive action's safeguard is `undo` or `confirm` |
| `modal.titled`, `modal.dismiss` | Every modal has a non-empty title and a dismiss |
| `modal.one-at-a-time` | No modal contains modals |
| `modal.unsaved-changes` | A modal with `editsData` sets `guardsUnsavedChanges` |
| `view.no-shell` | A view has no destinations and no screen whose pattern is in the rule's `appliesTo.patterns` |
| `view.size-classes` | A view supports `compact` and `medium` |
| `view.one-task` | A view has one screen |
| `view.states` | Every screen of a view, whatever its pattern, declares `empty`, `loading` and `error` (VEW-01) |

A rule applies when its `when` matches the blueprint: `context` against
`kind`, and `sizeClass` and `input` intersecting `supports`.

## Audit checks

| Check | Logic (in the page, per run) |
|---|---|
| `one-modal` | Visible `dialog[open]`, `[role=dialog][aria-modal=true]` and `[role=alertdialog]`: more than one |
| `modal-contract` | Each visible modal: an accessible name (`aria-label`, `aria-labelledby` text, or a heading inside); a dismiss control (a button named close, cancel, done or dismiss, or `form[method=dialog]`); after Escape it is no longer visible |
| `one-primary-action` | Per region (each visible modal; otherwise `main`, or `body`): more than one visible `.piq-btn` with no variant class |
| `nav-per-breakpoint` | With `--width`: below 600 px, a visible `nav` outside `main` and not a breadcrumb with more visible top-level items than the limit; from 840 px, no visible such `nav` with two or more items while a visible control opens one (`aria-haspopup` with a hidden navigation) |
| `line-length` | Visible `p` and `li` text blocks of at least two lines whose average characters per line exceed `limits.lineLength` |

## Testing

| Layer | Covers | Where |
|---|---|---|
| Unit | US-050-AC1–AC5, US-053-AC4–AC5, AC7–AC9, US-055-AC1–AC5 | `packages/ui/test/blueprint.test.mjs`, `tools/__tests__/check-rules.test.mjs` |
| Command | US-052-AC1–AC2 | `packages/ui/test/blueprint-cli.test.mjs` |
| MCP | US-053-AC1–AC3, AC6 | `packages/mcp/test/server.test.mjs` |
| Audit (Chromium) | US-054-AC1–AC6, US-052-AC3–AC4 | `packages/audit/test/interaction.test.mjs` |
| Starter | US-051-AC1–AC5 | `packages/create-app/test/` |

## Sequence

1. Sources, schemas, `check-rules` and the catalogue copy.
2. The library and command.
3. MCP tools and guidance.
4. Audit checks and baseline.
5. Starter.
6. README, the site's Start section, the changeset.
