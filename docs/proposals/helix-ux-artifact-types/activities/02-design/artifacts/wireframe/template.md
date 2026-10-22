---
ddx:
  id: WF-XXX
  type: wireframe
  authoring:
    home: repo
  depends_on:
    - SF-XXX
    - US-XXX
---

# WF-XXX: [Screen Name]

**Screen flow node**: [[SF-XXX]] `[node-id]` | **Stories**: [[US-XXX]] | **State diagram**: [[ISD-XXX]] or none

## Scope and Fidelity

- **Screen**: [What this screen is for — its one task]
- **Fidelity**: [sketch | low | mid | high]
- **Size classes**: [compact, medium, expanded…]
- **Pattern**: [Design-system or SDK page pattern, if one is used]

<!-- Annotation depth by fidelity:
sketch — the idea each region serves.
low    — layout decisions: regions, order, what is primary.
mid    — functionality: what each control does, validation, where it goes.
high   — full spec: interaction, exact content, every state, accessibility. -->

## Layouts

<!-- One drawing per size class. Put callout numbers on the drawing; keep the
words in the Annotations table. Use an image under assets/ or a box drawing. -->

### [Size class]

![WF-XXX [size class]](assets/WF-XXX-[size-class].svg)

```text
┌──────────────────────────────┐
│ (1) Header                   │
├──────────────────────────────┤
│ (2) Main region              │
│                              │
│ (3) Primary action           │
└──────────────────────────────┘
```

## Annotations

<!-- One row per callout. Kind: region | control | content | feedback.
Every interactive element has a row. Links: screen-flow transition, AC, or token. -->

| # | Element | Kind | Annotation | Size classes | Links |
|---|---|---|---|---|---|
| 1 | [Element] | [region / control / content / feedback] | [What it is for or does, at the stated fidelity] | [all, or which] | [T-ID, US-XXX-ACn, token] |

## States Covered

| State | Shown here | Or see |
|---|---|---|
| [ideal / empty / loading / partial / error / …] | [Layout name, or —] | [[ISD-XXX]] |

## Accessibility

- **Focus order**: [Callout numbers in order]
- **Accessible names**: [Icon-only and ambiguous controls with their names]
- **Headings and landmarks**: [Page heading, regions]
- **Target size and input**: [Touch targets on coarse input; keyboard shortcuts]

## Open Questions

- [Layout or content decision still open, and who decides]
