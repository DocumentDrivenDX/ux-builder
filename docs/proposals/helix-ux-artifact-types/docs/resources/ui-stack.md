---
ddx:
  id: resource.ui-stack
  authoring:
    home: repo
---

# The UI Stack (Scott Hurff)

## Source

- URL: https://www.scotthurff.com/posts/why-your-user-interface-is-awkward-youre-ignoring-the-ui-stack/
- Owner: Scott Hurff, product designer and author
- Related summary: https://smart-interface-design-patterns.com/articles/how-to-fix-a-bad-user-interface/
- Accessed: 2026-10-21

## Summary

Hurff argues that interfaces feel awkward when designers draw only the ideal
screen. Each screen sits on a stack of five states that all need design: the
ideal state (populated, working as intended), the empty state (nothing yet,
first use, or cleared), the loading state, the partial state (some content
present, the screen not yet full) and the error state.

## Relevant Findings

- Designing only the ideal state leaves the other four to the builder's
  default, which is where awkwardness appears.
- Empty states are a chance to teach and to offer the next action.
- Partial states need their own design, not a stretched ideal or empty state.
- Error states need a message and a way forward.

## Use in HELIX

Grounds the baseline state inventory of `interaction-state-diagram`; HELIX
adds offline, slow, permission-denied and success/confirmation where they
apply.
