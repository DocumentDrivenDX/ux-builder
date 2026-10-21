---
ddx:
  id: architecture
  authoring:
    home: repo
---

# Architecture

## Scope

[What system this architecture covers, what is deliberately outside the
architecture boundary, and which PRD/features/user journeys drive the design.]

## Level 1: System Context

| Element | Type | Purpose | Protocol |
|---------|------|---------|----------|
| [User/System] | User/External | [Interaction] | [HTTP/API/etc] |

```mermaid
graph TB
    %% Add users, system, and external dependencies
```

## Level 2: Container Diagram

| Container | Technology | Responsibilities | Communication |
|-----------|------------|------------------|---------------|
| [Name] | [Stack] | [What it does] | [Protocol/Format] |

```mermaid
graph TB
    %% Add containers: Web, API, DB, Queue, Worker, external systems
```

## Level 3: Component Diagram

Include only when a container needs internal structure to support downstream
design and review. Omit this section when container responsibilities are enough.

| Component | Container | Purpose | Notes |
|-----------|-----------|---------|-------|
| [Name] | [Container] | [Responsibility] | [Key decisions] |

```mermaid
graph TB
    %% Optional: add components inside the container that needs detail
```

## Module Boundaries

**Source Applicability**: [source or source-free; reason]

For source projects, complete every cell. A single module is sufficient for a
small program; do not add layers solely to fill the table. Source-free projects
may omit the table and fields below after recording the reason above.

| Module | Responsibility / Owned Types | Public API | Allowed Dependencies | Forbidden Dependencies |
|--------|------------------------------|------------|----------------------|------------------------|
| [Package/file] | [Responsibility and owned types] | [Exported names or Contract reference] | [Permitted imports] | [Forbidden imports] |

**Integration Owners**: [External system -> owning module and translation location, or None; reason]
**Construction Policy**: [Owner/location for wiring or deliberate local construction]
**Boundary Check**: [Concrete project-local command shared by local checks, pre-commit and CI]

## Deployment

| Component | Infrastructure | Instances | Scaling | Backup / Recovery |
|-----------|----------------|-----------|---------|-------------------|
| [Name] | [Cloud/service/runtime] | [Count] | [Trigger or limit] | [Backup/failover path] |

```mermaid
graph TB
    %% Add actual deployment topology
```

## Data Flow

```mermaid
sequenceDiagram
    %% Add sequence for the most important user journey or operational flow
```

## Quality Attributes

| Attribute | Target | Strategy | Verification |
|-----------|--------|----------|--------------|
| Availability | [Target] | [How architecture supports it] | [How checked] |
| Performance | [Target] | [How architecture supports it] | [How checked] |
| Security | [Target] | [Controls/boundaries] | [How checked] |
| Disaster Recovery | RTO: [target] / RPO: [target] | [Backup/failover strategy] | [How checked] |

## Decisions and Tradeoffs

| Decision | Status | Rationale | Follow-up |
|----------|--------|-----------|-----------|
| [ADR-NNN or inline decision] | [Accepted/Proposed] | [Why this shape wins] | [ADR, spike, or none] |
