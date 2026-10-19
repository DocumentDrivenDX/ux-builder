---
ddx:
  id: FEAT-005
  type: feature-specification
  status: draft
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: FEAT-001
---

# Feature Specification: FEAT-005 — Public distribution

**Feature ID**: FEAT-005
**Status**: Specified
**Priority**: P2
**Owner**: Operator
**Covered PRD Subsystem(s)**: Distribution and tenancy
**Covered PRD Requirements**: FR-22, FR-23, FR-24
**Cross-Subsystem Rationale**: None — single subsystem.

## Overview

Publishes the SDK as an open-source project anyone can install: versioned
releases on the public npm registry, a neutral package scope and repository,
and client brands kept apart from the core and from each other. The core
carries only brands that are free to ship; a client's brand is released on
its own, wherever that client chooses.

## Ideal Future State

The core SDK — design systems, widgets, engine, builder, tooling — lives in
the public repository `DocumentDrivenDX/ux-builder` and publishes under the
`@ux-builder/*` scope to the npm registry, installable with no token or
registry configuration. Each client's brand lives in its own package, released
on its own schedule, and only that client's apps install it. Every release
still carries a gallery of every theme it contains.

## Problem Statement

- **Current situation**: The repository is `DocumentDrivenDX/ux-builder`;
  `@ux-builder/tokens`, `@ux-builder/ui`, `@ux-builder/create-app`,
  `@ux-builder/audit` and `@ux-builder/mcp` are published to the npm registry
  with `"access": "public"` (`@ux-builder/engine` and the theme builder are
  private); the brands in this repository (Praxis, Plain, Synaptiq,
  Databricks) are built into the token package; versions and changelogs come
  from Changesets.
- **Pain points**: A client brand added to the token package would be
  published to everyone; consumers need a scope that does not change after
  adoption.
- **Desired outcome**: Anyone installs the core from npm; a client installs
  the core plus only its own brand.

## Functional Areas

| Area | User question or job | Feature responsibility |
|------|----------------------|------------------------|
| Releases | "What changed, and what does it look like?" | Versioned public releases with changelogs and a gallery |
| Brand separation | "Can client A see client B's brand?" | Client brands released separately from the core |
| Neutral home | "Whose SDK is this?" | Neutral scope and public repository, with a migration |

## Requirements

### Functional Requirements by Area

#### Releases

DIST-01. Every release of a package has a changelog entry and a gallery of the
themes it contains (FR-22), and is published to the public npm registry with
`"access": "public"`, installable without a token or a scope registry.

#### Brand separation

DIST-02. A client brand can be built and released from outside the core
repository, against a declared core version (FR-23).
DIST-03. Installing the core installs no client brand; installing one client's
brand installs no other client's.

#### Neutral home

DIST-04. The core lives in a neutral package scope and public repository
(FR-24): `@ux-builder/*` and `github.com/DocumentDrivenDX/ux-builder`.
DIST-05. Existing consumers migrate with a documented, mechanical change
(package names, imports, and removing any private scope registry and token
from their npm config), and the old packages point to the new ones for one
major version.

### Non-Functional Requirements

- **Performance**: N/A.
- **Security**: The core packages contain no client brand, logo or licensed
  font; a client brand package is published wherever its owner chooses and is
  visible only to whom that owner allows.
- **Licensing**: Every core package is licensed MIT OR Apache-2.0 and ships its
  third-party notices (FR-31).
- **Scalability**: ≥ 20 client brands without changes to the core.
- **Reliability**: A core release runs the contrast gate against every theme
  it contains before publishing.

## User Stories

Not yet written. Tracked as a bead (`phase:4`, `feat:FEAT-005`).

## Edge Cases and Error Handling

- **A client brand built against an older core**: it keeps working within the
  core's major version; a breaking core change is called out in its changelog.
- **A brand that fails the gate on a new core version**: the brand's owner
  fixes it in the brand package.
- **A consumer still configured with a private `@ux-builder` scope registry**:
  installs fail or resolve stale versions; the migration notes say to remove
  the `@ux-builder:registry` line and its token.

## Success Metrics

- 0 client brands in any published core package.
- A new consumer installs the core with no registry or token configuration.

## Constraints and Assumptions

- The core repository and packages are public; nothing client-confidential is
  committed to them.

## Dependencies

- **Other features**: FEAT-001 (brands as separate files).
- **External services**: the public npm registry; repository hosting on
  GitHub (`DocumentDrivenDX/ux-builder`).
- **PRD requirements**: P2-2.

## Out of Scope

- Billing or licensing of the SDK to clients.
- Hosting a registry for client brand packages.
