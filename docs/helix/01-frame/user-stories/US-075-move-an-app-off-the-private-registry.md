---
ddx:
  id: US-075
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-005
    - kind: informed_by
      to: CONTRACT-004
---

# US-075: Move an app off the private registry

**Feature**: FEAT-005 — Public distribution
**Feature Requirements**: DIST-04, DIST-05
**PRD Requirements**: FR-24
**Priority**: P2
**Status**: Draft

## Story

**As an** app developer (PRD primary persona) whose app installed the SDK from the earlier private `@ux-builder` registry
**I want** a short, mechanical set of steps to install from the public npm registry instead
**So that** my installs stop failing or resolving stale versions, with no change to my code

## Context

The packages kept their `@ux-builder/*` names when they moved from a private
registry to the public npm registry. So the move needs no change to package
names or imports. The only change is the consumer's npm configuration: an
`@ux-builder:registry` line and its token, in user or app `.npmrc`, still
send installs to the old registry (CONTRACT-004 error semantics). DIST-05
was narrowed on 2026-10-21 to these migration notes (operator decision). With
the same names, there is no old package to point to the new one.

## Walkthrough

1. A developer's install fails with 401, 403 or 404, or resolves an old version.
2. They open the migration notes in the repository README.
3. They delete the `@ux-builder:registry` line and its token from their user npm config and from the app's `.npmrc`.
4. They reinstall; the packages come from the public npm registry, and the app builds unchanged.

## Acceptance Criteria

- [ ] **US-075-AC1** — Given the repository README, when a developer looks for how to move off the private registry, then a "Moving from the private registry" section gives the commands to remove the `@ux-builder:registry` line and token from user and app npm config, says no package name or import changes, and shows how to confirm the packages now resolve from `registry.npmjs.org`.
- [ ] **US-075-AC2** — Given an app's `.npmrc` with an `@ux-builder:registry` line, when the app's audit or the starter's check runs, then it warns that the line sends installs to the old registry and names the fix.
- [ ] **US-075-AC3** — Given every public package, when its `package.json` is read, then its `repository` is `github.com/DocumentDrivenDX/ux-builder` with its directory, and its name is in the `@ux-builder` scope (DIST-04).

## Edge Cases

- **The token line is in a CI secret, not a file**: the notes say to remove the secret's `.npmrc` step too.
- **An app pinned a version that exists only on the old registry**: the notes say to move to the nearest public version, and list the versions that are public.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Notes | US-075-AC1 | README | Read the section | Commands, "no code change", how to confirm |
| Stale line | US-075-AC2 | Fixture app with `@ux-builder:registry=https://npm.pkg.github.com` in `.npmrc` | Run the check | Warning naming the line and the fix |
| Metadata | US-075-AC3 | Each public `package.json` | Read | Scope and repository as stated |

## Dependencies

- **Stories**: none
- **Feature Spec**: FEAT-005
- **Feature Requirements**: DIST-04, DIST-05
- **PRD Requirements**: FR-24
- **External**: CONTRACT-004 (error semantics for a stale registry line)

## Out of Scope

- Deprecating packages on the old registry. The names did not change, so there is nothing to point.
