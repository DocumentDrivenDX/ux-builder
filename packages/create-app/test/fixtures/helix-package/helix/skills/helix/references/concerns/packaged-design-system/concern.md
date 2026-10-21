# Concern: Packaged Design System

## Category
tech-stack

## Areas
ui, frontend

## Boundary

Owns adoption of the project's available design system distributed as npm
packages. When an applicable design system is available to the project, use it
rather than recreating its presentation and components. Confirm availability,
compatibility and supported scope from project evidence, installed manifests
and public or project-accessible package documentation; HELIX names no vendor,
client, package scope, private repository or particular implementation API.

Composes ux-interaction-patterns for behavior. Framework, runtime, routing and
hosting remain with their concerns; a11y-wcag-aa owns compliance when selected.
An npm dependency alone is not proof of a design system: record the actual
component/token owner and the product surfaces it supports.

## Components

- Project-selected npm package(s) for components, tokens or both
- Installed-version documentation, exported APIs and available agent guidance
- Package-provided lint, audit or accessibility tooling where supplied

## Constraints

- Record the actual package names, installed versions, lockfile and compatible
  framework/runtime peer requirements. Do not assume a React version, provider,
  CSS import order, token naming convention or widget API.
- Use the package's components and semantic tokens where provided. DESIGN.md
  records supported themes/appearances, component mappings and documented token
  references; do not duplicate an externally owned palette in app code.
- Customize through documented theming/extension APIs. Unsupported internal
  overrides or a second overlapping component system need a scoped, reviewed
  project decision with ownership and verification.
- Read documentation and available agent guidance for the installed version.
  Missing widgets, tokens, themes or features require a recorded gap and an
  approved extension, contribution or accessible alternative; never invent APIs.
- Run supplied quality tools where applicable. The project records concrete
  lint/audit commands and reports; where none are supplied, define project checks
  for presentation adoption and accessibility. No universal executable or report
  path is assumed. Run interaction tests separately.
- Record route/theme coverage, command exits, findings and owner-assigned warning
  dispositions. Exclusions and relaxed checks carry scope, rationale, owner,
  alternative verification and review/removal trigger; never conceal new debt.

## Conflict Detection

Framework or hosting selection does not force ux-radix or databricks-appkit-ui
alongside this concern. Choose the project's component owner and resolve any
competing prescriptions in project overrides, citing the governing ADR for
conflicts or deviations. Resolve styling/toolchain defaults against the actual
package contract; its supplied checks are not silently dropped because another
concern chooses a different formatter/linter.

## When to use

When an applicable npm design system is available to the project, adopt it and
record the package evidence and selection. For existing projects, report and
apply an authorized adoption update rather than silently changing libraries.
If no suitable package is available, this concern does not apply: retain the
selected alternative, or let the project author its own concern for its design
system. A package with unresolved access/compatibility is a recorded blocker or
fit question, not permission to substitute another library silently. Registry
credentials stay outside source and verification artifacts.

## Artifact Impact

- ADR: component-owner conflicts or deviations and scoped rationale
- DESIGN_SYSTEM: versioned package/token references, supported themes and mappings
- TD: integration through documented APIs and recorded component gaps
- TEST_PLAN: actual supplied/project quality checks and separate UX interaction proof
- IMPLEMENTATION_PLAN: package access/compatibility, lockfile, CI evidence capture
