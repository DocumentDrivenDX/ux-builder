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
    - kind: informed_by
      to: ADR-028
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

## AI and agent experience *[Amended 2026-10-21 — planned, FEAT-011, ADR-028]*

Planned for the `@ux-builder/ui` minor that ships FEAT-011. Until then, a
name here may change only by amending this section. Everything is optional:
a rule, blueprint or page without these fields behaves as before.

### Rule additions

| Field | Type | Rules |
|---|---|---|
| `when.aiRole` | (`"generative"`, `"assistant"`, `"agent"`)[] | Matches a target with any listed role. A target with no AI role matches no rule that has `aiRole` |
| `sources[].licence` | adds `"microsoft-terms"`, `"CC-BY-NC-SA-4.0"`, `"CC-BY-NC-ND-4.0"`, `"CC-BY-4.0"` | Only `CC-BY-4.0` is open (quotable with attribution); the others MUST be `paraphrased` |
| `checks[].kind` | adds `"card"` | `id` names a check `checkCard` runs (ADR-029) |

`rulesFor` takes `aiRoles?` beside `context`, `sizeClasses` and `inputs`.

### Blueprint additions: `screens[].ai`

| Field | Type | Required | Rules |
|---|---|---|---|
| `roles` | (`"generative"`, `"assistant"`, `"agent"`)[] | yes | Non-empty |
| `acts` | boolean | no | `true`: the AI changes something outside the conversation. Default `false` |
| `highImpactActions` | array | no | Each `{ "label", "approval": "each" \| "plan" \| "none" }`. `plan` needs the screen to show its plan |
| `renders` | string[] | no | Catalogue patterns or widgets the AI may render inline; each MUST be `renderable` (FEAT-007 GEN-01) |
| `region` | size-class[] | no | Size classes of the region the AI's content renders in. Default `["compact", "medium"]` |
| `essential` | boolean | no | `true`: the AI is the task. Default `false` |
| `fallback` | string | no | A screen `id` that does the job without AI |
| `dataLeavesDevice` | boolean | no | Default `false` |
| `consent` | string | no | The screen or modal `id` where the user consents |
| `takeover` | boolean | no | `true`: the user can take over from the agent and hand back |

*[Amended 2026-10-21 — build of FEAT-011 step 2]* `highImpactActions[].approval`
may be omitted; it is then treated as `"none"` and warned on
(`agent.approve-high-impact`, US-077-AC2), not a schema error. `fallback`
may also name a destination `id` (FEAT-011 AIB-01: "the screen or
destination"). Inside `ai`, a `blueprint.valid` message for a value outside
its enum names the value.

### AI markup

Attributes the audit reads. SDK components emit them, and apps with their
own AI UI MUST add them to get audit coverage.

| Marker | On | Companions the audit looks for |
|---|---|---|
| `data-piq-ai="generated"` | Content made by AI: text, an image, an inline component | A visible disclosure: the element, an ancestor with `data-piq-ai-label`, or an element it references with `aria-describedby`; a correction control (`data-piq-ai-control="retry" \| "regenerate" \| "edit" \| "undo"`) |
| `data-piq-ai="status"` | The live region that says what the AI is doing | `aria-live`; `aria-busy="true"` while working; then a control with accessible name "Stop" or "Pause" in or beside it |
| `data-piq-ai="plan"` | A list of an agent's steps | Children `data-piq-ai="step"`, each with `data-piq-ai-status="pending" \| "running" \| "done" \| "failed" \| "skipped"` and that status in text |
| `data-piq-ai="approval"` | A request for the user's approval | An approve and a deny control (`data-piq-ai-control="approve"`, `"deny"`); neither focused by default to submit, nor pre-checked |
| `data-piq-ai-actor="agent" \| "user"` | The region stating who is acting now (takeover) | A live region; the value changes on takeover and hand-back |
| `data-piq-ai-label` | An ancestor whose visible text discloses AI for everything inside | — |

### Findings and checks

The blueprint checks and audit checks of these rules are warnings
(ADR-028 decision 5). Their IDs are SD-005's rule IDs. Their findings use
the *Finding* shape above.

## Flows and journeys *[Amended 2026-10-21 — planned, FEAT-012, ADR-030]*

Planned for the `@ux-builder/ui` minor that ships FEAT-012. All fields are
optional, and a blueprint without them is unchanged.

### `screens[].actions[]`

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | Unique within the screen |
| `label` | string | yes | As the user sees it |
| `to` | string | yes | A screen `id`; `modal:<modal id>` (a modal of this screen); `back`; `state:<empty\|loading\|error\|…>`; or `external` |
| `primary` | boolean | no | At most one per screen; if `primaryAction` is also given, its label MUST match |
| `destructive` | `"undo"` \| `"confirm"` \| `"none"` | no | The safeguard, as `destructiveActions[].safeguard` |
| `highImpact` | `"each"` \| `"plan"` \| `"none"` | no | The approval, as FEAT-011's `ai.highImpactActions[].approval` |

Modals gain the same `actions[]`; `back` from a modal returns to its screen.

```json
{ "id": "queue", "title": "Entries", "pattern": "WorkQueue",
  "actions": [
    { "id": "open",    "label": "Open entry", "to": "entry" },
    { "id": "approve", "label": "Approve",    "to": "queue", "primary": true },
    { "id": "reject",  "label": "Reject",     "to": "modal:reject-reason", "destructive": "undo" },
    { "id": "help",    "label": "Help",       "to": "external" }
  ] }
```

### `journeys[]`

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | `J-` + kebab-case; unique |
| `story` | HELIX ID | yes | `US-<n>` |
| `criteria` | HELIX AC ID[] | no | `US-<n>-AC<m>` of that story |
| `entry` | screen `id` | yes | |
| `steps[]` | array | yes | Each `{ "screen", "action"?, "state"?, "expect"?, "scenario"? }`; `action` names an action of `screen`; the next step's screen is where it leads; `state` and `expect` are states (`empty`, `loading`, `error`) |
| `alternates[]` | array | no | Each `{ "from": <step index>, "steps", "reason"?, "scenario"? }` |
| `scenario` (step or alternate) | `"normal"` \| `"errorProne"` \| `"risky"` | no | FEAT-011's scenarios, so the assessment walks it as one |

```json
{ "id": "J-review-entry", "story": "US-012", "criteria": ["US-012-AC1", "US-012-AC3"],
  "entry": "queue",
  "steps": [
    { "screen": "queue", "action": "open" },
    { "screen": "entry", "action": "approve", "state": "loading" },
    { "screen": "queue", "expect": "empty" }
  ],
  "alternates": [ { "from": 1, "steps": [ { "screen": "entry", "action": "reject" } ] } ] }
```

### Checks

`flow.reachable`, `flow.no-dead-end`, `flow.primary-consistent`,
`journey.walkable`, `journey.safeguarded`, `journey.covers-errors` and
`journey.story-covered` are warnings. `flow.target-exists` is an error.
Findings use the *Finding* shape.

*[Amended 2026-10-21 — build of FEAT-012 step 2]* Details the build had to
settle; the smallest additions that make the checks decidable:
- **`screens[].stories`** (`US-<n>`[], optional): the HELIX stories a screen
  serves. US-087-AC4 needs to know which stories "an app screen serves",
  and nothing above said. With a HELIX marker, each needs a journey.
- **`checkBlueprint(blueprint, { helix }?)`**: `helix` is
  `{ stories: { "US-<n>": { criteria: ["US-<n>-AC<m>", …] } } }`. The library
  reads no files; `ux-builder-blueprint check` reads the stories under the
  `.helix.yml` found walking up from the blueprint file (to the git root),
  never writing. Without stories the story checks are skipped, and the
  command says so (a `note` line; with `--json`, on stderr, so stdout stays
  the findings array).
- **Story findings** (a story a screen serves with no journey, a story or
  criterion HELIX lacks) all report `journey.story-covered`. A criterion
  that is not of the journey's own story (`US-13-AC1` in a `US-12` journey)
  is a `blueprint.valid` error, as the field's rule says.
- **A step on a modal** names it `"screen": "modal:<id>"`, a modal of the
  screen the journey is on.
- **Targets**: `state:<s>` exists when `s` is `empty`, `loading`, `error`,
  a state the screen declares, or a status of its pattern. An action in a
  modal opens (`modal:`) a modal of the same screen.
- **Reachability** starts at the destinations (a view: its first screen) and
  follows every action of a reached screen and of its modals. The blueprint
  has no per-size-class navigation yet, so a finding names every supported
  size class.
- **Dead ends**: only screens and modals that declare `actions` are
  checked; an entry screen (a destination, or a view's first screen) is
  never one, since the app's navigation or the host leads on, and a modal's
  `dismiss` is a way back.
- **Error coverage**: a screen on the journey's steps that declares
  `error` needs an alternate with a step on it whose `state` or `expect` is
  `error`.
- **Views of one list** (FLW-03): an action whose label is in
  `destructiveActions` or `ai.highImpactActions` takes its safeguard or
  approval from there; `actions[].destructive: "none"` is reported by
  `action.destructive-safeguard` as `destructiveActions` is, and
  `actions[].highImpact` counts as a declared high-impact action.

## Error Semantics

| Case | Result |
|---|---|
| Blueprint is not JSON | `check` exits 2 with the parse error |
| Blueprint fails the schema | One `blueprint.valid` error per problem, with its path |
| Unknown pattern | `pattern.exists` error naming the nearest catalogue pattern |
| `screens[].ai` fails the schema, or an AI rule quotes a source *[Amended 2026-10-21]* | `blueprint.valid` error; `npm run check` fails |
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
