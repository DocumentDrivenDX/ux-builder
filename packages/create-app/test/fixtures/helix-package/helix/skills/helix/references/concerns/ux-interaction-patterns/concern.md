# Concern: UX Interaction Patterns

## Category
quality-attribute

## Areas
ui, frontend

## Boundary

Owns basic user-visible behavior independently of framework, component library,
brand or hosting. ux-radix and packaged-design-system compose this baseline; neither
library adoption nor accessibility-friendly primitives prove a user flow works.
a11y-wcag-aa owns compliance; e2e-framework owns the execution harness.

## Constraints

- Native links and navigation landmarks for destinations; visible current
  location plus aria-current="page" where page navigation exists. Same-page
  tabs use aria-selected and the tab pattern, not aria-current as a substitute.
- All interactive flows complete by keyboard with visible focus. Apply composite
  arrow keys/typeahead only to the actual widget pattern, not ordinary nav links.
- Modal dialogs trap focus, have accessible names, support applicable dismissal,
  and restore focus to their trigger or a logical successor. Non-modal popovers
  allow focus to leave; do not impose modal trapping on them.
- Async actions show progress, prevent duplicate submission while pending, and
  show success/failure with a recovery path. Preserve entered data on failure.
- Forms expose labels and actionable validation errors; placeholders alone are
  not labels. Data surfaces have applicable loading, empty and error/retry states.
- Destructive actions follow the project's explicit confirmation or recovery
  contract. Irreversible/high-impact actions require confirmation; reviewed undo
  may govern low-risk reversible actions. Never silently delete.
- Search exposes query, results/no-results and reset. Plain text filtering does
  not require a combobox; selectable suggestions use the matching widget pattern.

## When to use

Interactive user interfaces. Static content, pure APIs and source-free prose
record non-applicability rather than inventing interaction flows. Patterns apply
only to affected surfaces. Existing ux-radix selections inherit this baseline;
select it directly with other libraries, without selecting Radix as a side effect.

## Artifact Impact

- USER_STORIES: applicable UX behaviors as stable observable acceptance criteria
- DESIGN_SYSTEM: app-specific navigation, state, modality and recovery conventions
- TEST_PLAN: UX Coverage in affected STPs, mapping patterns and AC IDs to assertions
- IMPLEMENTATION_PLAN: interaction results linked through existing STP mappings per `workflows/concerns/verification/practices.md`

## Drift Signals

- Only token audit or unit snapshots offered as interaction proof
- Active nav color with no aria-current, invisible focus, silent failures
- Universal focus traps, arrow-key nav, or combobox filters without pattern fit
- An affected STP missing UX Coverage or an exclusion with no reason
