---
ddx:
  id: FEAT-014
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-004
    - kind: informed_by
      to: FEAT-008
    - kind: informed_by
      to: FEAT-010
    - kind: informed_by
      to: FEAT-011
    - kind: informed_by
      to: ADR-032
---

# Feature Specification: FEAT-014 — App modalities

**Feature ID**: FEAT-014
**Status**: Draft (2026-10-21, with ADR-032)
**Priority**: P1
**Owner**: Operator
**Covered PRD Subsystem(s)**: App modalities
**Covered PRD Requirements**: FR-60, FR-61, FR-62, FR-63 (drafted with this feature)
**Cross-Subsystem Rationale**: The starter (FEAT-004, FEAT-010) asks for the modalities. The blueprint and rules (FEAT-008, FEAT-011) and the audit apply them.

## Overview

The operator created an app and was never asked what kind of app it was.
The starter built a mobile and desktop web app with a sample legal "Matters"
screen, and the audit checked mobile and desktop layouts. A **modality** is
the kind of experience an app gives its users. Declaring it lets the starter
build the right shell, and lets the rules and the audit check the right
things.

Near-term modalities (web):

| Modality | What it is |
|---|---|
| `responsive-web` | A web app that works from a phone to a desktop |
| `chat` | A chat app: the conversation is the interface |
| `hybrid-chat` | A chat app whose replies include Adaptive Cards and inline SDK UI (wizards, forms) |

An app may have more than one, for example `responsive-web` plus
`hybrid-chat` for an app with screens and an assistant. Native iOS, Android,
macOS and Windows apps are **future** modalities, tracked as beads. They are
out of scope for this feature.

## Problem Statement

- **Current situation** (before `@ux-builder/create-app` 0.6.0, which shipped this feature):
  - The starter ships a sample domain (Matters) that every app must delete.
  - It assumes a responsive web app.
  - Nothing records which kind of app it is, so the rules and the audit
    cannot be specific.
- **Desired outcome**: A new app is made for its declared modalities, starts
  empty, and is checked against what those modalities need.

## The modality matrix

| | `responsive-web` | `chat` | `hybrid-chat` |
|---|---|---|---|
| Size classes | compact, medium, expanded, large | compact, medium, expanded | compact, medium, expanded |
| Inputs | coarse, fine | coarse, fine | coarse, fine |
| AI roles on its screens | — | `assistant` | `assistant` |
| Starter shell | `AppShell` with one empty Home screen (`StatePanel` empty state) | A full-screen `Conversation`, empty, with its composer | A `Conversation` that renders Adaptive Card and catalogue component parts |
| Components the guidance points to | widgets, `@ux-builder/ui/patterns` | `@ux-builder/ui/assistant` | `@ux-builder/ui/assistant`, `@ux-builder/ui/adaptive-cards` |
| Rule families | every app rule (nav, layout, modal, action, feedback, loading, screen, emphasis, input, text, view, pattern, flow, journey), plus `theme` | the AI rules for `assistant`, plus feedback, input, text and `theme` | the chat rules, plus `genui.*` and `card.*` |
| Audit widths | 390, 768, 1280 | 390, 1280 | 390, 1280 |

With several modalities, the starter combines them: an `AppShell` whose
destinations are Home and Assistant, each built for its modality. The axes
are the union of the modalities' axes.

## Requirements

### Choosing

MOD-01. `npm create @ux-builder/app` asks which modalities the app has, as a
multi-select, when it runs in a terminal. With `--modality <list>`
(comma-separated), it does not ask. When it cannot ask (no terminal, as for an
agent or CI) and no `--modality` is given, it exits 1 listing the
modalities. It never assumes one.
*[Amended 2026-10-24 — FEAT-018 GDL-81]* Without `--modality` (or
`--blueprint`) the starter now makes a design folder instead of asking:
the modality is asked during the design (FEAT-018 GDL-80) and the app is
built for the answer. It still never assumes one.

MOD-02. The chosen modalities are recorded in the blueprint as
`supports.modalities`. The blueprint's `sizeClasses` and `inputs` are derived
from them by the matrix, and the shell's screens carry their AI roles.

MOD-03. An unknown modality, or a future one (`ios`, `android`, `macos`,
`windows`), is refused with a message saying which are available now.

### Starter

MOD-04. The starter contains no sample domain or data. The shell for each
modality is in the matrix above. The Home screen's empty state says what to
do next: frame the first feature in HELIX, then plan its screens in the
blueprint. The theme and appearance switch remain.

MOD-05. The starter's HELIX documents describe the shell:
- **FEAT-001** is "the app's shell for its modalities";
- **US-001** is "open the app and see where to start", with criteria for
  each chosen modality's shell.

Its e2e test cites them. Owner decisions stay placeholders (FEAT-010 HLA-02).

### Rules and components

MOD-06. A rule may apply by modality (CONTRACT-005 `when.modality`).
`rulesFor` and MCP `get_rules` accept `modalities`. A target's modalities
expand to the matrix's axes and AI roles. The `card.*` rules apply only to
`hybrid-chat`.

MOD-07. The generated guidance (`AGENTS.md`, the skill) and MCP `get_guidance`
name, for the app's modalities, the components to build with and the rule
families that apply.

### Audit

MOD-08. The audit reads the app's modalities from its blueprint
(`--blueprint`) or from `--modality`. It inspects each modality's widths and
applies its rules.

MOD-09. The audit gives a **modality-fit verdict**: pass, warn or fail per
modality, with the evidence.
- **Components:**
  - `chat` and `hybrid-chat` render the SDK `Conversation` (its markers);
  - `hybrid-chat` can render an Adaptive Card part;
  - `responsive-web` uses `AppShell` navigation that adapts by size class.
- **Rules:** the rule families the modality needs were checked.
- **Missing pieces:** each missing component or rule family is named, with
  the fix.

MOD-10. The audit gives a **theme verdict**, with the evidence:
- the theme the app declares is applied;
- the theme's design system is the one in use;
- every component comes from the SDK (no foreign UI);
- the palette passes contrast in every appearance.

Each theme finding names its `theme.*` rule (FEAT-015 RPT-02).

## User Stories

- [US-096 — Choose the app's modalities when creating it](../user-stories/US-096-choose-the-apps-modalities.md)
- [US-097 — Start from an empty shell for the modalities](../user-stories/US-097-start-from-an-empty-shell.md)
- [US-098 — The modalities choose the rules and components](../user-stories/US-098-modalities-choose-rules-and-components.md)
- [US-099 — The audit says whether the app fits its theme and modalities](../user-stories/US-099-audit-verdicts-for-theme-and-modality.md)

## Edge Cases

- **An existing blueprint without `modalities`**: it is read as
  `responsive-web` (today's behaviour), and the audit says it assumed so.
- **`--blueprint` together with `--modality`**: the blueprint's
  `supports.modalities` must agree, or the starter exits 1 naming both.
- **`--no-helix`**: the shell is the same; the e2e test drops its `@covers`
  lines (FEAT-010).

## Success Metrics

- A new app of each modality builds, passes its lint, audit and e2e, and has
  no sample domain.
- The audit's verdicts catch every seeded modality or theme defect on the
  fixture apps, and none on their clean twins.

## Out of Scope

- Native iOS, Android, macOS and Windows apps (future beads).
- Converting an existing app between modalities.
