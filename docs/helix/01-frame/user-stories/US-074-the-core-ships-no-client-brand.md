---
ddx:
  id: US-074
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-005
---

# US-074: The core ships no client brand

**Feature**: FEAT-005 — Public distribution
**Feature Requirements**: DIST-03; NFR Security
**PRD Requirements**: FR-23
**Priority**: P2
**Status**: Draft

## Story

**As a** brand owner (PRD secondary persona) whose client's identity is confidential
**I want** a release of the core to be refused if it contains a client brand, and one client's brand package never to pull in another's
**So that** no client's brand, logo or licensed font reaches the public or another client

## Context

FEAT-005 defines a *client brand*: one made for a client under an
engagement, or one carrying a client's logo or licensed font. The brands in
this repository are first-party (operator decision, 2026-10-21):
- `ux-builder`, `plain`, `synaptiq`, `praxis` and `praxis-v2`;
- `databricks`, which comes from Databricks' public AppKit UI and carries no
  logo or font.

Nothing checks this today. A client brand added to `tokens/brands/` would be
published in `@ux-builder/tokens` at the next release. The check needs a
recorded list of the first-party brands, so that adding to the list is a
reviewed change.

## Walkthrough

1. A contributor adds a brand file to `tokens/brands/` that is not on the first-party list.
2. `npm run check` (and therefore the release, US-072-AC2) fails, naming the brand and the list.
3. The contributor moves the brand to its own package (US-073), or the operator adds a first-party brand to the list in a reviewed change.
4. A client's app installs the core and its own brand package and gets no other client's brand.

## Acceptance Criteria

- [ ] **US-074-AC1** — Given a brand file in `tokens/brands/` that is not on the recorded first-party list, when `npm run check` runs, then it fails naming the brand and the list's path.
- [ ] **US-074-AC2** — Given the packed tarballs of every public package, when the check inspects them, then every brand, theme, logo and font they contain belongs to a first-party brand or is licensed for redistribution (ADR-017), and the check fails naming any other file.
- [ ] **US-074-AC3** — Given a client brand package built per US-073, when its dependency tree is installed, then it contains the core packages and no other brand package.

## Edge Cases

- **A first-party brand gains a client's logo**: AC2 fails until the logo is removed or the brand moves out of the core.
- **A brand removed from the core**: a theme that used it is removed in the same change, so the build fails if one is left behind (CONTRACT-002). Removing a published theme is a major change of `@ux-builder/tokens`.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Unlisted brand | US-074-AC1 | Fixture tree with `acme.brand.json` added | Run the check | Fails naming `acme` and the list |
| Listed brands only | US-074-AC1 | The repository as is | Run the check | Passes |
| Tarball contents | US-074-AC2 | `npm pack` of tokens with an unlisted logo injected | Run the check | Fails naming the file |
| No other brand | US-074-AC3 | Fixture brand package `acme` | `npm ls` after install | Only `@ux-builder/*` core and `acme` |

## Dependencies

- **Stories**: US-073 (where a client brand goes instead)
- **Feature Spec**: FEAT-005
- **Feature Requirements**: DIST-03
- **PRD Requirements**: FR-23
- **External**: CONTRACT-002 (brand files); ADR-017 (fonts declared with their source)

## Out of Scope

- Deciding whether a given brand is a client's. That is an operator decision, recorded in the list.
