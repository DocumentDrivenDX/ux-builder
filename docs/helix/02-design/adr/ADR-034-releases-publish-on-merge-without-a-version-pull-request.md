---
ddx:
  id: ADR-034
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: FEAT-005
    - kind: informs
      to: US-072
---

# ADR-034: Releases publish on merge, without a Version Packages pull request

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-22 | **Accepted** 2026-10-22 (operator: publishing "should be part of the automated CI/deploy process in Github"; chose the hands-off option over allowing Actions to open pull requests) | Operator | FEAT-005, US-072 | High |

## Context

`release.yml` ran Changesets' two-step flow: on a push to `main` with pending
changesets it opened a "Version Packages" pull request, and merging that
published. The repository does not allow GitHub Actions to create pull
requests, so every run since 2026-10-21 failed at that step and nothing newer
than `@ux-builder/audit` 0.2.0 reached npm. The flow also needed a person to
merge a second pull request for each release, and that pull request ran no CI
(it was opened with the workflow's own token).

## Decision

On every push to `main`, one run of `release.yml`:

1. applies the pending changesets (`npm run version-packages`) and commits the
   bump locally as "Version Packages";
2. runs every gate (`npm run check`) on the versioned tree;
3. pushes the bump to `main` (rebasing once if `main` moved);
4. publishes each public package whose version is not on npm
   (`changeset publish`, with provenance through Trusted Publishing), tags it
   and creates its GitHub release.

Merging a pull request that carries a changeset is the release decision. A
failing gate stops the run before anything is pushed or published. A failed
publish leaves the bump on `main`, and the next run publishes what is missing.
The workflow's own token pushes the commit, so the push starts no workflow and
the release cannot trigger itself.

## Alternatives Considered

| Option | Evaluation |
|---|---|
| Allow Actions to create pull requests and keep the Version Packages PR | One more manual merge per release, a PR that runs no CI, and a repository security setting to relax. Rejected by the operator |
| Publish by hand (`npm login`, `changeset publish`) | Not automated, and needs a maintainer's npm passkey each time. Kept only as the documented fallback |

## Consequences

- Positive: a merged changeset reaches npm in one run, with every gate run on
  exactly what is published, and no repository setting to change.
- Negative: there is no separate review of the version numbers and changelog
  entries; they are reviewed as the changeset files in the pull request that
  adds them. `main` takes direct commits from the workflow, which works
  because `main` is not branch-protected; protecting it later would need the
  workflow allowed to push.
