---
ddx:
  id: design-system
  authoring:
    home: repo
---

# DESIGN.md — [App Name]

This is the per-project **interface system**: the concrete UX/design-system
decisions this app commits to. It is this app's *instance* of the interface
guidelines in the `ux-interaction-patterns` concern — not a copy of the concern library.

## Modalities, Size Classes and App Frame

[Optional. For an app that supports more than one modality or size class, or
that chooses its app frame deliberately. Delete if not relevant.]

- **Supported modalities**: [screen, voice, chat]
- **Size classes**: [compact below 600 px, medium to 1024 px, expanded above]
- **App frame**: [screen | top-bar | top-nav | side-nav], [per size class if it changes]

## Navigation and Active State

[Describe the navigation model: top nav, sidebar, tabs, or a combination, and
where each is used.]

**Active-state convention (required):** When the user is on a navigable
destination, the active nav item shows a visible active state **and** carries
`aria-current="page"`. State the concrete visible cue (e.g. "left border +
bolder label + tinted background") and bind it to a stable class/token so the
visual style is *derived from* the active state. `aria-current` is also an
accessibility signal (composes with `a11y-wcag-aa`). State the **contract** here
(the cue + how the visible style binds to the state); *which* test asserts it,
on *which* route, belongs in the story/project test plan — not in DESIGN.md.

| Surface | Component | Active cue (visible) | Semantic |
|---|---|---|---|
| [Primary nav] | [e.g. sidebar links] | [e.g. tinted bg + left border] | `aria-current="page"` |
| [Secondary nav] | [e.g. tabs] | [e.g. underline] | `aria-selected` |

### Destinations by Size Class

[Optional. Where each top-level destination appears at each size class.]

| Destination | Compact | Medium | Expanded |
|---|---|---|---|
| [Destination] | [bottom bar / menu / hidden] | [rail] | [side nav] |

## Visual Hierarchy

[How the interface ranks importance. Name the rules, not adjectives.]

- **Layout**: [primary regions, where the eye lands first, density]
- **Type scale**: [the steps — e.g. display / h1 / h2 / body / caption]
- **Weight & emphasis**: [how primary vs secondary vs tertiary content is distinguished]
- **Spacing rhythm**: [the spacing pattern that separates and groups content]

## Interaction States

State the interaction states this app uses, **where applicable** — only where
the state actually exists for that element, not every state on every element.

| State | Applies to | Convention |
|---|---|---|
| Hover + `:focus-visible` | Enabled interactive controls (buttons, links, toggles, inputs) | [visible hover + keyboard focus ring] |
| Disabled | [controls that can be disabled] | [disabled affordance + `disabled`/`aria-disabled`, not color alone] |
| Loading | [async actions: save, submit, fetch] | [progress signal + double-submit guard] |
| Empty | [data/content surfaces] | [icon + message + primary action] |
| Error | [data/form surfaces] | [message + retry/fix path; no raw error codes] |

## Tokens

Choose one source of truth: concrete local values, or external token references
with package/source, installed version, selected theme (or host-resolved embedded
tokens), supported appearances and component mappings. For an external package use
token names verified in installed-version documentation; reference its palette
and customize components through documented APIs rather than unsupported
internal overrides. Keep exact props/wiring in TDs and test assertions in STPs.

### Color
[Palette: brand, neutrals, semantic (success/warning/danger/info), surfaces.]

### Spacing
[Spacing scale — e.g. 4 / 8 / 12 / 16 / 24 / 32 / 48.]

### Type
[Font families and the type scale with sizes/line-heights/weights.]

## Non-Goals

This document is the **interface system only**. It deliberately does NOT cover:

- **Runtime architecture** — containers, services, deployment → `architecture.md`.
- **Data flow** — how data moves through the system → `architecture.md` / solution design.
- **Component implementation internals** — props, state management, file layout
  → technical designs (`TD-XXX`).
- **Architecture-significant decisions** — these belong in **ADRs**, not here.

If a decision is about *how the system is built* rather than *how the interface
looks and behaves*, it belongs in architecture / solution-design / ADRs.

### Navigation applicability

The active-page convention applies only where page navigation exists. For a
single-surface or embedded view with none, record in Navigation and Active State:
`Page navigation: not-applicable;` followed by a concrete reason. Do not create
navigation merely to satisfy the template. Tabs still use their own selection
semantics. Review applicability rather than accepting a bare exemption marker.
