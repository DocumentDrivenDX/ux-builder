---
ddx:
  id: ADR-016
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: ADR-011
    - kind: informs
      to: FEAT-004
    - kind: informs
      to: FEAT-003
---

# ADR-016: React first, with widget CSS that needs no framework

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-05 | Accepted | Operator ("for now, React but could evolve") | FEAT-003, FEAT-004, ADR-011 (widget layer) | High |

## Context

| Aspect | Description |
|--------|-------------|
| Problem | The SDK must choose which framework its widgets, theme provider, starter and brand builder target, without closing the door on others. |
| Current State | `@ux-builder/ui` 0.1.0: framework-free `.piq-*` CSS plus thin React 19 components; the platform and the billing-review app use React. |
| Requirements | FR-17–FR-19; PRD non-goal: no other framework in the first release. |
| Decision Drivers | Every current consumer is React. The operator expects other frameworks may follow. |

## Decision

We will build the SDK's components, theme provider, starter template and brand
builder in **React 19**, and keep all styling in **framework-free CSS**
(`.piq-*` classes reading tokens). React components own behaviour and markup
only. A future framework binding reuses the CSS and the markup contract
unchanged.

**Key Points**: React 19 only, for now | Styling never lives in React | Markup
is the contract a second binding follows

## Alternatives

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| Web components | One implementation for any framework | Weaker React ergonomics (events, forms, SSR); no current consumer needs them | Rejected for now: revisit when a non-React consumer appears |
| React with CSS-in-JS | Co-located styles | Styling bound to React; a second framework would restyle everything | Rejected: blocks the "could evolve" path |
| **React 19 + framework-free CSS (chosen)** | Fits every current consumer; CSS reusable by any framework | A second framework means a second set of components | **Selected** |

## Consequences

| Type | Impact |
|------|--------|
| Positive | Matches every consumer; the CSS already works on plain markup (non-React apps can use classes). |
| Negative | Behaviour (keyboard, sorting, paging, toasts) is React-only until a second binding exists. |
| Neutral | The `frontend-framework` slot is filled by React (project-local), not the shipped `react-nextjs` default. |

## Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| A non-React client arrives | Medium | Medium | The CSS and markup contract are documented per widget; a binding is new work, not a rewrite |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| All consumers use the React components | A committed consumer cannot use React |

## Supersession

- **Supersedes**: None
- **Superseded by**: None

## Concern Impact

- **Concern selection**: Fills `frontend-framework` with React 19 + Vite
  library build (project-local), recorded in `concerns.md`.

## References

- `packages/ui/src/ui.css`, `packages/ui/src/widgets/`
- ADR-011 — widget layer (prefixed CSS plus React components)
