---
ddx:
  id: US-045
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-007
    - kind: informed_by
      to: ADR-023
---

# US-045: Style a chat library with the app's theme

**Feature**: FEAT-007 — Generative UI
**Feature Requirements**: BRG-01–04, BLD-02–03
**PRD Requirements**: FR-28
**Priority**: P1
**Status**: Draft

## Story

**As an** app developer whose team already uses AI Elements or assistant-ui
**I want** one stylesheet that makes the library's components wear our theme
**So that** the assistant looks like the rest of the app, in light and dark, and changes when the theme does

## Context

Requested by the operator on 2026-10-19. ADR-023 decides that libraries are
bridged, not modelled as design systems: the token build maps each theme's
tokens onto the variables the library is styled by. AI Elements and the
components assistant-ui's CLI adds are styled by shadcn's variables, the one
theming surface (assistant-ui's packaged `--aui-*` styles are unmaintained
and not supported; ADR-023 amendment). The bridge is scoped like a theme, so it follows run-time
switching and nested themes without shadcn's `.dark` class. CopilotKit is
excluded (operator, 2026-10-19).

## Walkthrough

1. A Praxis Carbon app uses AI Elements. The developer adds
   `@import "@ux-builder/tokens/bridges/shadcn/praxis-carbon.css";` after the
   theme CSS.
2. The conversation, message bubbles and prompt input take Praxis Carbon's
   accent, ground, text, border, radius and fonts.
3. The user switches to dark; the components follow without a reload.
4. In the theme builder, step 6, the developer picks "AI Elements" and copies
   the import; the theme page shows the bridge and a sample.

## Acceptance Criteria

- [ ] **US-045-AC1** — Given the token build, when it runs, then for every theme it emits a shadcn bridge at `@ux-builder/tokens/bridges/shadcn/<theme>.css` (the variables AI Elements and assistant-ui's current components are styled by), with a block per appearance setting every variable shadcn documents from the theme's role and anatomy tokens.
- [ ] **US-045-AC2** — Given an app with `data-theme` and `data-appearance` on `<html>` and a bridge imported, when the appearance or theme changes at run time, then the library's components change with it, with no `.dark` class and no reload; a nested theme's components show the nested theme.
- [ ] **US-045-AC3** — Given a bridge, when the contrast gate runs, then every pairing the surface's library documents passes 4.5:1 for text and 3:1 for non-text in every theme × appearance, and a failing pairing fails the build naming theme, appearance, surface and pair.
- [ ] **US-045-AC4** — Given Storybook, when the bridge stories run, then each library's real components render with its bridge in every theme and appearance, and the audit reports no errors, apart from the rules that by design flag code that is not the SDK's own (`brand`, `sdk-widgets`, `foreign-components`, `widget-overrides`) and the syntax highlighter's own code colours (`.shiki`).
- [ ] **US-045-AC5** — Given a theme page in the builder, when it opens, then it shows the bridge's stylesheet and, as AI Components apart from the SDK's UI Components (in the page and in its menu), a sample of each previewed AI Elements and assistant-ui component in the theme, with its library, licence, documentation and Storybook story.
- [ ] **US-045-AC6** — Given step 6 of the builder, when the developer picks a chat library (none, AI Elements or assistant-ui), then it prints that library's command line, the bridge import and how to connect it to the AI SDK.

## Edge Cases

- **A colour the library hard-codes** (not a variable): the bridge story shows it and it is recorded as a known difference.
- **A theme with only a light appearance**: only its light bridge is emitted; `data-appearance="dark"` falls back as the theme does.
- **A theme saved in the builder since the last build**: its theme page previews its bridges composed on request.
- **A library version renames a variable**: the bridge story's audit fails before release.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Emit | US-045-AC1 | Every theme | Build | One shadcn bridge per theme, a block per appearance; every documented variable set |
| Switch | US-045-AC2 | AI Elements with the shadcn bridge, Praxis Carbon light | Set dark; nest Praxis Material | Components follow; nested part shows Material |
| Gate | US-045-AC3 | A theme whose `primary-foreground` fails | Build | Build fails naming the pair |
| Stories | US-045-AC4 | Real libraries in Storybook | Audit | No errors |
| Theme page | US-045-AC5 | `praxis-carbon` | Open its page | Bridge CSS and samples |
| Step 6 | US-045-AC6 | Saved theme | Pick assistant-ui | Bridge import and adapter |

## Dependencies

- **Stories**: US-011 (nested themes), US-020 (theme pages), US-049
- **Feature Spec**: FEAT-007
- **PRD Requirements**: FR-28
- **External**: CONTRACT-003 revision (bridge selectors); the libraries' documented theming variables as of the tested versions

## Out of Scope

- Changing a library's layout or behaviour (US-046 builds our own patterns for that).
- Tailwind configuration beyond the variables (an app's own setup).
