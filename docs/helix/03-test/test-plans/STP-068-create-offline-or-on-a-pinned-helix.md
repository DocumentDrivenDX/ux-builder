---
ddx:
  id: STP-068
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-068
    - kind: informed_by
      to: ADR-027
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-068-create-offline-or-on-a-pinned-helix

## Story Reference

**User Story**: [[US-068-create-offline-or-on-a-pinned-helix]] (Create an app offline or on a pinned HELIX)
**Technical Design**: N/A (ADR-027 at this size)
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-068's criteria without touching GitHub: tests serve a release and a plugin package built from a fixture over local HTTP (`UX_BUILDER_HELIX_API`).
**Blocking Gate**: `npm test --workspace @ux-builder/create-app`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-068-AC1 | Given no network, when the starter runs, then the app is created with the bundled HELIX, and the output and `HELIX-VERSION.json` say which version and why. | `us-068-ac1` | Bundled; reason recorded (given: Release server down). A second test checks the FEAT-010 size NFR: the packed bundle is under 1.5 MB (skipped when `helix/` has not been bundled) | `@covers US-068-AC1` | Integration | `packages/create-app/test/helix-fetch.test.mjs` | Local HELIX release server serving a built test package | The size check runs after `npm pack` or `npm run bundle-helix` |
| US-068-AC2 | Given `--helix-offline`, when the starter runs, then it makes no network request and uses the bundled HELIX. | `us-068-ac2` | 0 requests (given: --helix-offline; server counting requests) | `@covers US-068-AC2` | Integration | `packages/create-app/test/helix-fetch.test.mjs` | Local HELIX release server serving a built test package | |
| US-068-AC3 | Given `--helix-version <tag>`, when that release can be fetched and verified, then it is installed; when it cannot, then the starter exits 1, names the reason and creates no directory. | `us-068-ac3` | Installed / exit 1, no dir (given: --helix-version v1 present / v2 missing) | `@covers US-068-AC3` | Integration | `packages/create-app/test/helix-fetch.test.mjs` | Local HELIX release server serving a built test package | |
| US-068-AC4 | Given `--no-helix`, when the starter runs, then it writes no marker, HELIX documents, skill or `ux-assessment.yml`, and the app is otherwise as before. It still gets `e2e/starter.spec.js` and `test:e2e`, with no `@covers` lines. | `us-068-ac4` | No marker, docs, skill or manifest; the e2e test and script are there, with no `@covers` (given: --no-helix) | `@covers US-068-AC4` | Integration | `packages/create-app/test/helix-fetch.test.mjs` | Local HELIX release server serving a built test package | |
| US-068-AC5 | Given the bundled HELIX is missing or fails its check when the starter needs it, when the starter runs, then the app is created without HELIX, as with `--no-helix`, and the output gives the reason and says no `HELIX-VERSION.json` was written. | `us-068-ac5` | Exit 0; no marker or skill; the reason and "no HELIX-VERSION.json" printed (given: server down, with the bundle missing and with it corrupt) | `@covers US-068-AC5` | Integration | `packages/create-app/test/helix-fetch.test.mjs` | Local HELIX release server serving a built test package | |
| US-068-AC6 | Given `--helix-offline` with `--helix-version`, when the starter runs, then it exits 1, says the two cannot be combined, and creates no directory. | `us-068-ac6` | Exit 1; message; no dir; no request (given: both options) | `@covers US-068-AC6` | Integration | `packages/create-app/test/helix-fetch.test.mjs` | Local HELIX release server serving a built test package | |

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
