---
ddx:
  id: US-073
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-005
    - kind: informed_by
      to: FEAT-001
    - kind: informed_by
      to: CONTRACT-002
---

# US-073: Release a client brand outside the core

**Feature**: FEAT-005 — Public distribution
**Feature Requirements**: DIST-02; NFR Scalability
**PRD Requirements**: FR-23
**Priority**: P2
**Status**: Draft

## Story

**As a** brand owner (PRD secondary persona) for one client
**I want** to build and release that client's brand from its own repository, against a declared version of the core
**So that** the client's apps get their brand without it ever entering the public core, and without waiting on a core release

## Context

Today a brand is a file in this repository (`tokens/brands/`, CONTRACT-002).
It is composed by the core's build and published inside `@ux-builder/tokens`
to everyone. `npm run brand` and the composer work only inside this
repository. `@ux-builder/tokens` publishes no composer, no command and no
contrast gate that another repository can run. A client brand made for a
client under an engagement, or one carrying a client's logo or licensed font,
must not be published in the core (FEAT-005 *Client brand*). So the brand
owner needs the build outside the core.

## Walkthrough

1. The brand owner creates a package in the client's repository with the brand file (and its theme file) per CONTRACT-002, and a dependency on a declared range of `@ux-builder/tokens`.
2. They run the core's brand build in that package.
3. The build composes the brand on the chosen shared design system, runs the contrast gate on every appearance, and writes theme CSS, resolved JSON and a gallery of the brand's themes.
4. They publish the package wherever the client chooses.
5. A developer of that client's app installs the core and the brand package, imports the brand's theme CSS, and selects the theme with `data-theme`.

## Acceptance Criteria

- [ ] **US-073-AC1** — Given a package outside this repository with a valid brand file and theme file and a dependency on `@ux-builder/tokens`, when its owner runs the brand build the tokens package provides, then theme CSS and resolved JSON are written in that package, composed exactly as the core build would compose the same files.
- [ ] **US-073-AC2** — Given a brand whose colours fail the contrast gate on its design system in any appearance, when the brand build runs, then it exits non-zero naming the theme, appearance and failing pair, and writes nothing.
- [ ] **US-073-AC3** — Given a built brand package installed beside the core, when an app imports its theme CSS after `ui.css` and sets `data-theme` to its theme, then the SDK's widgets render in that theme with no change to the core packages.
- [ ] **US-073-AC4** — Given a brand package built against core major version N, when the core releases a minor version, then the brand builds and renders unchanged; a breaking change to the brand inputs happens only in a major version and is called out in the core's changelog.
- [ ] **US-073-AC5** — Given the brand build, when it completes, then it writes a gallery of that brand's themes on real widgets, as the core release's gallery does (US-072-AC3).

## Edge Cases

- **A brand that fails the gate on a new core version**: the brand build fails in the brand's package, and its owner fixes it there (FEAT-005 edge case). The core is not changed.
- **A brand file names a design system the installed core lacks**: the build fails naming the design system and the installed core version.
- **20 or more client brands**: each is its own package. The core needs no change for any of them (NFR Scalability).

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Build outside | US-073-AC1 | Temp package with `acme.brand.json` + `acme.theme.json` on `material`, the built core installed | Brand build | CSS and resolved JSON equal to the core build's for the same files |
| Gate | US-073-AC2 | Brand with a 3:1 body text pair | Brand build | Exit 1 naming theme, appearance, pair; no output |
| Renders | US-073-AC3 | Fixture app with core + acme package | Load page with `data-theme="acme"` | Widgets take acme's tokens; the audit passes |
| Minor upgrade | US-073-AC4 | acme built on tokens 1.x; core minor bump | Rebuild and render | Identical output apart from tokens the minor added |
| Gallery | US-073-AC5 | acme package | Brand build | `gallery.html` with acme's themes |

## Dependencies

- **Stories**: US-072 (the core's gallery, reused)
- **Feature Spec**: FEAT-005
- **Feature Requirements**: DIST-02
- **PRD Requirements**: FR-23
- **External**: CONTRACT-002 (brand and theme files); a contract amendment for the brand build's command and outputs (to be designed)

## Out of Scope

- Hosting a registry for brand packages (FEAT-005 out of scope).
- Making a brand from a logo outside the repository (`npm run brand` and the theme builder stay as they are).
