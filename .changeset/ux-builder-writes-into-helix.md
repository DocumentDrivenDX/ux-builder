---
"@ux-builder/design": major
"@ux-builder/ui": minor
"@ux-builder/audit": minor
"@ux-builder/create-app": minor
"@ux-builder/trace": minor
"@ux-builder/mcp": patch
---

ux-builder writes into HELIX's documents and keeps none of its own (ADR-042; needs HELIX v0.20.0's UX types and sections).

`@ux-builder/design` (breaking): UX decisions are proposed as HELIX ADRs tagged area:ui (`decision add`, `decision status`), experiments are DDx beads (`experiment start|end`), experience principles go in principles.md (`principle add`), users, needs and tasks are rows of the PRD's User Segments and User Needs and a feature's Task Model (`segment add`, `need add`, `task add`), and research is a study's HELIX research plan (`evidence add|claim|excerpt --study`, `test-kit --study`, `transcript add --study`, `observe import --study`). Test-session material, evaluation reports and insight exports are run output in the gitignored `docs/ux-builder/runs/`; `insights` proposes Journey Funnels for the metrics dashboard; approving the coverage map proposes the solution design's Experience Traceability; the brief is compiled from HELIX and says where each section comes from. Every change to HELIX is a proposal the person applies. The baseline command and the users, jobs, ux-decision, research-evidence, test-kit, usability-evaluation-report, insights, experiment and baseline document types are gone; `migrate` proposes an app's old documents into HELIX. A person sees HELIX's IDs and names only.

`@ux-builder/ui`: `ux-builder-blueprint propose` fills HELIX's user-flow, wireframe and user-journey-map types and DESIGN.md's modalities, size classes and app frame; its draft types are gone. Blueprint tasks take their Task Model key and cite needs and users by name; journeys may be named without the `J-` prefix; a project rule names its principle by its words. The layout gains `runs`.

`@ux-builder/audit`: `reports.html` lists every run by path, copying nothing in; journeys may be named without `J-`.

`@ux-builder/create-app`: a created app gitignores `docs/ux-builder/assessments/` and `docs/ux-builder/runs/`, never overwrites an existing concerns.md, and names its starter journey `start`.

`@ux-builder/trace`: a decision event's `ux` may be a HELIX ADR (`ADR-<nnn>`); older `UXD-<n>` traces stay valid.

`@ux-builder/mcp`: `trace` describes study task keys and ADR IDs.
