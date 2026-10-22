---
ddx:
  id: CONTRACT-001
  type: contract
  status: accepted
  links:
    - kind: informed_by
      to: ADR-015
    - kind: informed_by
      to: ADR-011
    - kind: informed_by
      to: ADR-013
    - kind: informs
      to: FEAT-001
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: ADR-022
    - kind: informs
      to: FEAT-006
    - kind: informs
      to: FEAT-017
---

# Contract

**Contract ID**: CONTRACT-001 — Token names
**Type**: library (public CSS custom properties and DTCG token paths of `@ux-builder/tokens`)
**Version**: v1 (for `@ux-builder/tokens` 1.0.0)
**Status**: complete — accepted by the operator 2026-10-06, all six decisions as proposed (bead `ux-builder-30fc0a3a`)
**Related**: ADR-015 (rename to roles, with aliases), ADR-011 (tiered names), ADR-013 (brand × design system), FEAT-001 (THEME-10, THEME-11); ADR-021, ADR-022 and FEAT-006 for the screen-pattern tokens *[Amended 2026-10-18]*; FEAT-017 for the diagram and chart tokens *[Amended 2026-10-22]*

## Purpose

Names every public token of `@ux-builder/tokens` by its role rather than its
colour or origin, and maps each of the 178 current names (0.x, built from
`tokens/` into `packages/tokens/dist/resolved/*.json`) to its new name. Once
accepted, this table is the source the build uses to emit role names and the
aliases for every current name.

### Decisions (accepted 2026-10-06)

1. **Prefix `piq`.** New CSS variables are `--piq-…`, matching the widget
   classes (`.piq-btn`). A prefix is needed because hosts set their own
   variables in the same scope: MCP Apps hosts define `--color-text-primary`,
   `--font-sans`, `--border-radius-md` (ADR-011, ADR-012). If FEAT-005 picks a
   neutral name before 1.0, the prefix and the class prefix change together.
2. **`--navy` → `color.structure`.** It is the structural colour (primary
   buttons, selection, labels) and is near-white in dark themes and the
   brand's own colour under ADR-013.
3. **Three button tokens become roles.** `--btn-focus-ring`,
   `--btn-hover-mix` and `--btn-press-mix` are read by fields, segments,
   checkboxes and toasts, so they become `focus.ring`, `state-layer.hover`,
   `state-layer.press`.
4. **`--rail` → `color.ground-recessed`**, **`--size-intro` →
   `font-size.lead`**, **`--tracking-kicker` → `letter-spacing.eyebrow`**: the
   common terms for what they style.
5. **`--btn-text-fg` → `button.ghost-fg`.** "Text" as a variant name collides
   with "text colour"; ghost is the platform's original name for the same
   button. The React prop `variant="text"` is unchanged.
6. **`seg-*` → `choice-picker.*`, `check-*` → `check.*` with `checked`, `menu-item-on-*`
   → `menu.item-selected-*`**: component tokens are named after the component
   and the ARIA state they style.

## Scope and Boundaries

- In scope: every token in `packages/tokens/dist/resolved/*.json` today
  (178: 51 role, 116 component, 11 brand); the naming
  rules for tokens added later; alias and deprecation rules.
- Out of scope: token values (unchanged by the rename); primitive tokens,
  which FEAT-001's brand files introduce and apps never consume; the MCP Apps
  variable mapping (generated output, ADR-011).
- Owning system or team: `@ux-builder/tokens` (this repository).

## Normative Surface

### Naming rules

| Element | Type / Shape | Required | Rules | Notes |
|---------|---------------|----------|-------|-------|
| Token path | Dot-separated lowercase kebab segments, e.g. `color.text-muted` | yes | Segment 1 MUST be a category (role tier) or a component name (component tier) or `brand`. Segments MUST match `[a-z0-9]+(-[a-z0-9]+)*`. | DTCG path in `tokens/` |
| CSS variable | `--piq-` + path with `.` replaced by `-` | yes | MUST be unique across all tokens. MUST NOT equal any 0.x name. | e.g. `--piq-color-text-muted` |
| Tier: primitive | `palette.<name>.<step>` | — | MUST NOT be read by apps or widgets; MAY appear in resolved JSON only. | Introduced by FEAT-001 |
| Tier: role | Categories `color`, `state`, `font`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `space`, `size`, `radius`, `border`, `shadow`, `focus`, `state-layer` | yes | Apps and widgets MAY read roles. A role MUST mean the same thing in every theme. | |
| Tier: component | `<component>.<part>-<property>[-<state>]` | yes | Only the named component's CSS SHOULD read it. Properties use CSS words (`bg`, `fg`, `border`, `radius`, `padding-x`, `font-size`, `font-weight`, `letter-spacing`, `text-transform`, `shadow`, `height`); `bg` and `fg` are the only abbreviations. States are suffixes: `hover`, `press`, `selected`, `checked`, `invalid`, `focus`. | |
| Tier: brand | `brand.<name>` | yes | MUST be read only by the harness (ADR-011); an embedded view MUST NOT draw the harness's brand. | |
| Design-system scope | Per token | yes | A component token a design system does not set MUST have a fallback in `@ux-builder/ui`'s CSS; a role token MUST be set by every theme. | "Defined in" column below |

### Added after acceptance

| 0.x name | Path | CSS name | Set by | Purpose |
|----------|------|----------|--------|---------|
| — | `icon.set` | `--piq-icon-set` | shared design systems (`material`, `fluent`, `carbon`; `databricks` sets `lucide`) | Which icon set `@ux-builder/ui`'s `Icon` draws. Optional: unset means Lucide. Read from the page, so a theme added after a `@ux-builder/ui` release still gets its design system's icons (found by the end-to-end client test, 2026-10-06). |

### Name map

Every current name, its new path and CSS variable. "Defined in" says which
themes set the token today (`all` = all six; others fall back in `ui.css`).

#### Roles (51)

#### Colour (11)

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--paper` | `color.ground` | `--piq-color-ground` | all | Page background |
| `--surface` | `color.surface` | `--piq-color-surface` | all | Cards, composer, raised containers |
| `--surface-sunken` | `color.surface-sunken` | `--piq-color-surface-sunken` | all | Panels set into the ground; ground of status pills |
| `--rail` | `color.ground-recessed` | `--piq-color-ground-recessed` | Praxis family | Navigation rail: a shelf behind the work, darker than the ground |
| `--ink` | `color.text-strong` | `--piq-color-text-strong` | all | Headings and display text; strongest text |
| `--body` | `color.text` | `--piq-color-text` | all | Body text |
| `--muted` | `color.text-muted` | `--piq-color-text-muted` | all | Secondary text |
| `--muted-2` | `color.text-subtle` | `--piq-color-text-subtle` | all | Tertiary text (timestamps, hints) |
| `--navy` | `color.structure` | `--piq-color-structure` | all | Structural colour: primary buttons, selection, labels. Not a hue: near-white in dark themes |
| `--accent` | `color.accent` | `--piq-color-accent` | all | Brand accent: kickers, focus, highlights; used sparingly |
| `--rule` | `color.border` | `--piq-color-border` | all | Dividers and borders |

#### Status (5)

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--state-live` | `state.live` | `--piq-state-live` | all | Status colour: Available |
| `--state-limited` | `state.limited` | `--piq-state-limited` | all | Status colour: Available with limits |
| `--state-purchasing` | `state.purchasing` | `--piq-state-purchasing` | all | Status colour: Being purchased |
| `--state-evaluation` | `state.evaluation` | `--piq-state-evaluation` | all | Status colour: In evaluation |
| `--state-closed` | `state.closed` | `--piq-state-closed` | all | Status colour: Closed / not available |

#### Type (17)

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--font-display` | `font.display` | `--piq-font-display` | all | Font family: display |
| `--font-body` | `font.body` | `--piq-font-body` | all | Font family: body |
| `--font-heading` | `font.heading` | `--piq-font-heading` | all | Font family: heading |
| `--font-mono` | `font.mono` | `--piq-font-mono` | all | Font family: mono |
| `--size-display` | `font-size.display` | `--piq-font-size-display` | all | Font size: Display (greeting, hero) |
| `--size-title` | `font-size.title` | `--piq-font-size-title` | all | Font size: Page and section titles |
| `--size-heading` | `font-size.heading` | `--piq-font-size-heading` | all | Font size: Item headings |
| `--size-intro` | `font-size.lead` | `--piq-font-size-lead` | all | Font size: Lead / intro paragraph |
| `--size-body` | `font-size.body` | `--piq-font-size-body` | all | Font size: Body text |
| `--size-small` | `font-size.small` | `--piq-font-size-small` | all | Font size: Small text |
| `--size-label` | `font-size.label` | `--piq-font-size-label` | all | Font size: Labels and eyebrows |
| `--weight-normal` | `font-weight.regular` | `--piq-font-weight-regular` | all | Regular weight |
| `--weight-bold` | `font-weight.strong` | `--piq-font-weight-strong` | all | Emphasis weight (500–600 depending on the design system) |
| `--tracking-label` | `letter-spacing.label` | `--piq-letter-spacing-label` | all | Letter spacing for labels |
| `--tracking-kicker` | `letter-spacing.eyebrow` | `--piq-letter-spacing-eyebrow` | all | Letter spacing for eyebrows (kickers): small uppercase text above a heading |
| `--leading-tight` | `line-height.tight` | `--piq-line-height-tight` | all | Line height for headings |
| `--leading-body` | `line-height.body` | `--piq-line-height-body` | all | Line height for body text |

#### Shape, space and elevation (14)

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--radius` | `radius.control` | `--piq-radius-control` | all | Corner radius of controls and small containers |
| `--radius-card` | `radius.card` | `--piq-radius-card` | all | Corner radius of cards and panels |
| `--border` | `border.default` | `--piq-border-default` | all | Default border (width, style, colour) |
| `--shadow-card` | `shadow.card` | `--piq-shadow-card` | all | Card elevation |
| `--shadow-raised` | `shadow.overlay` | `--piq-shadow-overlay` | all | Overlay elevation: menus, popovers, toasts |
| `--space-1` | `space.1` | `--piq-space-1` | all | Spacing step 1 |
| `--space-2` | `space.2` | `--piq-space-2` | all | Spacing step 2 |
| `--space-3` | `space.3` | `--piq-space-3` | all | Spacing step 3 |
| `--space-4` | `space.4` | `--piq-space-4` | all | Spacing step 4 |
| `--space-5` | `space.5` | `--piq-space-5` | all | Spacing step 5 |
| `--space-6` | `space.6` | `--piq-space-6` | all | Spacing step 6 |
| `--space-7` | `space.7` | `--piq-space-7` | all | Spacing step 7 |
| `--space-8` | `space.8` | `--piq-space-8` | all | Spacing step 8 |
| `--measure` | `size.measure` | `--piq-size-measure` | all | Maximum line length for reading text |

#### Interaction (4)

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--btn-focus-ring` | `focus.ring` | `--piq-focus-ring` | all | Focus indicator for every control (was a button token; fields, segments, checkboxes and toasts read it too) |
| `--btn-focus-offset` | `focus.offset` | `--piq-focus-offset` | all | Focus indicator offset |
| `--btn-hover-mix` | `state-layer.hover` | `--piq-state-layer-hover` | M3, Fluent, Carbon | Hover state layer: share of the label colour mixed over the container |
| `--btn-press-mix` | `state-layer.press` | `--piq-state-layer-press` | M3, Fluent, Carbon | Pressed state layer |

#### Components (116)

#### `button` (15)

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--btn-radius` | `button.radius` | `--piq-button-radius` | all | Corner radius |
| `--btn-min-height` | `button.height` | `--piq-button-height` | all | Minimum height |
| `--btn-pad-x` | `button.padding-x` | `--piq-button-padding-x` | all | Horizontal padding |
| `--btn-weight` | `button.font-weight` | `--piq-button-font-weight` | all | Label weight |
| `--btn-size` | `button.font-size` | `--piq-button-font-size` | all | Label size |
| `--btn-lift` | `button.shadow` | `--piq-button-shadow` | all | Elevation at rest |
| `--btn-lift-hover` | `button.shadow-hover` | `--piq-button-shadow-hover` | all | Elevation on hover |
| `--btn-lift-press` | `button.shadow-press` | `--piq-button-shadow-press` | all | Elevation when pressed |
| `--btn-shift-hover` | `button.offset-hover` | `--piq-button-offset-hover` | all | Vertical shift on hover |
| `--btn-shift-press` | `button.offset-press` | `--piq-button-offset-press` | all | Vertical shift when pressed |
| `--btn-lift-quiet` | `button.shadow-flat` | `--piq-button-shadow-flat` | all | Elevation of secondary, ghost and disabled buttons |
| `--btn-secondary-bg` | `button.secondary-bg` | `--piq-button-secondary-bg` | M3, Fluent, Carbon | Secondary button fill |
| `--btn-secondary-fg` | `button.secondary-fg` | `--piq-button-secondary-fg` | M3, Fluent, Carbon | Secondary button label |
| `--btn-secondary-border` | `button.secondary-border` | `--piq-button-secondary-border` | M3, Fluent, Carbon | Secondary button border |
| `--btn-text-fg` | `button.ghost-fg` | `--piq-button-ghost-fg` | M3, Fluent, Carbon | Ghost (text) button label; the React variant is "text" |

#### `pill` (10)

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--pill-radius` | `pill.radius` | `--piq-pill-radius` | all | Corner radius |
| `--pill-border` | `pill.border` | `--piq-pill-border` | all | Border |
| `--pill-bg` | `pill.bg` | `--piq-pill-bg` | all | Fill |
| `--pill-pad` | `pill.padding` | `--piq-pill-padding` | all | Padding |
| `--pill-gap` | `pill.gap` | `--piq-pill-gap` | all | Gap between dot and label |
| `--pill-dot-size` | `pill.dot-size` | `--piq-pill-dot-size` | all | Status dot size; 0 removes it |
| `--pill-weight` | `pill.font-weight` | `--piq-pill-font-weight` | all | Label weight |
| `--pill-size` | `pill.font-size` | `--piq-pill-font-size` | all | Label size |
| `--pill-transform` | `pill.text-transform` | `--piq-pill-text-transform` | all | Label case |
| `--pill-tracking` | `pill.letter-spacing` | `--piq-pill-letter-spacing` | all | Label letter spacing |

#### `badge` (4)

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--badge-bg` | `badge.bg` | `--piq-badge-bg` | all | Fill |
| `--badge-fg` | `badge.fg` | `--piq-badge-fg` | all | Count colour |
| `--badge-radius` | `badge.radius` | `--piq-badge-radius` | all | Corner radius |
| `--badge-size` | `badge.font-size` | `--piq-badge-font-size` | all | Count size |

#### `field` (16)

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--field-height` | `field.height` | `--piq-field-height` | M3, Fluent, Carbon | Minimum height |
| `--field-pad-x` | `field.padding-x` | `--piq-field-padding-x` | M3, Fluent, Carbon | Horizontal padding |
| `--field-bg` | `field.bg` | `--piq-field-bg` | M3, Fluent, Carbon | Fill |
| `--field-border` | `field.border` | `--piq-field-border` | M3, Fluent, Carbon | Border, all sides |
| `--field-border-bottom` | `field.border-bottom` | `--piq-field-border-bottom` | M3, Fluent, Carbon | Bottom border (Material and Carbon indicators) |
| `--field-radius` | `field.radius` | `--piq-field-radius` | M3, Fluent, Carbon | Corner radius |
| `--field-hover-edge` | `field.border-hover` | `--piq-field-border-hover` | M3, Fluent, Carbon | Bottom border colour on hover |
| `--field-focus-outline` | `field.focus-outline` | `--piq-field-focus-outline` | M3, Fluent, Carbon | Focus outline |
| `--field-focus-offset` | `field.focus-offset` | `--piq-field-focus-offset` | M3, Fluent, Carbon | Focus outline offset |
| `--field-focus-shadow` | `field.focus-shadow` | `--piq-field-focus-shadow` | M3, Fluent, Carbon | Focus indicator drawn as a shadow (Material, Fluent underline) |
| `--field-invalid-shadow` | `field.invalid-shadow` | `--piq-field-invalid-shadow` | M3, Fluent, Carbon | Error indicator |
| `--field-label-fg` | `field.label-fg` | `--piq-field-label-fg` | M3, Fluent, Carbon | Label colour |
| `--field-label-size` | `field.label-font-size` | `--piq-field-label-font-size` | M3, Fluent, Carbon | Label size |
| `--field-label-weight` | `field.label-font-weight` | `--piq-field-label-font-weight` | M3, Fluent, Carbon | Label weight |
| `--field-label-tracking` | `field.label-letter-spacing` | `--piq-field-label-letter-spacing` | M3, Fluent, Carbon | Label letter spacing |
| `--field-label-transform` | `field.label-text-transform` | `--piq-field-label-text-transform` | M3, Fluent, Carbon | Label case |

#### `check` (5)

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--check-size` | `check.size` | `--piq-check-size` | M3, Fluent, Carbon | Checkbox and radio size |
| `--check-radius` | `check.radius` | `--piq-check-radius` | M3, Fluent, Carbon | Checkbox corner radius |
| `--check-border` | `check.border` | `--piq-check-border` | M3, Fluent, Carbon | Checkbox and radio border |
| `--check-on-bg` | `check.checked-bg` | `--piq-check-checked-bg` | M3, Fluent, Carbon | Checked fill (radio dot) |
| `--check-on-fg` | `check.checked-fg` | `--piq-check-checked-fg` | M3, Fluent, Carbon | Checkmark colour |

#### `switch` (11)

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--switch-width` | `switch.width` | `--piq-switch-width` | M3, Fluent, Carbon | Track width |
| `--switch-height` | `switch.height` | `--piq-switch-height` | M3, Fluent, Carbon | Track height |
| `--switch-radius` | `switch.radius` | `--piq-switch-radius` | M3, Fluent, Carbon | Track corner radius |
| `--switch-inset` | `switch.thumb-inset` | `--piq-switch-thumb-inset` | M3, Fluent, Carbon | Thumb distance from the track edge |
| `--switch-off-bg` | `switch.track-bg` | `--piq-switch-track-bg` | M3, Fluent, Carbon | Track fill, off |
| `--switch-off-border` | `switch.track-border` | `--piq-switch-track-border` | M3, Fluent, Carbon | Track border, off |
| `--switch-thumb-off` | `switch.thumb-size` | `--piq-switch-thumb-size` | M3, Fluent, Carbon | Thumb size, off |
| `--switch-thumb-off-bg` | `switch.thumb-bg` | `--piq-switch-thumb-bg` | M3, Fluent, Carbon | Thumb colour, off |
| `--switch-on-bg` | `switch.checked-track-bg` | `--piq-switch-checked-track-bg` | M3, Fluent, Carbon | Track fill, on |
| `--switch-thumb-on` | `switch.checked-thumb-size` | `--piq-switch-checked-thumb-size` | material | Thumb size, on (Material grows it) |
| `--switch-thumb-on-bg` | `switch.checked-thumb-bg` | `--piq-switch-checked-thumb-bg` | M3, Fluent, Carbon | Thumb colour, on |

#### `menu` (11)

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--menu-radius` | `menu.radius` | `--piq-menu-radius` | M3, Fluent, Carbon | Open list corner radius |
| `--menu-shadow` | `menu.shadow` | `--piq-menu-shadow` | M3, Fluent, Carbon | Open list elevation |
| `--menu-border` | `menu.border` | `--piq-menu-border` | M3, Fluent, Carbon | Open list border |
| `--menu-bg` | `menu.bg` | `--piq-menu-bg` | M3, Fluent, Carbon | Open list fill |
| `--menu-pad-y` | `menu.padding-y` | `--piq-menu-padding-y` | M3, Fluent, Carbon | Space above and below the items |
| `--menu-item-height` | `menu.item-height` | `--piq-menu-item-height` | M3, Fluent, Carbon | Item height |
| `--menu-item-hover` | `menu.item-hover-bg` | `--piq-menu-item-hover-bg` | M3, Fluent, Carbon | Item fill on hover |
| `--menu-item-on-bg` | `menu.item-selected-bg` | `--piq-menu-item-selected-bg` | M3, Fluent, Carbon | Selected item fill |
| `--menu-item-on-fg` | `menu.item-selected-fg` | `--piq-menu-item-selected-fg` | M3, Fluent, Carbon | Selected item text |
| `--menu-item-on-weight` | `menu.item-selected-font-weight` | `--piq-menu-item-selected-font-weight` | M3, Fluent, Carbon | Selected item weight |
| `--menu-item-on-mark` | `menu.item-selected-indicator` | `--piq-menu-item-selected-indicator` | fluentui | Selected item indicator (Fluent bar) |

#### `choice-picker` (16)

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--seg-height` | `choice-picker.height` | `--piq-choice-picker-height` | M3, Fluent, Carbon | Height |
| `--seg-radius` | `choice-picker.radius` | `--piq-choice-picker-radius` | M3, Fluent, Carbon | Group corner radius |
| `--seg-gap` | `choice-picker.gap` | `--piq-choice-picker-gap` | M3, Fluent, Carbon | Gap between options; 0 joins them |
| `--seg-outline` | `choice-picker.border` | `--piq-choice-picker-border` | M3, Fluent, Carbon | Group border |
| `--seg-divider` | `choice-picker.divider` | `--piq-choice-picker-divider` | M3, Fluent, Carbon | Divider between joined options |
| `--seg-pad-x` | `choice-picker.padding-x` | `--piq-choice-picker-padding-x` | M3, Fluent, Carbon | Option horizontal padding |
| `--seg-bg` | `choice-picker.option-bg` | `--piq-choice-picker-option-bg` | M3, Fluent, Carbon | Option fill |
| `--seg-fg` | `choice-picker.option-fg` | `--piq-choice-picker-option-fg` | M3, Fluent, Carbon | Option label |
| `--seg-hover-bg` | `choice-picker.option-hover-bg` | `--piq-choice-picker-option-hover-bg` | M3, Fluent, Carbon | Option fill on hover |
| `--seg-on-bg` | `choice-picker.option-selected-bg` | `--piq-choice-picker-option-selected-bg` | M3, Fluent, Carbon | Selected option fill |
| `--seg-on-fg` | `choice-picker.option-selected-fg` | `--piq-choice-picker-option-selected-fg` | M3, Fluent, Carbon | Selected option label |
| `--seg-size` | `choice-picker.font-size` | `--piq-choice-picker-font-size` | M3, Fluent, Carbon | Label size |
| `--seg-weight` | `choice-picker.font-weight` | `--piq-choice-picker-font-weight` | M3, Fluent, Carbon | Label weight |
| `--seg-opt-radius` | `choice-picker.option-radius` | `--piq-choice-picker-option-radius` | fluentui | Option corner radius (separated options) |
| `--seg-opt-border` | `choice-picker.option-border` | `--piq-choice-picker-option-border` | fluentui | Option border (separated options) |
| `--seg-tick` | `choice-picker.option-selected-check` | `--piq-choice-picker-option-selected-check` | material | Display of the selected option's check mark (Material) |

#### `card` (3)

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--card-bg` | `card.bg` | `--piq-card-bg` | M3, Fluent, Carbon | Fill |
| `--card-border` | `card.border` | `--piq-card-border` | M3, Fluent, Carbon | Border |
| `--card-pad` | `card.padding` | `--piq-card-padding` | M3, Fluent, Carbon | Padding |

#### `notice` (6)

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--notice-radius` | `notice.radius` | `--piq-notice-radius` | M3, Fluent, Carbon | Corner radius |
| `--notice-stripe` | `notice.stripe-width` | `--piq-notice-stripe-width` | M3, Fluent, Carbon | Leading stripe width in the tone colour |
| `--notice-border-width` | `notice.border-width` | `--piq-notice-border-width` | M3, Fluent, Carbon | Border width |
| `--notice-edge-mix` | `notice.border-tone-mix` | `--piq-notice-border-tone-mix` | carbon, fluentui | Share of the tone colour in the border |
| `--notice-bg` | `notice.bg` | `--piq-notice-bg` | M3, Fluent, Carbon | Fill before tinting |
| `--notice-tint` | `notice.tone-mix` | `--piq-notice-tone-mix` | M3, Fluent, Carbon | Share of the tone colour in the fill |

#### `toast` (6)

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--toast-bg` | `toast.bg` | `--piq-toast-bg` | M3, Fluent, Carbon | Fill |
| `--toast-fg` | `toast.fg` | `--piq-toast-fg` | M3, Fluent, Carbon | Message colour |
| `--toast-action-fg` | `toast.action-fg` | `--piq-toast-action-fg` | M3, Fluent, Carbon | Action (Undo) colour |
| `--toast-radius` | `toast.radius` | `--piq-toast-radius` | M3, Fluent, Carbon | Corner radius |
| `--toast-shadow` | `toast.shadow` | `--piq-toast-shadow` | M3, Fluent, Carbon | Elevation |
| `--toast-stripe` | `toast.stripe-width` | `--piq-toast-stripe-width` | M3, Fluent, Carbon | Leading stripe width |

#### `table` (13)

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--table-size` | `table.font-size` | `--piq-table-font-size` | M3, Fluent, Carbon | Cell text size |
| `--table-row-height` | `table.row-height` | `--piq-table-row-height` | M3, Fluent, Carbon | Row height |
| `--table-head-height` | `table.header-height` | `--piq-table-header-height` | M3, Fluent, Carbon | Header row height |
| `--table-pad-x` | `table.cell-padding-x` | `--piq-table-cell-padding-x` | M3, Fluent, Carbon | Cell horizontal padding |
| `--table-pad-y` | `table.cell-padding-y` | `--piq-table-cell-padding-y` | M3, Fluent, Carbon | Cell vertical padding |
| `--table-head-bg` | `table.header-bg` | `--piq-table-header-bg` | M3, Fluent, Carbon | Header fill |
| `--table-head-fg` | `table.header-fg` | `--piq-table-header-fg` | M3, Fluent, Carbon | Header text |
| `--table-head-size` | `table.header-font-size` | `--piq-table-header-font-size` | M3, Fluent, Carbon | Header text size |
| `--table-head-weight` | `table.header-font-weight` | `--piq-table-header-font-weight` | M3, Fluent, Carbon | Header weight |
| `--table-head-tracking` | `table.header-letter-spacing` | `--piq-table-header-letter-spacing` | M3, Fluent, Carbon | Header letter spacing |
| `--table-head-transform` | `table.header-text-transform` | `--piq-table-header-text-transform` | M3, Fluent, Carbon | Header case |
| `--table-head-border` | `table.header-border` | `--piq-table-header-border` | M3, Fluent, Carbon | Rule under the header |
| `--table-row-hover` | `table.row-hover-bg` | `--piq-table-row-hover-bg` | M3, Fluent, Carbon | Row fill on hover |

#### Brand (11) — harness only

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| `--logo-paint` | `brand.logo-paint` | `--piq-brand-logo-paint` | all | Colour the logo is painted in where it is drawn flat |
| `--logo-image` | `brand.logo-image` | `--piq-brand-logo-image` | Praxis family | Logo artwork |
| `--logo-bg` | `brand.logo-bg` | `--piq-brand-logo-bg` | Praxis family | Logo background |
| `--logo-mask` | `brand.logo-mask` | `--piq-brand-logo-mask` | Praxis family | Logo mask, for single-colour artwork |
| `--logo-aspect` | `brand.logo-aspect` | `--piq-brand-logo-aspect` | Praxis family | Logo aspect ratio |
| `--logo-height` | `brand.logo-height` | `--piq-brand-logo-height` | Praxis family | Logo height |
| `--logo-height-sm` | `brand.logo-height-sm` | `--piq-brand-logo-height-sm` | Praxis family | Logo height, compact |
| `--mark-image` | `brand.mark-image` | `--piq-brand-mark-image` | Praxis family | Mark artwork |
| `--mark-bg` | `brand.mark-bg` | `--piq-brand-mark-bg` | Praxis family | Mark background |
| `--mark-mask` | `brand.mark-mask` | `--piq-brand-mark-mask` | Praxis family | Mark mask |
| `--favicon` | `brand.favicon` | `--piq-brand-favicon` | Praxis family | Favicon artwork |

#### Tokens added after acceptance

New tokens with no 0.x name. Additive: no accepted name changes.

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| — | `color.on-accent` | `--piq-color-on-accent` | every brand | Text and counts drawn on the accent; today only the literal value of `--badge-fg`. Added by CONTRACT-002 (2026-10-06) |
| — | `check.focus-offset` | `--piq-check-focus-offset` | none (ui.css fallback) | Focus outline offset of checkboxes and radios. A widget hook no theme sets yet; named when @ux-builder/ui moved to role names (2026-10-06) |
| — | `menu.offset` | `--piq-menu-offset` | none (ui.css fallback) | Gap between a field and its open list. A widget hook no theme sets yet; named when @ux-builder/ui moved to role names (2026-10-06) |
| — | `switch.checked-border-color` | `--piq-switch-checked-border-color` | none (ui.css fallback) | Track border colour, on. A widget hook no theme sets yet; named when @ux-builder/ui moved to role names (2026-10-06) |
| — | `choice-picker.option-selected-font-weight` | `--piq-choice-picker-option-selected-font-weight` | none (ui.css fallback) | Selected option label weight. A widget hook no theme sets yet; named when @ux-builder/ui moved to role names (2026-10-06) |
| — | `progress.height` | `--piq-progress-height` | material, carbon, fluent, databricks | Progress bar track thickness. Added by US-021 (2026-10-08) for the loading widgets; themes with their own anatomy get the ui.css fallback |
| — | `progress.radius` | `--piq-progress-radius` | material, carbon, fluent, databricks | Progress bar corner radius. Added by US-021 (2026-10-08) for the loading widgets; themes with their own anatomy get the ui.css fallback |
| — | `progress.track-bg` | `--piq-progress-track-bg` | material, carbon, fluent, databricks | Progress bar track fill. Added by US-021 (2026-10-08) for the loading widgets; themes with their own anatomy get the ui.css fallback |
| — | `progress.fill-bg` | `--piq-progress-fill-bg` | material, carbon, fluent, databricks | Progress bar fill (the amount done). Added by US-021 (2026-10-08) for the loading widgets; themes with their own anatomy get the ui.css fallback |
| — | `spinner.stroke-width` | `--piq-spinner-stroke-width` | material, carbon, fluent, databricks | Spinner stroke, in a 24-unit box. Added by US-021 (2026-10-08) for the loading widgets; themes with their own anatomy get the ui.css fallback |
| — | `spinner.line-cap` | `--piq-spinner-line-cap` | material, carbon, fluent, databricks | Spinner arc ends (`round` or `butt`). Added by US-021 (2026-10-08) for the loading widgets; themes with their own anatomy get the ui.css fallback |
| — | `spinner.track-color` | `--piq-spinner-track-color` | material, carbon, fluent, databricks | Ring under the spinner's arc (`transparent` for none). Added by US-021 (2026-10-08) for the loading widgets; themes with their own anatomy get the ui.css fallback |
| — | `skeleton.bg` | `--piq-skeleton-bg` | material, carbon, fluent, databricks | Skeleton placeholder fill (the hairline colour, so it shows on every ground). Added by US-021 (2026-10-08) for the loading widgets; themes with their own anatomy get the ui.css fallback |
| — | `skeleton.radius` | `--piq-skeleton-radius` | material, carbon, fluent, databricks | Skeleton block corner radius (circles stay round). Added by US-021 (2026-10-08) for the loading widgets; themes with their own anatomy get the ui.css fallback |
| — | `skeleton.effect` | `--piq-skeleton-effect` | material, carbon, fluent, databricks | Skeleton motion: `piq-pulse`, `piq-shimmer` or `none`. Added by US-021 (2026-10-08) for the loading widgets; themes with their own anatomy get the ui.css fallback |

#### Tokens added for screen patterns *[Amended 2026-10-18 — ADR-021, ADR-022, FEAT-006]*

Additive; no accepted name changes. Component names `nav`, `tabs` and
`page-header` join the component tier; `table` gains two tokens. Shipped in
`@ux-builder/tokens` 1.5.0. Every theme sets every one of them: the boundaries
and the default measures come from `tokens/layout.json`, the variant tokens
from the variant its anatomy chooses (CONTRACT-002, *Variants*, Composition
step 0); a design system may override a measure or one of its variant's
tokens in its own `tokens`.

**Size-class boundaries** — constants, not anatomy. Every theme block emits
them with the same values (so the nested-theme reset of CONTRACT-003 never
clears them); `@ux-builder/ui`'s `@media` and `@container` conditions use the same
numbers literally, because CSS cannot read a custom property in a query
condition (ADR-021). Published for scripts, the catalogue and the audit.

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| — | `size.breakpoint-medium` | `--piq-size-breakpoint-medium` | every theme, `600px` | Lower bound of the medium size class |
| — | `size.breakpoint-expanded` | `--piq-size-breakpoint-expanded` | every theme, `840px` | Lower bound of the expanded size class |
| — | `size.breakpoint-large` | `--piq-size-breakpoint-large` | every theme, `1200px` | Lower bound of the large size class |
| — | `size.breakpoint-extra-large` | `--piq-size-breakpoint-extra-large` | every theme, `1600px` | Lower bound of the extra-large size class |

**Layout measures** — roles with SDK defaults a design system may override.

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| — | `size.content-form` | `--piq-size-content-form` | every theme; `layout.json` default `40rem`, a design system may override | Maximum width of a form's field column |
| — | `size.content-page` | `--piq-size-content-page` | every theme; `layout.json` default `90rem`, a design system may override | Maximum width of page content in the extra-large class |
| — | `size.target-minimum` | `--piq-size-target-minimum` | every theme; `layout.json` default `1.5rem`, a design system may override | Smallest pointer target on any input; MUST NOT be below 24 CSS px (WCAG 2.5.8) |
| — | `size.target-touch` | `--piq-size-target-touch` | every theme; `layout.json` default `2.75rem`, a design system may override | Smallest target under `pointer: coarse`; SHOULD be at least 44 CSS px |
| — | `space.gutter-compact` | `--piq-space-gutter-compact` | every theme; `layout.json` default `{space.4}`, a design system may override | Page side gutter, compact class |
| — | `space.gutter-medium` | `--piq-space-gutter-medium` | every theme; `layout.json` default `{space.5}`, a design system may override | Page side gutter, medium class |
| — | `space.gutter-expanded` | `--piq-space-gutter-expanded` | every theme; `layout.json` default `{space.6}`, a design system may override | Page side gutter, expanded class |
| — | `space.gutter-large` | `--piq-space-gutter-large` | every theme; `layout.json` default `{space.6}`, a design system may override | Page side gutter, large class |
| — | `space.gutter-extra-large` | `--piq-space-gutter-extra-large` | every theme; `layout.json` default `{space.7}`, a design system may override | Page side gutter, extra-large class |

**Variant tokens** — component tier. The variant a theme's anatomy chooses
(CONTRACT-002, *Variants*) supplies their values; an anatomy that names none
gets the point's default, which is also the `ui.css` fallback.

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| — | `nav.width` | `--piq-nav-width` | every theme, from its `navigation` variant | Width of the persistent navigation at expanded size and above |
| — | `nav.item-direction` | `--piq-nav-item-direction` | every theme, from its `navigation` variant | `row` (icon beside label) or `column` (icon above label, as in a rail) |
| — | `nav.item-gap` | `--piq-nav-item-gap` | every theme, from its `navigation` variant | Gap between a destination's icon and label |
| — | `nav.item-label-font-size` | `--piq-nav-item-label-font-size` | every theme, from its `navigation` variant | Destination label size |
| — | `nav.item-selected-bg` | `--piq-nav-item-selected-bg` | every theme, from its `navigation` variant | Fill of the current destination |
| — | `nav.item-selected-border` | `--piq-nav-item-selected-border` | every theme, from its `navigation` variant | Edge indicator of the current destination (`none` for fill only) |
| — | `nav.bar-height` | `--piq-nav-bar-height` | every theme, from its `navigation` variant | Height of the bottom navigation bar in the compact class |
| — | `tabs.indicator-height` | `--piq-tabs-indicator-height` | every theme, from its `tabs` variant | Thickness of the selected tab's underline (`0` when enclosed) |
| — | `tabs.list-border` | `--piq-tabs-list-border` | every theme, from its `tabs` variant | Rule under the tab list |
| — | `tabs.tab-bg-selected` | `--piq-tabs-tab-bg-selected` | every theme, from its `tabs` variant | Fill of the selected tab (`transparent` when underlined) |
| — | `tabs.tab-radius` | `--piq-tabs-tab-radius` | every theme, from its `tabs` variant | Corner radius of a tab |
| — | `tabs.tab-padding-x` | `--piq-tabs-tab-padding-x` | every theme, from its `tabs` variant | Tab horizontal padding |
| — | `page-header.title-font-size` | `--piq-page-header-title-font-size` | every theme, from its `page-header` variant | Size of the page title |
| — | `page-header.padding-y` | `--piq-page-header-padding-y` | every theme, from its `page-header` variant | Space above and below the header |
| — | `page-header.gap` | `--piq-page-header-gap` | every theme, from its `page-header` variant | Space between title, status and actions |
| — | `table.row-stripe-bg` | `--piq-table-row-stripe-bg` | every theme, from its `table` variant | Fill of alternate rows (`transparent` when ruled) |
| — | `table.row-border` | `--piq-table-row-border` | every theme, from its `table` variant | Rule between rows (`none` when banded) |

#### Tokens added for diagrams and charts *[Amended 2026-10-22 — FEAT-017]*

Additive; no accepted name changes. Every theme and preview pair sets every
one of them in every appearance (CONTRACT-002 Composition step 4). Status
and series values are SDK defaults in `tokens/dataviz.json`, one set per
appearance, which a brand MAY replace per appearance; the others are derived
from the brand's own roles, so they follow its ground. Stroke and radius are
anatomy: `tokens/layout.json` defaults, which Carbon (`0`, `1px`), Fluent
(`4px`, `1px`), Material (`12px`) and Databricks (`8px`) override. The
contrast each MUST clear is checked by `npm run contrast` in every theme,
appearance and preview pair; neighbouring series MUST also stay at least
8 ΔE apart (OKLab ×100) under simulated protanopia and deuteranopia and 15
with normal vision. `state.*` (availability) and `color.status-*`
(outcomes) are separate families.

| Current | New path | New CSS variable | Defined in | Meaning |
|---|---|---|---|---|
| — | `color.status-positive` | `--piq-color-status-positive` | every theme; `dataviz.json` default per appearance, a brand MAY set its own | Status, good: a target met, a test passed. Clears 4.5:1 on the ground and a card, so it MAY be text |
| — | `color.status-positive-subtle` | `--piq-color-status-positive-subtle` | every theme; derived: `color-mix()` of `status-positive` 12% into `surface` | Fill behind a positive value or chip; `color.text` clears 4.5:1 on it, and `status-positive` 3:1 as a mark |
| — | `color.status-caution` | `--piq-color-status-caution` | every theme; `dataviz.json` default per appearance, a brand MAY set its own | Status, needs attention: near a threshold, partial. Clears 4.5:1 on the ground and a card, so it MAY be text |
| — | `color.status-caution-subtle` | `--piq-color-status-caution-subtle` | every theme; derived: `color-mix()` of `status-caution` 12% into `surface` | Fill behind a caution value or chip; `color.text` clears 4.5:1 on it, and `status-caution` 3:1 as a mark |
| — | `color.status-negative` | `--piq-color-status-negative` | every theme; `dataviz.json` default per appearance, a brand MAY set its own | Status, bad: a threshold missed, a failure. Clears 4.5:1 on the ground and a card, so it MAY be text |
| — | `color.status-negative-subtle` | `--piq-color-status-negative-subtle` | every theme; derived: `color-mix()` of `status-negative` 12% into `surface` | Fill behind a negative value or chip; `color.text` clears 4.5:1 on it, and `status-negative` 3:1 as a mark |
| — | `color.status-info` | `--piq-color-status-info` | every theme; `dataviz.json` default per appearance, a brand MAY set its own | Status, neutral information. Clears 4.5:1 on the ground and a card, so it MAY be text |
| — | `color.status-info-subtle` | `--piq-color-status-info-subtle` | every theme; derived: `color-mix()` of `status-info` 12% into `surface` | Fill behind a info value or chip; `color.text` clears 4.5:1 on it, and `status-info` 3:1 as a mark |
| — | `color.series-1` | `--piq-color-series-1` | every theme; `dataviz.json` default per appearance, a brand MAY set its own | Categorical slot 1, blue. Clears 3:1 on the ground, a card and the deepest region; slots are assigned in order, never cycled |
| — | `color.series-2` | `--piq-color-series-2` | every theme; `dataviz.json` default per appearance, a brand MAY set its own | Categorical slot 2, orange. Clears 3:1 on the ground, a card and the deepest region; slots are assigned in order, never cycled |
| — | `color.series-3` | `--piq-color-series-3` | every theme; `dataviz.json` default per appearance, a brand MAY set its own | Categorical slot 3, aqua. Clears 3:1 on the ground, a card and the deepest region; slots are assigned in order, never cycled |
| — | `color.series-4` | `--piq-color-series-4` | every theme; `dataviz.json` default per appearance, a brand MAY set its own | Categorical slot 4, yellow. Clears 3:1 on the ground, a card and the deepest region; slots are assigned in order, never cycled |
| — | `color.series-5` | `--piq-color-series-5` | every theme; `dataviz.json` default per appearance, a brand MAY set its own | Categorical slot 5, magenta. Clears 3:1 on the ground, a card and the deepest region; slots are assigned in order, never cycled |
| — | `color.series-6` | `--piq-color-series-6` | every theme; `dataviz.json` default per appearance, a brand MAY set its own | Categorical slot 6, green. Clears 3:1 on the ground, a card and the deepest region; slots are assigned in order, never cycled |
| — | `color.series-7` | `--piq-color-series-7` | every theme; `dataviz.json` default per appearance, a brand MAY set its own | Categorical slot 7, violet. Clears 3:1 on the ground, a card and the deepest region; slots are assigned in order, never cycled |
| — | `color.series-8` | `--piq-color-series-8` | every theme; `dataviz.json` default per appearance, a brand MAY set its own | Categorical slot 8, red. Clears 3:1 on the ground, a card and the deepest region; slots are assigned in order, never cycled |
| — | `color.diagram-region-1` | `--piq-color-diagram-region-1` | every theme; derived: `text` 3% into `ground` | Region tint: outermost group, zone or band. `color.text` clears 4.5:1 on it; each is at least as far from the ground as the one before |
| — | `color.diagram-region-2` | `--piq-color-diagram-region-2` | every theme; derived: `text` 5% into `ground` | Region tint: a group inside region 1, or the alternate band. `color.text` clears 4.5:1 on it; each is at least as far from the ground as the one before |
| — | `color.diagram-region-3` | `--piq-color-diagram-region-3` | every theme; derived: `text` 7% into `ground` | Region tint: the innermost group. `color.text` clears 4.5:1 on it; each is at least as far from the ground as the one before |
| — | `color.diagram-edge` | `--piq-color-diagram-edge` | every theme; derived: `{color.text-muted}` | A data edge. Clears 3:1 on the ground, a card and the deepest region |
| — | `color.diagram-edge-strong` | `--piq-color-diagram-edge-strong` | every theme; derived: `{color.text}` | An action edge and the main flow. Clears 3:1 on the ground, a card and the deepest region |
| — | `color.diagram-edge-muted` | `--piq-color-diagram-edge-muted` | every theme; derived: `{color.text-subtle}` | Return and control edges, drawn dashed. Clears 3:1 on the ground, a card and the deepest region |
| — | `color.lifecycle-placeholder` | `--piq-color-lifecycle-placeholder` | every theme; derived: `accent` 10% into `surface` | Fill of a diagram part planned, not built. `color.text` clears 4.5:1 on it |
| — | `color.lifecycle-decided` | `--piq-color-lifecycle-decided` | every theme; derived: `status-info` 10% into `surface` | Fill of a diagram part decided, not built. `color.text` clears 4.5:1 on it |
| — | `color.lifecycle-unknown` | `--piq-color-lifecycle-unknown` | every theme; derived: `{color.surface-sunken}` | Fill of a diagram part of unknown status, drawn dashed. `color.text` clears 4.5:1 on it |
| — | `size.diagram-stroke` | `--piq-size-diagram-stroke` | every theme; `layout.json` default `1.5px`, a design system MAY override | Outline of a diagram node, and an edge |
| — | `size.diagram-stroke-strong` | `--piq-size-diagram-stroke-strong` | every theme; `layout.json` default `2px`, a design system MAY override | The main flow, an action edge, the outline of the project's own parts |
| — | `radius.diagram-node` | `--piq-radius-diagram-node` | every theme; `layout.json` default `8px`, a design system MAY override | Corner radius of a diagram node |

## Precedence and Compatibility

- Versioning: the role names ship in `@ux-builder/tokens` 1.0.0, a major
  release.
- Ordering or precedence: each alias is emitted as `--<old>: var(--piq-<new>)`,
  so an override of the role (for example in an embedded view's inline
  styles) also changes the alias.
- Backward-compatibility rules: every name in the table's "Current" column
  MUST resolve, through its alias, to the same value as in 0.3.0 in every
  theme, for the whole 1.x line.
- Deprecation rules: aliases are removed in 2.0.0, announced in the 1.0.0
  changelog. `@ux-builder/ui` MUST read new names only from 1.0.0.

## Error Semantics

| Condition | Error / Outcome | Retry | Recovery Expectation |
|-----------|------------------|-------|----------------------|
| Two tokens derive the same CSS variable | Build fails naming both | no | Rename one per the rules |
| A new CSS variable equals a 0.x name | Build fails | no | Rename the new token |
| A token path's first segment is not a known category, component or `brand` | Build fails | no | Add the category by contract change, or rename |
| A theme does not set a role token | Build fails naming theme and token | no | Set it in the brand or design system |
| A 0.x name has no alias | Build fails (alias test) | no | Add the alias |
| A design system, anatomy or brand sets a `size.breakpoint-*` token *[Amended 2026-10-18]* | Build fails naming the file | no | Remove it; boundaries are SDK constants (ADR-021) |
| `size.target-minimum` resolves below 24 CSS px *[Amended 2026-10-18]* | Build fails naming the theme | no | Raise it (WCAG 2.5.8) |

## Examples

```css
/* 1.x output, Praxis dark */
[data-theme="praxis"] {
  --piq-color-ground: #1B1A19;
  --piq-color-structure: #E8E6DF;
  --piq-focus-ring: 2px solid var(--piq-color-accent);
  /* aliases, removed in 2.0.0 */
  --paper: var(--piq-color-ground);
  --navy: var(--piq-color-structure);
  --btn-focus-ring: var(--piq-focus-ring);
}

/* An app reads roles */
.matter-row { color: var(--piq-color-text); border-bottom: var(--piq-border-default); }
```

## Non-Normative Notes

Starting points for the generated MCP Apps mapping (ADR-011): `color.ground` →
`--color-background-primary`, `color.surface` → `--color-background-secondary`,
`color.text` → `--color-text-primary`, `color.text-muted` →
`--color-text-secondary`, `color.border` → `--color-border-primary`,
`font.body` → `--font-sans`, `font.mono` → `--font-mono`, `radius.control` →
`--border-radius-md`. The mapping is generated output, not this contract.

The table was generated from the built tokens and checked: 178 of 178
current names mapped, no duplicate new names, no new name equal to an old one.

## Validation Checklist

- [x] Normative fields and rules are explicit.
- [x] Compatibility and precedence rules are explicit.
- [x] Error handling is explicit.
- [x] At least one executable test can be derived from this contract (alias test: every "Current" name resolves to its 0.3.0 value).
- [x] Non-normative notes cannot be mistaken for contract requirements.
- [x] Operator review of the six decisions above (accepted 2026-10-06).
