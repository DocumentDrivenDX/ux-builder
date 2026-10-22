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

## Amendment *[2026-10-22 — the first run hung]*

The first run under this decision got a runner whose Ubuntu package mirror
(`azure.archive.ubuntu.com`) served 44.8 kB/s: 10 minutes for Chromium's
system packages and 19 minutes in the ffmpeg `apt-get` before it was
cancelled. The re-run was as slow.
GitHub then left the run "in progress" while refusing to cancel or re-run it.
Nothing was pushed or published. So that a stuck runner can neither hold a
release for GitHub's 6-hour default nor block the next run:
- the job has a 120-minute limit, the Chromium install 30 and the ffmpeg
  install 40 (the re-run spent 12 and 27 minutes on them and published).
  Those bound a hang without failing a run that is only slow;
- the workflow can be run by hand (`workflow_dispatch`, main only), so a
  release restarts without a push;
- the concurrency group is `release-main`, because the hung run held `release`.


## Amendment *[2026-10-22 — two merges in one release]*

PR #46 merged while the release for #47 ran. The release rebased its
Version Packages commit onto #46 and pushed it, which brought #46's changeset
in unversioned. `changesets/action` then tried to open a Version Packages pull
request, which the repository refuses, and published nothing. #46's own
release run had checked out a commit from before the bump. So that two merges
close together release once and correctly:
- a run checks out the tip of `main`, not the commit that started it. Runs
  queue one at a time, so a queued run releases everything merged before it
  starts;
- if `main` moves during a run, the run pushes and publishes nothing. The run
  the newer push started, queued behind it, versions and publishes both.
