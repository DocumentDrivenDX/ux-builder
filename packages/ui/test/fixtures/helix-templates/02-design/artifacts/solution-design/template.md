---
ddx:
  id: SD-XXX
  authoring:
    home: repo
---

# Solution Design

**Feature**: [[FEAT-XXX]] | **Artifact**: `docs/helix/02-design/solution-designs/SD-XXX-[name].md`

## Scope

- Feature-level design artifact
- Use for cross-component behavior, main alternatives, domain model, and
  decomposition
- Do not use for one-story implementation details; those belong in `TD-XXX`
- Governing artifacts: [Architecture, ADRs, Contracts, Concerns]

## Requirements Mapping

### Functional Requirements

| Requirement | Technical Capability | Component | Priority |
|------------|---------------------|-----------|----------|
| [Business requirement] | [Technical implementation] | [Component] | P0/P1/P2 |

### NFR Impact on Architecture

| NFR | Requirement | Architectural Impact | Design Decision |
|-----|------------|---------------------|-----------------|
| Performance | [Metric] | [What this requires] | [How achieved] |
| Security | | | |
| Scalability | | | |

## Solution Approaches

### Approach 1: [Name]
**Description**: [Overview]
**Pros**: [Advantages]
**Cons**: [Disadvantages]
**Evaluation**: [Selected/Rejected: why]

### Approach 2: [Name]
[Same structure]

**Selected Approach**: [Which and why]

**Architecture/ADR impact**: [No change, or name required Architecture/ADR update]

## Domain Model

```mermaid
erDiagram
    %% [Define entities with attributes and relationships]
```

### Business Rules
1. [Rule]: [Description and implementation impact]

## System Decomposition

### Component: [Name]
- **Purpose**: [What it does]
- **Responsibilities**: [List]
- **Requirements Addressed**: [Which requirements]
- **Interfaces**: [How it communicates at feature level; exact shared surface links to Contract IDs]
- **Owned by TDs**: [Story-level work that will be designed later]

### Component Interactions
```mermaid
graph TD
    %% [Show component relationships]
```

## Technology Rationale

Only include feature-specific technology choices here. System-wide choices
belong in Architecture or ADRs.

| Layer | Choice | Why | Alternatives Rejected |
|-------|--------|-----|----------------------|
| Language | [Choice] | [Reason] | [Others] |
| Framework | [Choice] | [Reason] | [Others] |
| Database | [Choice] | [Reason] | [Others] |
| Infrastructure | [Choice] | [Reason] | [Others] |

## Traceability

| Requirement ID | Component | Design Element | Test Strategy |
|---------------|-----------|----------------|---------------|
| FR-001 | [Component] | [How addressed] | [How tested] |

### Gaps
- [ ] [Requirement not fully addressed]: [Mitigation]

## Concern Alignment

If the project has active concerns (`docs/helix/01-frame/concerns.md`), confirm
this design is consistent with them:

- **Concerns used**: [Which active concerns does this design rely on?]
- **Constraints honored**: [Any concern constraints that shaped this design?]
- **ADRs referenced**: [Concern-related ADRs that govern design choices here]
- **Departures**: [Any design choices that depart from concern practices? If so,
  an ADR should justify the departure.]

## Constraints & Assumptions

- **Constraints**: [Technical constraints and their design impact]
- **Assumptions**: [What we assume, risk if wrong]
- **Dependencies**: [External systems, libraries]

## Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| [Risk] | H/M/L | H/M/L | [Strategy] |

## Diagnostic Flow (when applicable)

For selected `o11y-otel` practices, describe cross-component signal ownership,
context propagation and capture/export/console flow. Reference Architecture/ADRs
for system choices and Contracts for exact telemetry/capture/query surfaces.
Identify the story slices proving OTel integration and agent diagnosis. Do not
redefine shared schemas or mandate a collector/backend for every component.
