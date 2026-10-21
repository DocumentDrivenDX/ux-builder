---
ddx:
  id: STP-067
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-067
    - kind: informed_by
      to: ADR-027
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-067-create-an-app-on-the-latest-helix

## Story Reference

**User Story**: [[US-067-create-an-app-on-the-latest-helix]] (Create an app on the latest HELIX)
**Technical Design**: N/A (ADR-027 at this size)
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-067's criteria without touching GitHub: tests serve a release and a plugin package built from a fixture over local HTTP (`UX_BUILDER_HELIX_API`).
**Blocking Gate**: `npm test --workspace @ux-builder/create-app`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-067-AC1 | Given a latest release with a plugin package, when the starter runs, then it installs that release's `skills/helix/` (with `references/`) at `.claude/skills/helix/`, byte for byte, and prints the version. | `us-067-ac1` | Installed; version printed (given: Local release server with v9.9.0). The starter e2e also asserts that the real latest release was used (`bundled: false`), and says so if the network was unavailable | `@covers US-067-AC1` | Integration; E2E | `packages/create-app/test/helix-fetch.test.mjs`; `starter.e2e.mjs` | Local HELIX release server serving a built test package; GitHub for the e2e | |
| US-067-AC2 | Given a package whose SHA-256 differs from the release's published digest, whose manifest version differs from the tag, or that lacks `SKILL.md` or the catalogue floor, when the starter runs, then it refuses that package and falls back to the bundled HELIX with the reason. | `us-067-ac2` | Bundled HELIX; reason (given: Wrong digest; wrong version; no SKILL.md) | `@covers US-067-AC2` | Integration | `packages/create-app/test/helix-fetch.test.mjs` | Local HELIX release server serving a built test package | |
| US-067-AC3 | Given `GITHUB_TOKEN` in the environment, when the starter calls GitHub, then it sends it as a bearer token and never writes it anywhere; without it, no credential is sent; a release server that does not answer within 20 seconds counts as unreachable. | `us-067-ac3` | Bearer sent, not written; the default limit is 20 000 ms (`TIMEOUT`); a timeout falls back (given: GITHUB_TOKEN set; slow server) | `@covers US-067-AC3` | Integration | `packages/create-app/test/helix-fetch.test.mjs` | Local HELIX release server serving a built test package | |
| US-067-AC4 | Given a package entry with an absolute path, `..`, a link or a device file, when it is extracted, then nothing from the package is installed and the starter falls back; nothing downloaded is ever executed. | `us-067-ac4` | Refused; fallback (given: entry ../x; an absolute path; a symbolic link; a hard link; a device) | `@covers US-067-AC4` | Integration | `packages/create-app/test/helix-fetch.test.mjs` | Local HELIX release server serving a built test package | |
| US-067-AC5 | Given a created app, when `.claude/skills/helix/HELIX-VERSION.json` and `.helix.yml` are read, then they record the version, tag, source URL, digest, time and whether the bundled copy was used, and the flow's advisory `version`. | `us-067-ac5` | Fields present (given: Created app) | `@covers US-067-AC5` | Integration | `packages/create-app/test/helix-fetch.test.mjs` | Local HELIX release server serving a built test package | |
| US-067-AC6 | Given `HTTPS_PROXY` or `HTTP_PROXY` (in upper or lower case) in the environment, when the starter calls GitHub, then the API call and the download go through that proxy, unless `NO_PROXY` names the host. | `us-067-ac6` | A local HTTP and CONNECT proxy sees both requests; with `NO_PROXY` naming the host it sees none | `@covers US-067-AC6` | Integration | `packages/create-app/test/helix-fetch.test.mjs` | Local HELIX release server serving a built test package | Local proxy server |

## Executable Proof

```bash
npm test --workspace @ux-builder/create-app
```

## Build Handoff

**Done When**
- [ ] Every row's test exists, fails first, then passes
- [ ] The story's entries are removed from `tools/coverage-exceptions.json`

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network
