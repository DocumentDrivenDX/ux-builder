# HELIX artifacts — ux-builder

Planning and design authority for the AI-UI SDK: the design system, brand
builder and app SDK that Synaptiq, its clients and anyone installing it from
npm build interfaces from. Governed by `.helix.yml` at the repo root.

| Activity | Contents |
|---|---|
| `00-discover/` | `product-vision.md`, `screen-pattern-inventory.md` (discovery note) |
| `01-frame/` | `prd.md`, `concerns.md`, `features/FEAT-001` … `FEAT-017`, `user-stories/US-001` … `US-113` (US-066 not used) |
| `02-design/adr/` | ADR-011 and ADR-012 (imported), ADR-013 onward |
| `02-design/contracts/` | CONTRACT-001 … CONTRACT-007 |
| `02-design/solution-designs/` | SD-001 (palette engine), SD-002 (theme builder), SD-003 (interaction rules and blueprint), SD-004 (UX assessment), SD-005 (AI and agent experience rules) |
| `03-test/` | `test-plan.md` (TP-001), `test-plans/STP-*` |
| `04-build/` | `implementation-plan.md` |
| `06-iterate/alignment-reviews/` | `AR-<date>-<scope>.md`, one per alignment pass |

## ADR numbering

ADR-011 and ADR-012 were decided in the original harness prototype and are
imported here unchanged in substance, keeping their numbers so that references
to them stay true. This repository's own decisions continue the sequence from ADR-013.
ADR-001 to ADR-010 are the prototype's and are not used here; where an
imported ADR names one, it is a reference to the prototype's decisions, which
are not part of this repository.

## Work items

Work items are DDx beads in `.ddx/beads.jsonl`, committed with the repository
(`ddx bead list`, `ddx bead ready`). Bead IDs take the prefix `ux-builder`
(`.ddx/config.yaml`). Beads are labelled `feat:FEAT-0nn` and `story:US-0nn`;
each one references its governing story and names its acceptance and
verification. HELIX documents stay the authority, and a bead points to them.
The store started 2026-10-21. Beads cited in older documents were in an
earlier store that this repository does not carry.

Open epics: FEAT-005 `ux-builder-31fd7955`, FEAT-013 `ux-builder-c4bdb16c` and FEAT-016 `ux-builder-57f13272`.
FEAT-014 (`ux-builder-a34a7ad1`), FEAT-015 (`ux-builder-64edad4a`) and FEAT-017 (`ux-builder-55c21e32`) were built and closed 2026-10-22. Future native modalities (iOS, Android, macOS, Windows) are beads labelled `future`.
FEAT-011 (`ux-builder-8234c40f`) and FEAT-012 (`ux-builder-b7859050`) were
built and closed 2026-10-21.
Other open items: counsel's review of the rule sources (`ux-builder-78483e2c`)
and the follow-ups from AR-2026-10-21. `ddx bead ready` lists what can start.
