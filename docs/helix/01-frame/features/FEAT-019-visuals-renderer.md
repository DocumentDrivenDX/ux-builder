---
ddx:
  id: FEAT-019
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-017
    - kind: informed_by
      to: ADR-042
    - kind: informed_by
      to: CONTRACT-009
    - kind: informs
      to: US-163
    - kind: informs
      to: US-164
    - kind: informs
      to: US-165
    - kind: informs
      to: US-166
    - kind: informs
      to: US-167
    - kind: informs
      to: US-168
    - kind: informs
      to: US-169
---

# Feature Specification: FEAT-019 — Visuals renderer

**Feature ID**: FEAT-019
**Status**: Draft (2026-10-22; widened to M4 on 2026-10-26)
**Priority**: P1
**Owner**: Operator
**Covered PRD Subsystem(s)**: Visuals
**Covered PRD Requirements**: FR-90 to FR-97 (drafted with this feature)
**Cross-Subsystem Rationale**: Draws only with Theme composition's roles (FR-73) and is shown in
the App SDK's Storybook. Its one widget, `<Visual>` (M4), is the App SDK's way to draw a visual in an
app, and the lint and the audit learn it.

## Overview

Milestone M3 of the operator's visuals PRD (`~/Documents/visuals/PRD.md`, §6 and §11). A new
package, `@ux-builder/visuals`, draws a `umf.visual` document (one picture described as data,
defined by umf-visual's CONTRACT-083) in any theme: as SVG for pages, as Mermaid for Markdown readers,
as a plate (the field guide) and as a stepped presentation. 0.1.0 covers the graph kinds (M3);
0.2.0 (M4) adds the rest of the kinds (stack, nested, timeline, comparison, metric), the
`<Visual>` React widget, and the lint and audit coverage that make the widget the sanctioned way
to draw a visual in an app.

## Ideal Future State

Every DocumentDrivenDX picture is drawn by this package from data. A reader sees the same
shapes for the same meanings on a guide page, a site, a slide and an app screen, in that
product's theme and appearance. A producer renders a batch in one process with no browser, and
a drawing that clips text, runs an edge through a box or falls below contrast fails the build.

## Problem Statement

- **Current situation**: HELIX's documentor draws Mermaid strings, a hand-written SVG router
  (`deploy.py`), an HTML plate and Eraser presentations that need Chromium at build time.
  ux-builder's own microsite keeps hand-made diagrams. Colours come from four places.
- **Pain points**: Generated pictures ignore the brand; hand-drawn ones drift from the code;
  nothing checks either.
- **Desired outcome**: One renderer, driven by `umf.visual`, drawing only with role tokens and
  checking its own output.

## Functional Areas

| Area | User question or job | Feature responsibility |
|------|----------------------|------------------------|
| Drawing | "Show me this picture in my theme" | Layout, SVG, roles to tokens, both appearances |
| Checking | "Is it readable and true?" | Layout report and the quality checks |
| Portable forms | "I read Markdown on GitHub" / "I'm presenting" | Mermaid, plate, presentation |
| Producing | "Render my site's visuals" | The command, batch rendering |
| Reviewing | "What does each kind look like in each theme?" | Storybook stories |
| Remaining kinds (M4) | "When did it happen?" "Which option?" "Is this number good?" "What is this made of?" | Stack, nested, timeline, comparison and metric, with the same drawing, checking and portable forms |
| In an app (M4) | "Draw this inside my app, in its theme" | The `<Visual>` widget; the lint and the audit accept it and nothing else |

## Requirements

### Functional Requirements by Area

#### Drawing

- VIS-01: Validate the document against the pinned umf schema and refuse what umf would
  refuse, an unknown major version, an unsupported kind, and (by default) incomplete content.
- VIS-02: Lay out each graph form as the visuals PRD §5 describes: one main axis; groups as
  tinted regions labelled top-left; nodes as rounded rectangles with a bold name and an optional
  detail; the project's own parts outlined in the accent; orthogonal edges with rounded
  corners, labelled on the line; returns dashed; zones in tiers; lanes as columns.
- VIS-03: Draw each role, status and edge kind with shape or line style as well as colour.
- VIS-04: Measure text with the theme's fonts (ADR-042), so boxes fit their text.
- VIS-05: Write deterministic, accessible SVG with stable ids and step membership.
- VIS-06: Read each pinned `umf.visual` version by the version a document declares (1.0.0 and
  1.1.0 today), and draw what a later version adds (exact multiplicities, stable field ids)
  without changing its meaning: a count no crow's foot states is written, never widened.

#### Checking

- CHK-01: Report every box, text and edge path; check overflow, edge collisions, label overlap,
  crossings, text size and contrast (CONTRACT-009).

#### Portable forms

- PRT-01: Emit Mermaid with the theme's colours for every graph kind.
- PRT-02: Build a plate and a presentation as offline HTML; the presentation's player is
  keyboard-operable and honours reduced motion.

#### Producing and reviewing

- CLI-01: `ux-builder-visuals render` renders a batch in one process and fails on a refusal
  or, when asked, on a failed check.
- STY-01: Storybook shows one story per kind and form, following the toolbar's theme.

#### Remaining kinds (M4, FR-95)

- KND-01: Draw `structure/stack` and `structure/nested` as the visuals PRD §5.3 describes: bands
  or containers in alternating region tints, parts placed in their band or container.
- KND-02: Draw `timeline/milestones`, `timeline/roadmap` and `timeline/history` as §5.5 describes:
  one quiet axis with tick labels, spans as rounded bars in their lane's series colour, a today
  marker in the accent, labels inside a bar when they fit and beside it otherwise.
- KND-03: Draw `comparison/matrix`, `comparison/quadrant` and `comparison/before-after` as §5.6
  describes: ratings as filled and empty marks out of their scale and partial support as a half
  mark, each with its words (never colour alone), the chosen item's
  header in the accent with its reason under it, quadrant axes labelled at both ends.
- KND-04: Draw `metric/stat`, `metric/bar`, `metric/line` and `metric/meter` as §5.7 describes:
  one series in the accent, several in the series colours in order, direct labels when there are
  four or fewer, good and bad from the status colours with an arrow or sign, numbers with their
  unit and precision.
- KND-05: Each remaining form has a text equivalent (a table for comparison and metric) and its
  portable form: Mermaid `gantt` for a roadmap and `timeline` for milestones (§6.4), a Markdown
  table for the forms Mermaid has none for.
- KND-06: Below its minimum width, `milestones` and `roadmap` fall back to `history` and warn.

#### In an app (M4, FR-96 and FR-97)

- WGT-01: `<Visual doc />` draws a document inside a React app with the app's theme and
  appearance, following a change of either without being drawn again.
- WGT-02: The widget shows the visual's title and takeaway to assistive technology and offers its
  text equivalent.
- LNT-01: The lint's `no-inline-svg` rule does not report `<Visual>`, and still reports a diagram
  the app writes as `<svg>`.
- AUD-01: The audit does not report the widget's drawing (neither as a self-drawn icon nor its
  colours), and still reports a diagram the app draws itself.

### Non-Functional Requirements

No browser, network or randomness at render time; output byte-identical across runs. Runs in
Node 20+ and in the browser (Storybook). Licences checked (ADR-023 rule 7; elkjs as an
exception awaiting counsel).

## User Stories

- US-163 — Draw a visual in any theme, checked
- US-164 — Walk through a visual: plate and presentation
- US-165 — Read a visual as Mermaid
- US-166 — See every visual kind in every theme
- US-167 — Draw the rest of the kinds in any theme (M4)
- US-168 — Draw a visual inside an app, lint- and audit-clean (M4)
- US-169 — Draw umf.visual 1.1 as well as 1.0

## Edge Cases and Error Handling

A self-message or a self-transition loops beside its box. An edge with no label has none drawn.
A visual narrower than its form's minimum falls back (`sequence/lifelines` to `ladder`) and
warns. A theme font with no table is measured with a stand-in and warns.

## Success Metrics

Every graph-kind document in umf's fixtures renders in every theme and appearance with no check
failure, byte-identical on a second run (M3). Every document of the remaining kinds in umf's
fixtures and the visuals inventory does the same, and an app drawing them with `<Visual>` has no
lint finding and no audit error or warning for them (M4).

## Constraints and Assumptions

umf is not on npm yet; the package carries a pinned copy of the payload schema and a test fails
when the copy differs from the pinned file.

## Dependencies

FEAT-017's tokens (`@ux-builder/tokens` 1.7.0); umf's `umf.visual` 1.0.0.

## Out of Scope

Producing documents and embedding them in sites (documentor, M6); deck-native (pptx) shapes;
live data in `metric` (a visual is a snapshot); sequential and diverging colour ramps.
