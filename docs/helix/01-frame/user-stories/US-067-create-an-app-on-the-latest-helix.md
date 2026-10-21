---
ddx:
  id: US-067
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-010
    - kind: informed_by
      to: ADR-027
---

# US-067: Create an app on the latest HELIX

**Feature**: FEAT-010 — A new app starts on HELIX
**Feature Requirements**: HLF-01, HLF-02, HLF-03, HLI-01, HLI-02, HLS-01
**PRD Requirements**: FR-43
**Priority**: P1
**Status**: Draft

## Story

**As a** developer starting a client app
**I want** the starter to install the HELIX release that is current today
**So that** my app is governed by up-to-date HELIX without a separate install

## Context

ADR-027 decisions 1 to 3. Tests use a local release server (`UX_BUILDER_HELIX_API`) so no test touches GitHub.

## Walkthrough

1. `npm create @ux-builder/app my-app` prints `HELIX v0.18.0 (latest release, verified)`.
2. `my-app/.claude/skills/helix/` holds the skill and its catalogue; `HELIX-VERSION.json` says where it came from.

## Acceptance Criteria

- [ ] **US-067-AC1** — Given a latest release with a plugin package, when the starter runs, then it installs that release's `skills/helix/` (with `references/`) at `.claude/skills/helix/`, byte for byte, and prints the version.
- [ ] **US-067-AC2** — Given a package whose SHA-256 differs from the release's published digest, whose manifest version differs from the tag, or that lacks `SKILL.md` or the catalogue floor, when the starter runs, then it refuses that package and falls back to the bundled HELIX with the reason.
- [ ] **US-067-AC3** — Given `GITHUB_TOKEN` in the environment, when the starter calls GitHub, then it sends it as a bearer token and never writes it anywhere; without it, no credential is sent; a release server that does not answer within 20 seconds counts as unreachable.
- [ ] **US-067-AC4** — Given a package entry with an absolute path, `..`, a link or a device file, when it is extracted, then nothing from the package is installed and the starter falls back; nothing downloaded is ever executed.
- [ ] **US-067-AC5** — Given a created app, when `.claude/skills/helix/HELIX-VERSION.json` and `.helix.yml` are read, then they record the version, tag, source URL, digest, time and whether the bundled copy was used, and the flow's advisory `version`.
- [ ] **US-067-AC6** — Given `HTTPS_PROXY` or `HTTP_PROXY` (in upper or lower case) in the environment, when the starter calls GitHub, then the API call and the download go through that proxy, unless `NO_PROXY` names the host.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Latest | US-067-AC1 | Local release server with v9.9.0 | create | Installed; version printed |
| Bad package | US-067-AC2 | Wrong digest; wrong version; no SKILL.md | create | Bundled HELIX; reason |
| Token | US-067-AC3 | GITHUB_TOKEN set; slow server | create | Bearer sent, not written; timeout falls back |
| Unsafe tar | US-067-AC4 | Entry ../x; absolute path; symlink; hard link; device | create | Refused; fallback |
| Provenance | US-067-AC5 | Created app | read | Fields present |
| Proxy | US-067-AC6 | `HTTP_PROXY` at a local proxy; then `NO_PROXY` naming the host | create | Both requests through the proxy; none with `NO_PROXY` |

## Dependencies

- **Feature Spec**: FEAT-010
- **Feature Requirements**: HLF-01, HLF-02, HLF-03, HLI-01, HLI-02, HLS-01
- **PRD Requirements**: FR-43

## Out of Scope

- See FEAT-010 "Out of Scope".
