---
ddx:
  id: resource.nng-wireflows
  authoring:
    home: repo
---

# NN/g Wireflows

## Source

- URL: https://www.nngroup.com/articles/wireflows/
- Owner: Nielsen Norman Group (NN/g)
- Accessed: 2026-10-21

## Summary

A wireflow combines wireframe-style screens with a flowchart's arrows, so a
reader sees both what a screen contains and how the user moves between
screens. NN/g recommends it for interfaces where much of the change happens
within one page (dynamic content, panels, inline feedback) rather than across
distinct pages.

## Relevant Findings

- Show the feedback states the user sees after an action, not only the
  destination screens.
- Mark the hotspot — the control the user activates — that triggers each
  transition.
- On desktop, when only part of a screen changes, show just the changed region
  rather than redrawing the whole screen.
- Match fidelity to the purpose: boxes for structure, more detail only where
  layout or content is under review.

## Use in HELIX

Grounds `screen-flow`: the transitions table records the action and hotspot,
the feedback and the changed region for every edge, and the fidelity field.
