# Concern: Accessibility (WCAG 2.2 AA)

## Category
accessibility

## Areas
ui, frontend

## Components

- **Standard**: WCAG 2.2 Level AA
- **Testing**: axe-core automated checks + manual screen reader testing
- **Scope**: All user-facing interfaces
- **Boundary**: `a11y-wcag-aa` owns the accessibility checks; `ux-radix` owns the widgets.

## Constraints

- All interactive elements must be keyboard-navigable
- Color contrast must meet AA ratios (4.5:1 text, 3:1 large text)
- All non-decorative images must have alt text
- Form inputs must have associated labels
- Dynamic content must manage focus appropriately

## When to use

Any project with user-facing web or mobile interfaces. Required for
public-sector, healthcare, finance, and education. Recommended for all
consumer-facing products.

## Artifact Impact

Selecting this concern requires these artifacts to change (a selected concern absent from them is drift):
- DESIGN_SYSTEM: keyboard-navigable controls, AA contrast ratios, focus management, labeled inputs; states the WCAG 2.2 AA target, axe-core, and manual screen-reader testing
- TEST_PLAN: axe-core automated checks + manual screen-reader passes
