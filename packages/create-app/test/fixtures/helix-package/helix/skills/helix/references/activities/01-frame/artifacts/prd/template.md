---
ddx:
  id: prd
  authoring:
    home: repo
kind: product  # `product` (default) frames general product requirements; `data` frames a data product (pipeline, warehouse, data platform, or service). See ADR-008.
---

# Product Requirements Document

> **Variant guidance.** This template carries both the default `product`
> framing and a `data` framing. Sections marked **(kind: data)** apply when
> `kind: data` and replace the corresponding `product` framing above them.
> When `kind: product`, ignore the **(kind: data)** blocks. The shape of the
> document is the same; the framing is parameterized.

## Summary

[This section should work as a standalone 1-pager. Include: what we're
building, who uses it, what problem it solves, the solution approach, and the
top 2-3 success metrics. Write this last — it should be a distillation of the
full PRD, not an introduction. Someone who reads only this section should
understand the product well enough to decide whether to read the rest.

**(kind: data)** Frame this as a standalone 1-pager for the **data product**:
what data we are building, who consumes it, the business problem it solves,
the data solution approach (sources, medallion layer strategy, consumption
shape), and the top 2-3 success metrics (freshness, quality, cost).]

## Problem and Goals

### Problem

[What is broken or missing? Who is affected? Be specific about the failure
mode — not "users struggle with X" but "users spend N hours per week doing X
because Y doesn't exist."

**(kind: data)** Be specific about the data failure mode — not "users
struggle with reporting" but "sales analysts spend 4 hours per week
reconciling pipeline outputs with source systems because current freshness
is 24 hours and source data changes hourly."]

### Goals

1. [Primary goal — what changes for users]
2. [Secondary goal]

### Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| [Metric] | [Numeric target] | [Named tool or process] |

**(kind: data)** When `kind: data`, frame metrics for the data product
itself (throughput, latency, quality score, cost per GB). Include a baseline
and cadence column:

| Metric | Target | Baseline | Measurement Method | Cadence |
|--------|--------|----------|--------------------|---------|
| [Throughput] | [e.g., 1M rows/day] | [Current: 100K rows/day] | [COUNT(*) from production table] | Daily |
| [Latency] | [e.g., ≤1 hour end-to-end] | [Current: 4 hours] | [MAX(ingestion_timestamp) - MAX(source_timestamp)] | Hourly |
| [Quality Score] | [e.g., ≥98%] | [Current: 85%] | [Automated quality checks pass rate] | Daily |
| [Cost per GB] | [e.g., $0.05/GB/month] | [Current: $0.12/GB/month] | [DBU spend / data volume] | Monthly |

### Non-Goals

[What we are explicitly not trying to achieve. Each non-goal should exclude
something a reasonable person might assume is in scope.]

Deferred items tracked in `docs/helix/parking-lot.md`.

## Users and Scope

### Primary Persona: [Name]

**Role**: [Job title/function]
**Goals**: [What they want to achieve]
**Pain Points**: [Current frustrations — specific enough to validate]

### Secondary Persona: [Name]

[Same structure]

### (kind: data) Data Consumers

[When `kind: data`, replace the persona blocks with concrete data consumers.]

#### Primary Consumer: [Name/Role]

**Team**: [Data Engineering, Analytics, Product, Finance, etc.]
**Use Case**: [What they do with the data; what decision it informs]
**Frequency**: [Real-time, daily, weekly, ad-hoc]
**Key Tables/Feeds**: [Which outputs matter most]

#### Data Consumer Requirements Table

| Consumer | Use Case | Freshness SLA | Latency Tolerance | Key Dimensions | Access Level |
|----------|----------|---------------|-------------------|----------------|--------------|
| [Team] | [What they do] | [e.g., hourly] | [max delay] | [customer_id, product_id, ...] | [Row-level, Column-level, or Full] |

### (kind: data) Data Sources

[Inventory of upstream systems supplying this data product.]

| Source System | Schema / Table | Owner | Update Frequency | Quality Baseline | Notes |
|---------------|----------------|-------|------------------|------------------|-------|
| [e.g., Salesforce] | [e.g., Accounts, Opportunities] | [Team] | [hourly, daily, on-demand] | [% completeness, freshness] | [Data model version, API limits, retry policy] |

## Requirements

Each requirement should trace to the Product Vision and be specific enough to
drive feature specs, designs, tests, and implementation work without embedding
the detailed design here. Exact command invocations, CLI flags, endpoints,
schemas, payloads, error codes, config keys, telemetry fields, event shapes,
and adapter signatures belong in `02-design/contracts/`, not in PRD
requirements.

### Must Have (P0)

1. [Core capability — what must be true for the product to be usable]

### Should Have (P1)

1. [Important feature — valuable but not blocking launch]

### Nice to Have (P2)

1. [Enhancement — improves experience but can be deferred]

## Functional Requirements

[Product-level capability and outcome requirements grouped under canonical
`### Subsystem: <name>` headings. Each requirement is testable without defining
exact API, CLI, event, schema, config, telemetry, or adapter surface. Each
`FR-n` belongs to exactly one subsystem. A subsystem is a cohesive product
capability — the unit that maps to ~one feature spec (`FEAT-NNN`). The PRD owns
breadth (all subsystems + `FR-n` + priority); feature specs own each subsystem's
depth, and Contracts own exact shared interface surfaces.

Each functional requirement carries a **stable `FR-n` ID** (e.g. `FR-1`). The ID
survives edits so downstream artifacts trace to a specific requirement by name:
every `FR-n` must map to ≥1 user story `US-n`, and reconcile-alignment checks that
mapping (and that each subsystem maps to a feature) as a coverage floor. Number
them sequentially; do not renumber on edit.]

### Subsystem: [Name — a cohesive capability that becomes ~one FEAT]

- **FR-1** — [product capability or outcome requirement, testable]
- **FR-2** — [product capability or outcome requirement, testable]

### Subsystem: [Name]

- **FR-3** — [product capability or outcome requirement, testable]

### (kind: data) Data Quality Requirements

[When `kind: data`, add this subsection. Quality dimensions with numeric
thresholds and enforcement strategy. Reference `data-quality-expectations`
for executable `EXPECT` clauses per medallion layer.]

| Dimension | P0 Threshold | P1 Threshold | Measurement Method | Enforcement |
|-----------|--------------|--------------|--------------------|-------------|
| Completeness | [e.g., ≥99%] | [e.g., ≥95%] | [Count NULLs / total rows] | [Alert if below P0] |
| Timeliness | [e.g., ≤1 hour lag] | [e.g., ≤4 hour lag] | [MAX(ingestion_time) - MAX(source_time)] | [Reject data if exceeds P0] |
| Accuracy | [e.g., ≥98% match to source] | [e.g., ≥95% match] | [Row-count reconciliation + sample audit] | [Manual review + auto-reject if P0 fails] |
| Uniqueness | [e.g., PK has no duplicates] | [as P0] | [COUNT(*) = COUNT(DISTINCT PK)] | [Fail ingestion] |

## Acceptance Test Sketches

[For each P0 requirement, describe a concrete scenario with inputs and
expected outputs. These aren't full test cases — they're the minimum needed
for an implementer (human or agent) to verify the requirement is met.]

| Requirement | Scenario | Input | Expected Output |
|-------------|----------|-------|-----------------|
| [P0 requirement] | [What the user does] | [Specific input or state] | [Observable result] |

## Technical Context

[Stack, key dependencies with versions, API schemas, and platform targets.
Be specific enough that an implementer knows what to install and what
interfaces to code against. This section records current stack decisions — it
does not make them. Stack selection rationale belongs in ADRs. If a choice
here isn't backed by an ADR yet, note it in Open Questions.]

- **Language/Runtime**: [e.g., TypeScript 5.x, Node 20+]
- **Key Libraries**: [e.g., React 18, Tailwind CSS 4]
- **Data/Storage**: [e.g., PostgreSQL 16, Redis 7]
- **APIs**: [e.g., OpenAPI spec at docs/api/v2.yaml]
- **Platform Targets**: [e.g., Linux, macOS; browser: Chrome/Firefox/Safari latest]

### (kind: data) Data Platform Context

[When `kind: data`, replace the stack list above with platform context.]

- **Target Catalog**: [e.g., `prod`, `analytics`, or domain-specific catalog]
- **Target Schema**: [e.g., `customer_360`, `payment_events`]
- **Medallion Layers**: Bronze (raw), Silver (validated), Gold (business)
- **Access Control Model**: [UC policies, row-level security, column masking]

| Feature | Decision | Rationale |
|---------|----------|-----------|
| Ingestion Pattern | [Auto Loader, Streaming Tables, batch] | [Why this choice?] |
| Processing Model | [Streaming, Batch, Incremental] | [Freshness SLA and cost tradeoff] |
| Compute Tier | [All-purpose, Jobs, Serverless] | [Workload characteristics, cost model] |
| Storage Format | [Delta, Parquet, CSV] | [Durability, query performance needs] |
| DBU Budget (Monthly) | [Estimated spend] | [Based on row volume, freshness, complexity] |

- **Data Classification**: [Public, Internal, Sensitive, PII]
- **Retention Policy**: [e.g., Bronze: 7 days, Silver: 90 days, Gold: 2 years]
- **Audit Trail**: [Who accessed what, when, why]
- **Lineage Tracking**: [Table-to-table dependencies for impact analysis]

## Constraints, Assumptions, Dependencies

### Constraints

- **Technical**: [Platform or technology limits]
- **Business**: [Budget, timeline, resource limits]
- **Legal/Compliance**: [Regulatory requirements]

### Assumptions

- [Key assumptions — what must be true for this plan to work]

### Dependencies

- [External systems, teams, or artifacts this work depends on]

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Risk] | High/Med/Low | High/Med/Low | [Concrete strategy, not "monitor"] |

## Open Questions

[Unresolved items that need answers before or during implementation. Each
should name who can answer it and what's blocked by it. Prefer explicit
questions here over `[TBD]` markers scattered through the document.]

- [ ] [Question] — blocks [what], ask [who]

## Success Criteria

[What must be true to call the initiative successful. These should be
observable outcomes, not activities.]
