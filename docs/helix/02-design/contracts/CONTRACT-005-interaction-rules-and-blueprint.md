---
ddx:
  id: CONTRACT-005
  type: contract
  status: accepted
  links:
    - kind: informed_by
      to: FEAT-008
    - kind: informed_by
      to: ADR-025
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: ADR-024
    - kind: informs
      to: CONTRACT-004
---

# Contract

**Contract ID**: CONTRACT-005 — Interaction rules and blueprint
**Type**: data formats and library API (the rule catalogue, recipes, the blueprint file, findings, `@ux-builder/ui/blueprint` and the `ux-builder-blueprint` command)
**Version**: v1 (from `@ux-builder/ui` 0.7.0)
**Status**: accepted — 2026-10-20, with ADR-025
**Related**: FEAT-008, ADR-021 (size classes), ADR-024 (views), CONTRACT-004 (where the entry points, command, audit options and MCP tools are listed)

## Purpose

Defines the shapes an app, an agent or a host relies on to read the SDK's
interaction and IA rules, describe an app or view in a blueprint, and read
the findings of a blueprint check or an audit by rule ID.

## Scope and Boundaries

- In scope: `guidelines/rules.json` and `guidelines/recipes.json` (sources)
  and their copies in `@ux-builder/ui/catalogue.json` (`interaction`); the
  blueprint file; the findings shape; `rulesFor`, `checkBlueprint`,
  `blueprintSchema`, `findRecipes`, `getRecipe`, `skeleton`, `rules`,
  `recipes` and `limits`; the `ux-builder-blueprint` command.
- Out of scope: which rules exist (the catalogue is normative for that); the
  audit's command and report (CONTRACT-004), except the fields this contract
  adds; Praxis-specific rules (the Praxis adapter, ADR-024).

## Normative Surface

### Size classes and inputs

| Value | Meaning |
|---|---|
| `compact`, `medium`, `expanded`, `large`, `extra-large` | ADR-021's size classes: container width from 0, 600, 840, 1200, 1600 px |
| `coarse` | Touch input (CSS `pointer: coarse`) |
| `fine` | Mouse, trackpad or pen (CSS `pointer: fine`) |
| `app`, `view` | Context: a whole app with its own shell, or a view embedded in a host |

### Rule

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | Dotted, lowercase, unique, stable across versions (`modal.one-at-a-time`). A rule is never renumbered or reused |
| `title` | string | yes | Short |
| `statement` | string | yes | What the UI must do, in the SDK's own words |
| `rationale` | string | yes | Why |
| `when` | object | no | Any of `context`, `sizeClass`, `input`, each an array of the values above. An absent axis matches every value |
| `appliesTo` | object | no | `patterns` and `widgets`: arrays of catalogue names. Absent: the whole app or view |
| `checks` | array | yes | Each `{ "kind": "blueprint" | "audit" | "lint" | "review", "id": string }`; `id` names an existing check of that kind (`review`: any string) |
| `severity` | `"error"` or `"warning"` | yes | A blueprint error fails `ux-builder-blueprint check`; audit findings are warnings for one minor release whatever the rule says |
| `sources` | array | yes | At least one `{ "title", "url", "licence", "wording", "quote"? }` |
| `sources[].licence` | `"apple-terms"`, `"google-terms"`, `"CC-BY-2.5"`, `"W3C"`, `"own"` | yes | `apple-terms` and `google-terms` are not open |
| `sources[].wording` | `"paraphrased"` or `"quoted"` | yes | `quoted` only with an open licence, with `quote` of at most 25 words |

`rules.json` also holds `version` (1) and `limits`: `compactDestinations`
(5) and `lineLength` (80), the numbers rules refer to.

### Recipe

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | Unique, stable |
| `title`, `job` | string | yes | `job`: the job in plain words |
| `keywords` | string[] | yes | Words a job description may contain |
| `kind` | `"app"`, `"view"`, `"any"` | yes | |
| `screens` | array | yes | Each `{ "pattern", "role" }`; `pattern` names a catalogue pattern |
| `rules` | string[] | yes | Rule IDs the recipe satisfies |

### Blueprint (`app.blueprint.json`)

| Field | Type | Required | Rules |
|---|---|---|---|
| `version` | `1` | yes | |
| `kind` | `"app"` or `"view"` | yes | |
| `name` | string | yes | |
| `supports.sizeClasses` | size-class[] | yes | Non-empty |
| `supports.inputs` | input[] | yes | Non-empty |
| `destinations` | array | app: yes; view: no | Each `{ "id", "label", "screen" }`; `screen` names a screen `id` |
| `screens` | array | yes | Non-empty; each below |
| `screens[].id`, `.title`, `.pattern` | string | yes | `pattern`: a catalogue pattern |
| `screens[].primaryAction` | `{ "label" }` | no | At most one per screen |
| `screens[].destructiveActions` | array | no | Each `{ "label", "safeguard": "undo" | "confirm" | "none" }` |
| `screens[].states` | (`"empty"`, `"loading"`, `"error"`)[] | no | |
| `screens[].modals` | array | no | Each `{ "id", "title", "kind": "dialog" | "sheet", "dismiss": "cancel" | "close" | "done", "editsData"?: boolean, "guardsUnsavedChanges"?: boolean, "modals"?: array }` |

Unknown fields are errors (`blueprint.valid`).

### Finding

`{ "rule": string, "severity": "error" | "warning", "path": string, "message": string, "fix": string }`
— `path` is a JSON Pointer into the blueprint (`/screens/2/modals/0`).
Findings are ordered by `path`, then `rule`, each in plain string order
(UTF-16 code units, as JavaScript's `<` compares them; not a locale or
numeric order), so `/screens/10` comes before `/screens/2`.

### Library (`@ux-builder/ui/blueprint`, Node or browser, no network)

| Export | Signature | Returns |
|---|---|---|
| `rulesFor` | `(target: { context?, sizeClasses?, inputs? }) => Rule[]` | Rules whose `when` matches; catalogue order |
| `checkBlueprint` | `(blueprint: object) => Finding[]` | Findings for the schema and every blueprint check whose rule applies to the blueprint's kind, size classes and inputs |
| `blueprintSchema` | object | The blueprint's JSON Schema (draft 2020-12) |
| `findRecipes` | `(job: string, kind?: "app" \| "view") => Recipe[]` | Best keyword match first; all recipes when `job` is empty |
| `skeleton` | `(kind: "app" \| "view") => object` | A minimal valid blueprint |
| `getRecipe` | `(id: string) => Recipe \| null` | The recipe with that ID, or `null` |
| `rules` | Rule[] | Every rule, in catalogue order (`catalogue.json` `interaction.rules`) |
| `recipes` | Recipe[] | Every recipe, in catalogue order (`interaction.recipes`) |
| `limits` | `{ compactDestinations, lineLength }` | The numbers the rules refer to (`interaction.limits`) |

The module also exports `CHECKS` (the IDs of the blueprint checks it runs,
read by `tools/check-rules.mjs`) and `nearestPattern` (the edit-distance
match behind `pattern.exists`). They are internal to the SDK's own tools:
not part of this contract, and they may change in any release.

### Command (`ux-builder-blueprint`, bin of `@ux-builder/ui`)

| Command | Behaviour | Exit |
|---|---|---|
| `check <file> [--json]` | Prints findings (or JSON) | 0 no errors; 1 an error finding; 2 usage or unreadable file |
| `init [--kind app\|view] [--out <file>]` | Writes `skeleton(kind)` to `app.blueprint.json` (or `--out`); refuses to overwrite | 0 written; 1 exists; 2 usage |

## Error Semantics

| Case | Result |
|---|---|
| Blueprint is not JSON | `check` exits 2 with the parse error |
| Blueprint fails the schema | One `blueprint.valid` error per problem, with its path |
| Unknown pattern | `pattern.exists` error naming the nearest catalogue pattern |
| Rule source breaks the licence rules, or a quoted source is not credited in `@ux-builder/ui`'s `THIRD-PARTY-NOTICES.md` | `npm run check` fails (FEAT-008 PRV-02, PRV-03) |

## Examples

```json
{
  "version": 1,
  "kind": "app",
  "name": "Time review",
  "supports": { "sizeClasses": ["compact", "medium", "expanded", "large"], "inputs": ["coarse", "fine"] },
  "destinations": [
    { "id": "queue", "label": "Review", "screen": "queue" },
    { "id": "settings", "label": "Settings", "screen": "settings" }
  ],
  "screens": [
    { "id": "queue", "title": "Entries to review", "pattern": "WorkQueue",
      "primaryAction": { "label": "Approve" },
      "destructiveActions": [{ "label": "Reject", "safeguard": "undo" }],
      "states": ["empty", "loading", "error"] },
    { "id": "settings", "title": "Settings", "pattern": "SettingsPage" }
  ]
}
```

```json
[{ "rule": "action.destructive-safeguard", "severity": "error", "path": "/screens/0/destructiveActions/0",
   "message": "Reject has no safeguard.", "fix": "Set safeguard to \"undo\" (an Undo toast) or \"confirm\" for an unexpected, irreversible loss." }]
```

## Non-Normative Notes

- The rules restate Apple's HIG and Material 3 in the SDK's own words
  (ADR-025, FEAT-008 PRV-02).

## Validation Checklist

- [x] Every field has a type and a rule.
- [x] Exit codes and ordering are defined.
- [x] Licence values and the quotation limit are normative.
