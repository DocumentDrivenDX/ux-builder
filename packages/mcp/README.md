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
| `get_guidance` | The SDK's rules and how-tos (`@ux-builder/ui/AGENTS.md`) |

Resources: `ux-builder://catalogue` (the full catalogue, JSON) and
`ux-builder://guidance` (the guidance, Markdown).
