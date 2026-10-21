---
ddx:
  id: concerns
  authoring:
    home: repo
---

# Project Concerns

Project Concerns declare active cross-cutting context for downstream work. They
are not principles, requirements, ADRs, test plans, or implementation tasks.

## Active Concerns

<!-- Select from workflows/concerns/ or declare project-local
     entries. Include only concerns that change downstream work across more
     than one artifact or implementation area. -->

| Concern | Source | Areas | Why Active | Key Practices |
|---------|--------|-------|------------|---------------|
| [concern-name] | [library or project-local] | `area:*` | [Why this changes downstream work] | [Practices downstream work must consider] |

## Project Overrides

<!-- Override specific library practices only when the project has a real reason.
     Cite the governing ADR when available. -->

| Concern | Practice | Override | Authority |
|---------|----------|----------|-----------|
| [concern-name] | [library practice] | [project-specific override] | [ADR-NNN or "Needs ADR"] |

## Area Labels

This project uses the following area labels for concern scoping:

<!-- Declare which area labels work items use. Concerns are injected into
     downstream context based on matching labels against each concern's area
     scope. -->

- `area:ui` — user-facing interfaces
- `area:api` — backend services and endpoints
- `area:data` — database, storage, data pipeline
- `area:infra` — deployment, CI/CD, infrastructure
- `area:cli` — command-line tools

## Concern Conflicts

<!-- Resolve conflicts between active concerns. -->

| Conflict | Resolution |
|----------|------------|
| [Concern A] vs. [Concern B] | [How downstream work should decide] |

## Observability Applicability

For `o11y-otel`, record applicable practice sections in the existing Why Active /
Key Practices fields: service signals, agent run diagnostics, frontend/data
boundaries, and/or GenAI operations. Agent development need not involve a
model-calling product. These notes are not new slots or profile fields. Select
on a real diagnostic surface and apply service-only obligations conditionally;
a development runner can supply evidence for a static site or library.

## Formal Methods Applicability

For selected `formal-methods`, record affected slices, risk, owner and rigor in
Why Active / Key Practices; carry concise scope/rigor notes through Project
Overrides when downstream context needs them. Unaffected items keep the context
and record a concrete non-applicability reason in acceptance/evidence instead of
running an analyzer. Follow `workflows/references/formal-methods.md`; selection
does not imply model checking for every area or slice.
