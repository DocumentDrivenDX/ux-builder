# @ux-builder/design

## 0.2.0

### Minor Changes

- 4887401: Target users are evidence-backed records (FEAT-018 GDL-77): `docs/ux/users.md` holds a row per user (`U-<n>`) with its context, needs, the jobs it holds with an importance for each, and evidence, confidence and status, checked by `validate`. The brief's Target users comes from it; blueprint tasks name the users they serve (`tasks[].users`, in the blueprint schema); the test kit's screener asks about each user and its context, scenarios say who each task is for, and the observation sheet has a `user` column, which the evaluation report breaks its measures down by; `trace U-<n>` follows a user to its jobs, tasks and journeys; `status` counts target users.

### Patch Changes

- Updated dependencies [4887401]
  - @ux-builder/ui@0.11.1

## 0.1.1

### Patch Changes

- Updated dependencies [d808143]
- Updated dependencies [1c2759b]
- Updated dependencies [b621adc]
- Updated dependencies [041e1b1]
- Updated dependencies [73599b0]
- Updated dependencies [11e98a6]
- Updated dependencies [eb4111f]
- Updated dependencies [0e3e6e7]
- Updated dependencies [db0c69e]
- Updated dependencies [75582cf]
- Updated dependencies [b719e23]
- Updated dependencies [de6f614]
- Updated dependencies [0cda9d7]
- Updated dependencies [1e4ac6b]
  - @ux-builder/audit@0.5.0
  - @ux-builder/ui@0.11.0
  - @ux-builder/trace@0.2.0
