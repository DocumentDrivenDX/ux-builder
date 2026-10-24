# @ux-builder/mcp

An MCP server that gives AI coding agents the AI-UI SDK: themes, brands,
design systems, widgets with their props, tokens with their purposes, icons
and the usage rules. It reads the `@ux-builder/ui` catalogue and
`@ux-builder/tokens` installed beside it, so it describes the SDK version the
app uses.

```sh
claude mcp add ux-builder -- npx @ux-builder/mcp
```

Any MCP client can run it over stdio: the command is `npx @ux-builder/mcp` (bin
`ux-builder-mcp`).

| Tool | Returns |
|---|---|
| `list_themes` | Every theme: brand, design system, appearances, and its CSS and font imports |
| `get_theme` | One theme's imports, icon set and every role token's value in an appearance |
| `list_brands`, `list_design_systems` | Brands and shared design systems |
| `list_widgets`, `get_widget` | Widgets; one widget's props, defaults and import line |
| `list_tokens`, `get_token` | Tokens with their purpose; one token's value in every theme |
| `list_icons` | Icon names, optionally matching a query |
| `list_renderable` | The components an assistant may render from a tool result (`{ component, props }`), each with its import and props JSON Schema |
| `get_guidance` | The SDK's rules and how-tos (`@ux-builder/ui/AGENTS.md`), with the plan, check, build, lint and audit loop |
| `get_rules` | The interaction and IA rules for a context (`app`, `view`), size classes and inputs, each with its ID, checks and sources |
| `list_recipes`, `get_recipe` | Recipes for a job described in words, best match first; one recipe's patterns and rule IDs |
| `get_blueprint_schema` | The JSON Schema of the blueprint (`docs/ux-builder/blueprint/app.blueprint.json`), with a starting blueprint for an app and a view |
| `check_blueprint` | A blueprint's findings: rule ID, severity, path, message and fix |
| `propose_from_blueprint` | HELIX content drafted from a blueprint's flow and journeys, as patches with a disagreement report; reads the HELIX documents above the blueprint's `path`, writes and applies nothing |
| `check_card` | An Adaptive Card payload's findings (schema 1.6 and the `card.*` rules), as `checkCard` returns them |
| `start_episode` | Opens an episode in the app's trace (`goal`, `stories`, `screens`, `journeys`, `agent`, `model`, `transcripts`); returns its ID and the commit trailer. Refused while one is open |
| `record_decision` | Records a decision: `chose` and `why` (both required; `why` is masked), `considered`, `relied` (rule and story IDs), `departs`, `workaround`, `screen`. Without `chose` or `why`, an error naming it, and nothing written |
| `end_episode` | Closes the episode (`status`: `done` or `abandoned`; `assessment`: a run directory after `assess compare`): its commits, change, outcome and warnings |

The tool list is the one `createServer()` registers; the project site and
the tests read it from the source.

## The episode trace

With `@ux-builder/trace` installed (a created app has it), the server writes
to the app's episode trace (FEAT-016, CONTRACT-007):

- **Which app**: the server's working directory, as `claude mcp add` and
  other hosts start it in the project; `UX_BUILDER_APP=<dir>` names another.
  The trace is in the nearest folder at or above it that has `.ux-builder/`.
  Where there is none, the tools write nothing until `start_episode` opens
  an episode there.
- **Every other tool** writes a `guidance` event to the open episode (else
  the branch's unscoped one): the tool, its arguments, and a summary of its
  answer, `{ ruleIds, components, recipes, guidanceHash, bytes }`. An object
  argument (a blueprint, a card) is kept only by its `sha256` and size, never
  its contents.
- **`check_blueprint` and `check_card`** also write a `check` event
  (`blueprint`, `card`): status, attempt, and each rule's severity and count.
- **`start_episode`, `record_decision` and `end_episode`** write the agent's
  side: the episode's goal, its decisions, and its close.

Resources: `ux-builder://catalogue` (the full catalogue, JSON) and
`ux-builder://guidance` (the guidance, Markdown).
