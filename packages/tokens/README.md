# @ux-builder/tokens

Theme tokens for apps built with ux-builder: CSS
custom properties per theme, and every token's resolved value per theme and
appearance. Built from
[DocumentDrivenDX/ux-builder](https://github.com/DocumentDrivenDX/ux-builder);
change the token files there, not the output here.

## Installing

```sh
npm install @ux-builder/tokens
```

Most apps also install `@ux-builder/ui` (the widgets) and start from the guide
in the repository README, *Quick start*.

## What you get

| Import | Contents |
|---|---|
| `@ux-builder/tokens/themes/<theme>.css` | One theme, selected with `data-theme` and an optional `data-appearance`: `databricks`, `praxis`, `praxis-material`, `praxis-fluentui`, `praxis-carbon`, `praxis-v2-databricks`, `synaptiq`, `plain` |
| `@ux-builder/tokens/themes.css` | Every theme in one file |
| `@ux-builder/tokens/fonts/<theme>.css`, `fonts.css` | The faces one theme uses, or every bundled face; browsers fetch only what a page uses |
| `@ux-builder/tokens/resolved/<theme>.<appearance>.json` | Every token's final value for one theme: what the harness passes to an embedded view |
| `@ux-builder/tokens/manifest.json` | Themes with their title, brand, design system, default and appearances; brands; design systems |
| `@ux-builder/tokens/brands/<brand>.css`, `design-systems/<design-system>.css` | A preview surface for tools (`data-brand`, `data-design-system`): any brand on any shared design system. Apps select themes. |
| `@ux-builder/tokens/bridges/shadcn/<theme>.css` | The theme mapped onto shadcn/ui's variables, which style AI Elements and assistant-ui's components. Follows `data-theme` and `data-appearance`, with no `.dark` class; contrast-checked like the theme. Inside a themed element it gives the 0.x aliases `--accent`, `--border`, `--muted` and `--radius` shadcn's meanings |
| `@ux-builder/tokens/brand/…` | Artwork the CSS points at |

```js
import "@ux-builder/tokens/themes/databricks.css";
import "@ux-builder/tokens/fonts/databricks.css";
```

```html
<html data-theme="synaptiq">                          <!-- its default appearance, light -->
<html data-theme="praxis-carbon" data-appearance="light">
```

Fonts are bundled (OFL-1.1, each licence beside its files): Roboto and Roboto
Mono (Material), IBM Plex Sans and Mono (Carbon), DM Sans and Mono
(Databricks), Abril Fatface, Zilla Slab and Quicksand (Synaptiq). Segoe UI (Fluent) ships with Windows and falls back to the
system face elsewhere; Praxis and Plain use system faces.

Token names are roles (`--piq-color-text`, `--piq-button-radius`); every 0.x
name (`--paper`, `--navy`) works as an alias until 2.0.0. A theme set inside
another resets every token it does not set (1.4.0), so the outer theme never
shows through.

An assistant built on AI Elements or assistant-ui wears the theme with one
more import, after the theme (CopilotKit is not supported):

```js
import "@ux-builder/tokens/themes/praxis-carbon.css";
import "@ux-builder/tokens/bridges/shadcn/praxis-carbon.css";   // AI Elements or assistant-ui
```

Each GitHub release of this package carries `gallery.html`, every theme and
token on one page. The SDK's packages declare `"license": "UNLICENSED"` and
ship `THIRD-PARTY-NOTICES.md`; `npm run licences` checks every shipped
third-party licence (ADR-023).
