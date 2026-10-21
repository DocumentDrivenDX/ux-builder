---
ddx:
  id: FEAT-XXX
  authoring:
    home: repo
---

# Feature Specification: FEAT-XXX — [Feature Name]

**Feature ID**: FEAT-XXX
**Priority**: [P0 | P1 | P2]
**Owner**: [Team/Person]
**Covered PRD Subsystem(s)**: [Subsystem name(s) from the PRD — normally exactly one]
**Covered PRD Requirements**: [FR-n, FR-m — the PRD FRs this feature owns]
**Cross-Subsystem Rationale**: [None — single subsystem. | If more than one subsystem
is listed above: the rationale that the cross-subsystem workflow IS the feature;
otherwise split it per the Decomposition test.]
<!-- reconcile-alignment reads these three fields: a feature spanning >1 subsystem
with no Cross-Subsystem Rationale is a mega-FEAT finding. -->

## Overview

[What this feature is and why it exists. 2-3 sentences connecting this feature
to a specific PRD requirement.]

## Ideal Future State

[Describe the future product behavior once this feature is working well. Focus
on what users can understand, decide, or accomplish. For broad product-surface,
workflow, IA, or documentation features, this section should come before the
problem framing so requirements are pulled toward the desired outcome instead
of only reacting to current pain.]

## Problem Statement

- **Current situation**: [What exists now — be specific]
- **Pain points**: [What is not working and for whom]
- **Desired outcome**: [What success looks like — measurable]

## Functional Areas

[For features with more than one surface or stage **within this one capability**,
map the subordinate areas before writing requirements. Areas are parts of one
capability — each fails the ship/cut/metric test on its own. Lists of roles,
lifecycle stages, or distinct domain objects are usually *separate features*, not
areas (apply the Decomposition test). Omit when the feature is a single narrow
capability.]

| Area | User question or job | Feature responsibility |
|------|----------------------|------------------------|
| [Area] | [What the user needs to know or do] | [What this feature must provide] |

## Requirements

### Functional Requirements by Area

[Each requirement should be testable. Group requirements by functional area
when the feature has multiple areas. Use stable prefixes that make the scope
clear, such as `HOME-01`, `TYPE-01`, `NAV-01`, or `FR-01` for narrow features.
Name high-level interface dependencies when needed, but do not define exact
API/CLI/event/schema/config/telemetry/adapter surface here; link or request a
Contract for commands, flags, endpoints, fields, payloads, status codes, error
semantics, and compatibility rules.]

#### [Area Name]

[PREFIX-01]. [Requirement]
[PREFIX-02]. [Requirement]

### Non-Functional Requirements

- **Performance**: [Specific target, e.g., "95th percentile response < 200ms"]
- **Security**: [Specific requirement, not "must be secure"]
- **Scalability**: [Specific target, e.g., "handles 10k concurrent users"]
- **Reliability**: [Specific target, e.g., "99.9% uptime"]

## User Stories

[List the user stories that implement this feature. Each story is a separate
file in `docs/helix/01-frame/user-stories/`. Reference by ID — do not
duplicate story content here.]

- [US-XXX — Story title](../user-stories/US-XXX-slug.md)
- [US-XXX — Story title](../user-stories/US-XXX-slug.md)

## Edge Cases and Error Handling

[Feature-level edge cases that span multiple stories. Story-specific edge
cases belong in the story file.]

- **[Condition]**: [Expected behavior]

## Success Metrics

[How do we know this feature is working? Metrics specific to this feature,
not the product-level metrics from the PRD.]

- [Metric with target]

## Constraints and Assumptions

- [Constraint or assumption specific to this feature]

## Dependencies

- **Other features**: [FEAT-XXX if this feature depends on another]
- **External services**: [APIs, libraries, or systems this feature requires; exact surface lives in Contract artifacts]
- **PRD requirements**: [Which P0/P1/P2 requirements this addresses]

## Out of Scope

[What this feature explicitly does not cover. Each item should prevent a
plausible scope question.]
