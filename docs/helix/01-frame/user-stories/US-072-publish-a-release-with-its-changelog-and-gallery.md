---
ddx:
  id: US-072
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-005
    - kind: informed_by
      to: US-049
---

# US-072: Publish a release with its changelog, gallery and licences

**Feature**: FEAT-005 — Public distribution
**Feature Requirements**: DIST-01; NFRs Reliability and Licensing
**PRD Requirements**: FR-22
**Priority**: P2
**Status**: Draft

## Story

**As an** app developer (PRD primary persona) upgrading an app to a new SDK release
**I want** each release published to the public npm registry with its changelog, a gallery of the themes it contains, and its licences
**So that** I can see what changed and what it looks like before I upgrade, and install it with no token or registry set-up

## Context

Releases run from `.github/workflows/release.yml` on every push to `main`.
Changesets opens a "Version Packages" pull request. When that pull request
merges, `npm run release` runs every gate (`npm run check`, including the
contrast gate against every theme and the licence check, US-049) and then
publishes each public package whose version is not yet on npm, with
provenance. It tags each package and creates its GitHub release. Two gaps
remain:
- no release carries a gallery, which is published only to the site by
  `pages.yml`;
- no package ships the SDK's own licence texts, because the root
  `LICENSE-MIT` and `LICENSE-APACHE` are not in any package's `files`.

## Walkthrough

1. A maintainer merges a pull request with a changeset to `main`.
2. The release workflow opens or updates the "Version Packages" pull request with versions and changelog entries.
3. The maintainer merges it.
4. The workflow runs every gate, publishes each new version publicly, tags it, and creates a GitHub release with the changelog entry and the gallery of the themes it contains.
5. An app developer reads the release, opens its gallery, and installs the new version with no npm configuration.

## Acceptance Criteria

- [ ] **US-072-AC1** — Given a merged "Version Packages" pull request, when the release workflow runs, then each public package whose version is not on npm is published with public access and provenance, tagged `<name>@<version>`, and given a GitHub release whose notes are that version's changelog entry.
- [ ] **US-072-AC2** — Given a release in which any gate fails (a test, the contrast gate against any theme, or the licence check), when the release workflow runs, then no package is published and no tag or release is created.
- [ ] **US-072-AC3** — Given a GitHub release of `@ux-builder/tokens` or `@ux-builder/ui`, when it is created, then it carries as an asset a self-contained gallery (`gallery.html`) of every theme that version contains, built from that version's packages.
- [ ] **US-072-AC4** — Given any published public package, when its tarball is listed, then it contains `LICENSE-MIT`, `LICENSE-APACHE` and its `THIRD-PARTY-NOTICES.md`, and its `license` field is `MIT OR Apache-2.0`.
- [ ] **US-072-AC5** — Given a machine with no npm configuration for `@ux-builder` (no registry line, no token), when a developer installs any public package, then it installs from the public npm registry.

## Edge Cases

- **A package's version already exists on npm**: it is skipped, and the run still publishes the others.
- **Publishing fails part-way**: rerunning the workflow publishes only what is missing (AC1); nothing is unpublished.
- **A release of a package with no themes** (`create-app`, `audit`, `mcp`): it carries no gallery.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Release | US-072-AC1 | A merged Version Packages PR raising `ui` to 0.7.0 | Workflow runs | `@ux-builder/ui@0.7.0` on npm with provenance; tag and GitHub release with the changelog entry |
| Gate fails | US-072-AC2 | A theme failing contrast | Workflow runs | Nothing published; no tag |
| Gallery | US-072-AC3 | Release of `tokens` 1.7.0 | Release created | `gallery.html` asset lists every theme in 1.7.0 |
| Licences | US-072-AC4 | `npm pack --dry-run` in each public package | List files | Both licence texts and the notices present |
| No token | US-072-AC5 | Fresh container, empty `~/.npmrc` | `npm install @ux-builder/ui` | Installs |

## Dependencies

- **Stories**: US-049 (the licence check, a gate of AC2)
- **Feature Spec**: FEAT-005
- **Feature Requirements**: DIST-01
- **PRD Requirements**: FR-22
- **External**: the public npm registry (Trusted Publishing); GitHub releases; CONTRACT-004 (package entry points)

## Out of Scope

- A gallery per client brand (US-073).
- Release notes beyond the changelog.
